import { NextResponse } from "next/server";
import { adminDb, getSessionClient } from "@/lib/firebase/helpers";

/** GET /api/toggl/projects — list projects from Toggl for the configured workspace */
export async function GET() {
  const me = await getSessionClient();
  if (!me?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const snap = await adminDb.doc("settings/toggl").get();
  if (!snap.exists) return NextResponse.json({ error: "Toggl not configured" }, { status: 400 });

  const { api_token, workspace_id } = snap.data()!;
  if (!api_token || !workspace_id) return NextResponse.json({ error: "Toggl not configured" }, { status: 400 });

  const auth = Buffer.from(`${api_token}:api_token`).toString("base64");
  const res = await fetch(
    `https://api.track.toggl.com/api/v9/workspaces/${workspace_id}/projects?active=true&per_page=200`,
    { headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" } }
  );

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: `Toggl API error: ${res.status} ${text}` }, { status: 502 });
  }

  const projects = await res.json();
  return NextResponse.json(projects);
}
