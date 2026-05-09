import { NextResponse } from "next/server";
import { adminDb, adminAuth, getSessionClient } from "@/lib/firebase/helpers";
import { logEvent } from "@/lib/log";
import admin from "firebase-admin";

export async function POST(request: Request) {
  const me = await getSessionClient();
  if (!me?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (me.team_role && me.team_role !== "Admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name, company, email: rawEmail, status } = await request.json();
  if (!name || !rawEmail) return NextResponse.json({ error: "Name and email required" }, { status: 400 });

  const email = rawEmail.trim().toLowerCase();

  // Create Firebase Auth user
  let uid: string;
  try {
    const userRecord = await adminAuth.createUser({ email, displayName: name, emailVerified: true });
    uid = userRecord.uid;
    // Set custom claim so this user is NOT an admin
    await adminAuth.setCustomUserClaims(uid, { is_admin: false });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create user";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  await adminDb.collection("clients").doc(uid).set({
    name,
    company:    company ?? "",
    email,
    is_admin:   false,
    status:     status ?? "active",
    created_at: now,
  });

  logEvent({
    action_type: "client_added",
    detail:      `${name} (${email}) added`,
    entity_id:   uid,
    entity_type: "client",
    user_id:     me.id,
    user_name:   me.name,
  }).catch(console.error);

  return NextResponse.json({ id: uid, name, company: company ?? "", email, is_admin: false, status: status ?? "active" });
}
