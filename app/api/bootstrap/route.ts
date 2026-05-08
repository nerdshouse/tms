import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import admin from "firebase-admin";

export const dynamic = "force-dynamic";

/**
 * One-time admin bootstrap.
 *
 * - If team_members collection is EMPTY: runs freely (true first-run).
 * - If team_members already has docs: requires ?secret=BOOTSTRAP_SECRET.
 *
 * Safe to call multiple times — idempotent.
 */
export async function GET(request: Request) {
  const ADMIN_EMAIL = "axit@nerdshouse.com";
  const ADMIN_NAME  = "Axit Mehta";

  // Check if already seeded
  const existing = await adminDb
    .collection("team_members")
    .where("email", "==", ADMIN_EMAIL)
    .limit(1)
    .get();

  if (!existing.empty) {
    return NextResponse.json({ ok: true, message: "Already seeded. Sign in with Google at /login." });
  }

  // Check if any team members exist at all
  const anyMember = await adminDb.collection("team_members").limit(1).get();
  const isFirstRun = anyMember.empty;

  if (!isFirstRun) {
    // Existing team — require secret
    const secret = process.env.BOOTSTRAP_SECRET;
    const given  = new URL(request.url).searchParams.get("secret");
    if (!secret || given !== secret) {
      return NextResponse.json({ error: "Requires ?secret=BOOTSTRAP_SECRET" }, { status: 403 });
    }
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
    message: `Done! ${ADMIN_EMAIL} is now an admin. Sign in at /login with Google.`,
  });
}
