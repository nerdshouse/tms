import { NextResponse } from "next/server";
import { adminDb, getSessionClient } from "@/lib/firebase/helpers";
import { logEvent } from "@/lib/log";
import type { TeamRole } from "@/types";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const me = await getSessionClient();
  if (!me?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (me.team_role && me.team_role !== "Admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json() as Record<string, unknown>;
  const allowed: Record<string, unknown> = {};

  if ("name"   in body) {
    allowed.name            = body.name;
    allowed.avatar_initials = (body.name as string)
      .split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
  }
  if ("email"  in body) allowed.email  = (body.email as string).trim().toLowerCase();
  if ("role"   in body) allowed.role   = body.role as TeamRole;
  if ("status" in body) allowed.status = body.status;

  if (Object.keys(allowed).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  await adminDb.collection("team_members").doc(params.id).update(allowed);

  logEvent({
    action_type: "team_member_updated",
    detail:      `Team member ${params.id} updated`,
    entity_id:   params.id,
    entity_type: "team_member",
    user_id:     me.id,
    user_name:   me.name,
  }).catch(console.error);

  return NextResponse.json({ ok: true, ...allowed });
}

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
