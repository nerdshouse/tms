import { NextResponse } from "next/server";
import { adminDb, getSessionClient } from "@/lib/firebase/helpers";

const SETTINGS_DOC = "settings/toggl";

/** GET /api/toggl/settings — returns saved Toggl credentials */
export async function GET() {
  const me = await getSessionClient();
  if (!me?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const snap = await adminDb.doc(SETTINGS_DOC).get();
  if (!snap.exists) return NextResponse.json({ api_token: "", workspace_id: "" });

  const d = snap.data()!;
  return NextResponse.json({ api_token: d.api_token ?? "", workspace_id: d.workspace_id ?? "" });
}

/** POST /api/toggl/settings — save Toggl credentials */
export async function POST(request: Request) {
  const me = await getSessionClient();
  if (!me?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { api_token, workspace_id } = await request.json() as {
    api_token?: string;
    workspace_id?: string;
  };

  if (!api_token?.trim()) return NextResponse.json({ error: "API token is required" }, { status: 400 });
  if (!workspace_id) return NextResponse.json({ error: "Workspace ID is required" }, { status: 400 });

  await adminDb.doc(SETTINGS_DOC).set({
    api_token: api_token.trim(),
    workspace_id: String(workspace_id).trim(),
    updated_at: new Date().toISOString(),
    updated_by: me.name,
  });

  return NextResponse.json({ ok: true });
}
