import { NextResponse } from "next/server";
import { adminDb, getSessionClient } from "@/lib/firebase/helpers";
import { logEvent } from "@/lib/log";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const me = await getSessionClient();
  if (!me?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json() as { toggl_project_id?: number | null };
  const update: Record<string, unknown> = {};
  if ("toggl_project_id" in body) update.toggl_project_id = body.toggl_project_id ?? null;

  if (Object.keys(update).length > 0) {
    await adminDb.collection("projects").doc(params.id).update(update);
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const me = await getSessionClient();
  if (!me?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Read name before deleting for the log entry
  const snap = await adminDb.collection("projects").doc(params.id).get();
  const projectName = snap.exists ? snap.data()!.name : params.id;

  await adminDb.collection("projects").doc(params.id).delete();

  logEvent({
    action_type: "project_removed",
    detail:      `Project "${projectName}" removed`,
    entity_id:   params.id,
    entity_type: "project",
    user_id:     me.id,
    user_name:   me.name,
  }).catch(console.error);

  return NextResponse.json({ ok: true });
}
