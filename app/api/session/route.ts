import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import admin from "firebase-admin";

const SESSION_EXPIRES_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

/**
 * Emails listed in ADMIN_EMAILS env var (comma-separated) are always
 * granted admin access regardless of Firestore state. Use this to
 * bootstrap the first admin without needing a Firestore document.
 */
function isEnvAdmin(email: string): boolean {
  const raw = process.env.ADMIN_EMAILS ?? "";
  return raw.split(",").map((e) => e.trim().toLowerCase()).includes(email.toLowerCase());
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({})) as { idToken?: string };
    const { idToken } = body;
    if (!idToken) return NextResponse.json({ error: "idToken required" }, { status: 400 });

    // ── 1. Verify the Google ID token ─────────────────────────────────────────
    let decoded: admin.auth.DecodedIdToken;
    try {
      decoded = await adminAuth.verifyIdToken(idToken);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("verifyIdToken failed:", msg);
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { uid, email, name: googleName, picture } = decoded;
    if (!email) return NextResponse.json({ error: "No email associated with this account" }, { status: 400 });

    // ── 2. Check if this UID already has a clients doc (returning user) ────────
    const clientRef  = adminDb.collection("clients").doc(uid);
    const clientSnap = await clientRef.get();

    if (!clientSnap.exists) {
      // ── 3. First sign-in: determine access level ──────────────────────────
      const now = admin.firestore.FieldValue.serverTimestamp();

      if (isEnvAdmin(email)) {
        await clientRef.set({
          name:       googleName ?? email.split("@")[0],
          email,
          company:    "Nerdshouse Technologies LLP",
          is_admin:   true,
          status:     "active",
          avatar_url: picture ?? null,
          created_at: now,
        });
        await adminAuth.setCustomUserClaims(uid, { is_admin: true });

      } else {
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

        if (isTeamMember) {
          const tmDoc = teamSnap.docs[0];
          const tm    = tmDoc.data();
          await clientRef.set({
            name:           tm.name ?? googleName ?? email.split("@")[0],
            email,
            company:        "Nerdshouse Technologies LLP",
            is_admin:       true,
            team_role:      tm.role,
            team_member_id: tmDoc.id,
            status:         "active",
            avatar_url:     picture ?? null,
            created_at:     now,
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
          await contactDoc.ref.update({ status: "active" });
        }
      }
    } else {
      // ── 4. Backfill team_role / team_member_id for returning team members ──
      //    Docs created before these fields were added won't have them.
      const d = clientSnap.data()!;
      if (d.is_admin === true && !d.team_role && !isEnvAdmin(email)) {
        const tmSnap = await adminDb.collection("team_members").where("email", "==", email).limit(1).get();
        if (!tmSnap.empty) {
          const tmDoc = tmSnap.docs[0];
          await clientRef.update({ team_role: tmDoc.data().role, team_member_id: tmDoc.id });
        }
      }
    }

    // ── 5. Determine role for the role hint cookie ────────────────────────────
    const freshData = clientSnap.exists ? clientSnap.data() : (await clientRef.get()).data();
    const isAdmin   = freshData?.is_admin === true;

    // ── 6. Issue session cookie ───────────────────────────────────────────────
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
    response.cookies.set("user_role", isAdmin ? "admin" : "client", {
      httpOnly: false,
      secure:   process.env.NODE_ENV === "production",
      maxAge:   SESSION_EXPIRES_MS / 1000,
      path:     "/",
      sameSite: "lax",
    });
    return response;

  } catch (err) {
    console.error("POST /api/session unhandled error:", err);
    return NextResponse.json(
      { error: "Internal server error", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

/** DELETE /api/session — clear the session cookie (logout) */
export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set("__session", "", { maxAge: 0, path: "/" });
  response.cookies.set("user_role", "", { maxAge: 0, path: "/" });
  return response;
}
