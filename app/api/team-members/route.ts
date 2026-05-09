import { NextResponse } from "next/server";
import { adminDb, getSessionClient } from "@/lib/firebase/helpers";
import { sendTeamInviteEmail } from "@/lib/email";
import admin from "firebase-admin";

export async function POST(request: Request) {
  const me = await getSessionClient();
  if (!me?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name, email: rawEmail, role } = await request.json();
  if (!name || !rawEmail || !role) {
    return NextResponse.json({ error: "Name, email and role required" }, { status: 400 });
  }

  const email   = rawEmail.trim().toLowerCase();
  const initials = name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
  const now = admin.firestore.FieldValue.serverTimestamp();
  const ref = await adminDb.collection("team_members").add({
    name, email, role, avatar_initials: initials, status: "active", created_at: now,
  });

  sendTeamInviteEmail({ name, email, role }).catch(console.error);

  return NextResponse.json({
    id: ref.id, name, email, role, avatar_initials: initials, status: "active",
    open_ticket_count: 0, created_at: new Date().toISOString(),
  });
}
