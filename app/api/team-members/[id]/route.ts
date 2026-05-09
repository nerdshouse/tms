import { NextResponse } from "next/server";
import { adminDb, getSessionClient } from "@/lib/firebase/helpers";
import { logEvent } from "@/lib/log";

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const me = await getSessionClient();
  if (!me?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (me.team_role && me.team_role !== "Admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const snap = await adminDb.collection("team_members").doc(params.id).get();
  const memberName = snap.exists ? snap.data()!.name : params.id;

  await adminDb.collection("team_members").doc(params.id).delete();

  logEvent({
    action_type: "team_member_removed",
    detail:      `${memberName} removed from team`,
    entity_id:   params.id,
    entity_type: "team_member",
    user_id:     me.id,
    user_name:   me.name,
  }).catch(console.error);

  return NextResponse.json({ ok: true });
}
