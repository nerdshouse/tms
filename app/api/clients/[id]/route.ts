import { NextResponse } from "next/server";
import { adminDb, adminAuth, getSessionClient } from "@/lib/firebase/helpers";
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

  // profile fields + assigned_members: full admins only
  if (isFullAdmin) {
    if ("status"           in body) allowed.status           = body.status;
    if ("company"          in body) allowed.company          = body.company;
    if ("name"             in body) allowed.name             = body.name;
    if ("phone"            in body) allowed.phone            = (body.phone as string)?.trim() ?? "";
    if ("gst_number"       in body) allowed.gst_number       = (body.gst_number as string)?.trim().toUpperCase() ?? "";
    if ("assigned_members" in body) allowed.assigned_members = body.assigned_members ?? [];
  } else if (["status", "company", "name", "phone", "gst_number", "assigned_members"].some((k) => k in body)) {
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

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const me = await getSessionClient();
  if (!me?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (me.team_role && me.team_role !== "Admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const snap = await adminDb.collection("clients").doc(params.id).get();
  if (!snap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const clientName = snap.data()!.name as string;

  await adminDb.collection("clients").doc(params.id).delete();

  // Delete Firebase Auth user (best effort — may not exist)
  try { await adminAuth.deleteUser(params.id); } catch { /* ignore */ }

  logEvent({
    action_type: "client_deleted",
    detail:      `${clientName} deleted`,
    entity_id:   params.id,
    entity_type: "client",
    user_id:     me.id,
    user_name:   me.name,
  }).catch(console.error);

  return NextResponse.json({ ok: true });
}
