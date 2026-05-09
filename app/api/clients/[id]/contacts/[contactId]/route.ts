import { NextResponse } from "next/server";
import { adminDb, getSessionClient } from "@/lib/firebase/helpers";
import { logEvent } from "@/lib/log";

/** DELETE /api/clients/[id]/contacts/[contactId] — remove a contact (admin only) */
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string; contactId: string } }
) {
  const me = await getSessionClient();
  if (!me?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const contactRef = adminDb
    .collection("clients")
    .doc(params.id)
    .collection("contacts")
    .doc(params.contactId);

  // Read first so we can find the linked clients/{uid} doc (if they signed in)
  const contactSnap = await contactRef.get();
  const email = contactSnap.exists ? contactSnap.data()!.email : null;

  const contactName = contactSnap.exists ? contactSnap.data()!.name : "unknown";
  await contactRef.delete();

  logEvent({
    action_type: "contact_removed",
    detail:      `${contactName} removed from client`,
    entity_id:   params.id,
    entity_type: "client",
    user_id:     me.id,
    user_name:   me.name,
  }).catch(console.error);

  // If the contact signed in, their clients/{uid} doc has parent_client_id set.
  // Clean it up so they lose portal access.
  if (email) {
    const linked = await adminDb
      .collection("clients")
      .where("email", "==", email)
      .where("parent_client_id", "==", params.id)
      .limit(1)
      .get();
    for (const doc of linked.docs) {
      await doc.ref.delete();
    }
  }

  return NextResponse.json({ ok: true });
}
