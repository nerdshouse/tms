import { NextResponse } from "next/server";
import { adminDb, getSessionClient } from "@/lib/firebase/helpers";
import { logEvent } from "@/lib/log";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const me = await getSessionClient();
  if (!me?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const isFullAdmin = !me.team_role || me.team_role === "Admin";
  const body = await request.json() as Record<string, unknown>;
  const allowed: Record<string, unknown> = {};

  // poc_id: all admins can update
  if ("poc_id" in body) allowed.poc_id = body.poc_id ?? null;

  // profile fields: full admins only
  if (isFullAdmin) {
    if ("status"  in body) allowed.status  = body.status;
    if ("company" in body) allowed.company = body.company;
    if ("name"    in body) allowed.name    = body.name;
  } else if (["status", "company", "name"].some((k) => k in body)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (Object.keys(allowed).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  await adminDb.collection("clients").doc(params.id).update(allowed);

  if ("poc_id" in body) {
    logEvent({
      action_type: "poc_assigned",
      detail:      body.poc_id ? `POC assigned` : `POC removed`,
      entity_id:   params.id,
      entity_type: "client",
      user_id:     me.id,
      user_name:   me.name,
    }).catch(console.error);
  }

  return NextResponse.json({ ok: true });
}
