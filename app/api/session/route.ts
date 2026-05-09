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
      console.error("[session] verifyIdToken failed:", msg);
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { uid, email, name: googleName, picture } = decoded;
    if (!email) return NextResponse.json({ error: "No email associated with this account" }, { status: 400 });

    const emailLower = email.toLowerCase();
    console.log(`[session] Sign-in attempt uid=${uid} email=${email}`);

    // ── 2. Check if this UID already has a clients doc (returning user) ────────
    const clientRef  = adminDb.collection("clients").doc(uid);
    const clientSnap = await clientRef.get();

    if (!clientSnap.exists) {
      console.log(`[session] First sign-in for uid=${uid}`);
      // ── 3. First sign-in: determine access level ──────────────────────────
      const now = admin.firestore.FieldValue.serverTimestamp();

      if (isEnvAdmin(email)) {
        console.log(`[session] Granting env-admin access to ${email}`);
        await clientRef.set({
          name:       googleName ?? email.split("@")[0],
          email:      emailLower,
          company:    "Nerdshouse Technologies LLP",
          is_admin:   true,
          status:     "active",
          avatar_url: picture ?? null,
          created_at: now,
        });
        await adminAuth.setCustomUserClaims(uid, { is_admin: true });

      } else {
        // email from Google ID token is always lowercase; stored emails may
        // have been entered with mixed case — query both to be safe.
        console.log(`[session] Querying access for email="${email}" / lower="${emailLower}"`);
        const [teamSnap, teamSnapAlt, existingClientSnap, contactsSnap] = await Promise.all([
          adminDb.collection("team_members").where("email", "==", email).limit(1).get(),
          adminDb.collection("team_members").where("email", "==", emailLower).limit(1).get(),
          adminDb.collection("clients").where("email", "==", emailLower).limit(1).get(),
          adminDb.collectionGroup("contacts").where("email", "==", emailLower).limit(1).get(),
        ]);

        // Merge: prefer exact match but accept lowercase match too
        const resolvedTeamSnap = !teamSnap.empty ? teamSnap : teamSnapAlt;
        const isTeamMember     = !resolvedTeamSnap.empty;
        const isExistingClient = !existingClientSnap.empty;
        const isContact        = !contactsSnap.empty;

        console.log(`[session] Lookup results: isTeamMember=${isTeamMember} isExistingClient=${isExistingClient} isContact=${isContact}`);

        if (!isTeamMember && !isExistingClient && !isContact) {
          console.warn(`[session] Access denied for email=${email}`);
          return NextResponse.json(
            {
              error:   "access_denied",
              message: "Access not granted. Contact Nerdshouse at hello@nerdshouse.com",
            },
            { status: 403 }
          );
        }

        if (isTeamMember) {
          const tmDoc = resolvedTeamSnap.docs[0];
          const tm    = tmDoc.data();
          console.log(`[session] Team member match: id=${tmDoc.id} role=${tm.role} email=${tm.email}`);

          // Write client doc with ALL required fields
          await clientRef.set({
            name:           (tm.name as string) ?? googleName ?? email.split("@")[0],
            email:          emailLower,
            company:        "Nerdshouse Technologies LLP",
            is_admin:       true,
            team_role:      tm.role,
            team_member_id: tmDoc.id,
            status:         "active",
            avatar_url:     picture ?? null,
            created_at:     now,
          });
          await adminAuth.setCustomUserClaims(uid, { is_admin: true });
          console.log(`[session] Team member doc created for uid=${uid} team_role=${tm.role}`);

        } else if (isExistingClient) {
          const existingData = existingClientSnap.docs[0].data();
          const oldDocId     = existingClientSnap.docs[0].id;
          console.log(`[session] Existing client match: oldDocId=${oldDocId}`);

          await clientRef.set({
            ...existingData,
            email:      emailLower,
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
          console.log(`[session] Contact match: parentClientId=${parentClientId}`);

          await clientRef.set({
            name:             googleName ?? email.split("@")[0],
            email:            emailLower,
            company:          (parentData.company as string) ?? "",
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
      console.log(`[session] Returning user uid=${uid} is_admin=${d.is_admin} team_role=${d.team_role ?? "none"}`);

      if (d.is_admin === true && !d.team_role && !isEnvAdmin(email)) {
        console.log(`[session] Backfilling team_role for uid=${uid}`);
        const [tmSnap1, tmSnap2] = await Promise.all([
          adminDb.collection("team_members").where("email", "==", email).limit(1).get(),
          adminDb.collection("team_members").where("email", "==", emailLower).limit(1).get(),
        ]);
        const tmSnap = !tmSnap1.empty ? tmSnap1 : tmSnap2;
        if (!tmSnap.empty) {
          const tmDoc = tmSnap.docs[0];
          await clientRef.update({ team_role: tmDoc.data().role, team_member_id: tmDoc.id });
          console.log(`[session] Backfilled team_role=${tmDoc.data().role} team_member_id=${tmDoc.id}`);
        } else {
          console.warn(`[session] Could not find team_member doc for backfill, email=${email}`);
        }
      }
    }

    // ── 5. Determine role for the role hint cookie ────────────────────────────
    // Always re-read to get the freshest data (covers both first sign-in and returning users)
    const freshSnap = await clientRef.get();
    const freshData = freshSnap.data();
    const isAdmin   = freshData?.is_admin === true;
    console.log(`[session] Resolved isAdmin=${isAdmin} for uid=${uid}`);

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
    console.log(`[session] Session created for uid=${uid} role=${isAdmin ? "admin" : "client"}`);
    return response;

  } catch (err) {
    console.error("[session] POST unhandled error:", err);
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
