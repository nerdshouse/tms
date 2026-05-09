import { NextResponse } from "next/server";
import { adminDb, getSessionClient } from "@/lib/firebase/helpers";
import { logEvent } from "@/lib/log";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const me = await getSessionClient();
  if (!me?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json() as Record<string, unknown>;
  const allowed: Record<string, unknown> = {};

  // Only allow patching specific safe fields
  if ("poc_id"  in body) allowed.poc_id  = body.poc_id  ?? null;
  if ("status"  in body) allowed.status  = body.status;
  if ("company" in body) allowed.company = body.company;
  if ("name"    in body) allowed.name    = body.name;

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
