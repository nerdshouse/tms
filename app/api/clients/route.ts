import { NextResponse } from "next/server";
import { adminDb, adminAuth, getSessionClient } from "@/lib/firebase/helpers";
import admin from "firebase-admin";

export async function POST(request: Request) {
  const me = await getSessionClient();
  if (!me?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name, company, email, status } = await request.json();
  if (!name || !email) return NextResponse.json({ error: "Name and email required" }, { status: 400 });

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

  return NextResponse.json({ id: uid, name, company: company ?? "", email, is_admin: false, status: status ?? "active" });
}
