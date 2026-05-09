import { NextResponse } from "next/server";
import { adminDb, getSessionClient, docToContact, effectiveClientId } from "@/lib/firebase/helpers";
import { sendContactInviteEmail } from "@/lib/email";
import admin from "firebase-admin";

/** GET /api/me/contacts — list contacts for the current client */
export async function GET() {
  const me = await getSessionClient();
  if (!me || me.is_admin || me.is_contact) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const snap = await adminDb
    .collection("clients")
    .doc(me.id)
    .collection("contacts")
    .orderBy("created_at", "desc")
    .get();

  return NextResponse.json(snap.docs.map(docToContact));
}

/** POST /api/me/contacts — invite a contact */
export async function POST(request: Request) {
  const me = await getSessionClient();
  if (!me || me.is_admin || me.is_contact) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name, email } = await request.json() as { name?: string; email?: string };
  if (!name || !email) return NextResponse.json({ error: "Name and email required" }, { status: 400 });

  const existing = await adminDb
    .collection("clients")
    .doc(me.id)
    .collection("contacts")
    .where("email", "==", email)
    .limit(1)
    .get();

  if (!existing.empty) {
    return NextResponse.json({ error: "This email is already invited" }, { status: 409 });
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  const ref = await adminDb
    .collection("clients")
    .doc(effectiveClientId(me))
    .collection("contacts")
    .add({ name, email, status: "pending", created_at: now });

  sendContactInviteEmail({ name, email, company: me.company }).catch(console.error);

  return NextResponse.json({
    id: ref.id, name, email, status: "pending",
    created_at: new Date().toISOString(),
  });
}
