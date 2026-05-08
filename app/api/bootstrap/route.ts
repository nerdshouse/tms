import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import admin from "firebase-admin";

/**
 * One-time admin bootstrap.
 * Hit GET /api/bootstrap?secret=<BOOTSTRAP_SECRET> to seed the first admin.
 * Idempotent — safe to call multiple times.
 * Disable after first use by removing BOOTSTRAP_SECRET from env vars.
 */
export async function GET(request: Request) {
  const secret = process.env.BOOTSTRAP_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Bootstrap not configured" }, { status: 403 });
  }

  const url    = new URL(request.url);
  const given  = url.searchParams.get("secret");
  if (given !== secret) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 403 });
  }

  const ADMIN_EMAIL = "axit@nerdshouse.com";
  const ADMIN_NAME  = "Axit Mehta";

  // Check if already seeded
  const existing = await adminDb
    .collection("team_members")
    .where("email", "==", ADMIN_EMAIL)
    .limit(1)
    .get();

  if (!existing.empty) {
    return NextResponse.json({ ok: true, message: "Already seeded", email: ADMIN_EMAIL });
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  await adminDb.collection("team_members").add({
    name:            ADMIN_NAME,
    email:           ADMIN_EMAIL,
    role:            "Admin",
    avatar_initials: "AM",
    status:          "active",
    created_at:      now,
  });

  return NextResponse.json({
    ok: true,
    message: `Seeded admin: ${ADMIN_EMAIL}. Now sign in with Google.`,
  });
}
