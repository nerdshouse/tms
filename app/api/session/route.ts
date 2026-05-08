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
 *   1. Email found in `team_members`       → admin access
 *   2. Email found in `clients`            → client access (migrates old doc to UID if needed)
 *   3. Email found in any contacts sub-col → contact access (sub-user of a client)
 *   4. None of the above                   → 403 access denied
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
    const [teamSnap, existingClientSnap, contactsSnap] = await Promise.all([
      adminDb.collection("team_members").where("email", "==", email).limit(1).get(),
      adminDb.collection("clients").where("email", "==", email).limit(1).get(),
      adminDb.collectionGroup("contacts").where("email", "==", email).limit(1).get(),
    ]);

    const isTeamMember     = !teamSnap.empty;
    const isExistingClient = !existingClientSnap.empty;
    const isContact        = !contactsSnap.empty;

    if (!isTeamMember && !isExistingClient && !isContact) {
      return NextResponse.json(
        {
          error:   "access_denied",
          message: "Access not granted. Contact Nerdshouse at hello@nerdshouse.com",
        },
        { status: 403 }
      );
    }

    const now = admin.firestore.FieldValue.serverTimestamp();

    if (isTeamMember) {
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

    } else if (isExistingClient) {
      const existingData = existingClientSnap.docs[0].data();
      const oldDocId     = existingClientSnap.docs[0].id;

      await clientRef.set({
        ...existingData,
        avatar_url: picture ?? existingData.avatar_url ?? null,
        created_at: existingData.created_at ?? now,
      });

      if (oldDocId !== uid) {
        await adminDb.collection("clients").doc(oldDocId).delete();
      }
      await adminAuth.setCustomUserClaims(uid, { is_admin: false });

    } else {
      // Contact: create client doc linked to parent
      const contactDoc       = contactsSnap.docs[0];
      const parentClientId   = contactDoc.ref.parent.parent!.id;
      const parentClientSnap = await adminDb.collection("clients").doc(parentClientId).get();
      const parentData       = parentClientSnap.exists ? parentClientSnap.data()! : {};

      await clientRef.set({
        name:             googleName ?? email.split("@")[0],
        email,
        company:          parentData.company ?? "",
        is_admin:         false,
        is_contact:       true,
        parent_client_id: parentClientId,
        status:           "active",
        avatar_url:       picture ?? null,
        created_at:       now,
      });
      await adminAuth.setCustomUserClaims(uid, { is_admin: false });
      // Mark contact as active
      await contactDoc.ref.update({ status: "active" });
    }
  }

  // ── 3. Determine role for the role hint cookie ────────────────────────────
  const freshData = clientSnap.exists ? clientSnap.data() : (await clientRef.get()).data();
  const isAdmin   = freshData?.is_admin === true;

  // ── 4. Issue session cookie ───────────────────────────────────────────────
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
    // Non-secret role hint for middleware fast redirects (not a security boundary)
    response.cookies.set("user_role", isAdmin ? "admin" : "client", {
      httpOnly: false,
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
  response.cookies.set("user_role", "", { maxAge: 0, path: "/" });
  return response;
}
