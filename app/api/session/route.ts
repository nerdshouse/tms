import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import admin from "firebase-admin";

const SESSION_EXPIRES_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

/**
 * POST /api/session
 *
 * Exchange a fresh Google ID token for an httpOnly session cookie.
 *
 * Access control on first sign-in:
 *   1. Email found in `team_members` → admin access (creates/updates clients/{uid} with is_admin:true)
 *   2. Email found in `clients`       → client access (migrates old doc to clients/{uid} if needed)
 *   3. Neither                        → 403 access denied
 *
 * Subsequent sign-ins just verify the session cookie (handled by middleware).
 */
export async function POST(request: Request) {
  const { idToken } = await request.json() as { idToken?: string };
  if (!idToken) return NextResponse.json({ error: "idToken required" }, { status: 400 });

  let decoded: admin.auth.DecodedIdToken;
  try {
    decoded = await adminAuth.verifyIdToken(idToken);
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const { uid, email, name: googleName, picture } = decoded;
  if (!email) return NextResponse.json({ error: "No email associated with this account" }, { status: 400 });

  // ── 1. Check if this UID already has a clients doc (returning user) ────────
  const clientRef  = adminDb.collection("clients").doc(uid);
  const clientSnap = await clientRef.get();

  if (!clientSnap.exists) {
    // ── 2. First sign-in: determine access level ────────────────────────────
    const [teamSnap, existingClientSnap] = await Promise.all([
      adminDb.collection("team_members").where("email", "==", email).limit(1).get(),
      adminDb.collection("clients").where("email", "==", email).limit(1).get(),
    ]);

    const isTeamMember = !teamSnap.empty;
    const isClient     = !existingClientSnap.empty;

    if (!isTeamMember && !isClient) {
      return NextResponse.json(
        { error: "access_denied", message: "No account found for this email. Contact Nerdshouse to get access." },
        { status: 403 }
      );
    }

    const now = admin.firestore.FieldValue.serverTimestamp();

    if (isTeamMember) {
      // Admin: create clients/{uid} from team_members data
      const tm = teamSnap.docs[0].data();
      await clientRef.set({
        name:       tm.name ?? googleName ?? email.split("@")[0],
        email,
        company:    "Nerdshouse Technologies LLP",
        is_admin:   true,
        status:     "active",
        avatar_url: picture ?? null,
        created_at: now,
      });
      await adminAuth.setCustomUserClaims(uid, { is_admin: true });
    } else {
      // Client: migrate existing doc (created by adminAuth.createUser earlier) to new UID
      const existingData = existingClientSnap.docs[0].data();
      const oldDocId     = existingClientSnap.docs[0].id;

      await clientRef.set({
        ...existingData,
        avatar_url: picture ?? existingData.avatar_url ?? null,
        created_at: existingData.created_at ?? now,
      });

      // Remove old doc if it was keyed by a different UID
      if (oldDocId !== uid) {
        await adminDb.collection("clients").doc(oldDocId).delete();
      }

      await adminAuth.setCustomUserClaims(uid, { is_admin: false });
    }
  }

  // ── 3. Issue session cookie ───────────────────────────────────────────────
  try {
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: SESSION_EXPIRES_MS,
    });

    const response = NextResponse.json({ ok: true });
    response.cookies.set("__session", sessionCookie, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      maxAge:   SESSION_EXPIRES_MS / 1000,
      path:     "/",
      sameSite: "lax",
    });
    return response;
  } catch (err) {
    console.error("createSessionCookie:", err);
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}

/** DELETE /api/session — clear the session cookie (logout) */
export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set("__session", "", { maxAge: 0, path: "/" });
  return response;
}
