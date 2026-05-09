import { NextResponse } from "next/server";
import { adminDb, getSessionClient, docToContact } from "@/lib/firebase/helpers";
import { sendContactInviteEmail } from "@/lib/email";
import { logEvent } from "@/lib/log";
import admin from "firebase-admin";

/** GET /api/clients/[id]/contacts — list contacts for a client (admin only) */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const me = await getSessionClient();
  if (!me?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const snap = await adminDb
    .collection("clients")
    .doc(params.id)
    .collection("contacts")
    .orderBy("created_at", "desc")
    .get();

  return NextResponse.json(snap.docs.map(docToContact));
}

/** POST /api/clients/[id]/contacts — add a contact to a client (admin only) */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const me = await getSessionClient();
  if (!me?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name, email } = await request.json() as { name?: string; email?: string };
  if (!name?.trim() || !email?.trim()) {
    return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Check the target client exists
  const clientSnap = await adminDb.collection("clients").doc(params.id).get();
  if (!clientSnap.exists) return NextResponse.json({ error: "Client not found" }, { status: 404 });
  const clientData = clientSnap.data()!;

  // Prevent duplicates
  const existing = await adminDb
    .collection("clients")
    .doc(params.id)
    .collection("contacts")
    .where("email", "==", normalizedEmail)
    .limit(1)
    .get();

  if (!existing.empty) {
    return NextResponse.json({ error: "This email is already invited" }, { status: 409 });
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  const ref = await adminDb
    .collection("clients")
    .doc(params.id)
    .collection("contacts")
    .add({ name: name.trim(), email: normalizedEmail, status: "pending", created_at: now });

  // If this person already has a clients/{uid} doc (previously signed in),
  // mark it as a contact so it is hidden from the admin clients grid.
  const existingSnap = await adminDb
    .collection("clients")
    .where("email", "==", normalizedEmail)
    .where("is_admin", "==", false)
    .limit(1)
    .get();
  if (!existingSnap.empty) {
    await existingSnap.docs[0].ref.update({
      is_contact:       true,
      parent_client_id: params.id,
    });
  }

  sendContactInviteEmail({
    name:    name.trim(),
    email:   normalizedEmail,
    company: clientData.company ?? clientData.name,
  }).catch(console.error);

  logEvent({
    action_type: "contact_added",
    detail:      `${name.trim()} (${normalizedEmail}) added to ${clientData.name}`,
    entity_id:   params.id,
    entity_type: "client",
    user_id:     me.id,
    user_name:   me.name,
  }).catch(console.error);

  return NextResponse.json({
    id:         ref.id,
    name:       name.trim(),
    email:      normalizedEmail,
    status:     "pending",
    created_at: new Date().toISOString(),
  });
}
