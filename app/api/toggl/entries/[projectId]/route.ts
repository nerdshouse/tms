import { NextResponse } from "next/server";
import { adminDb, getSessionClient } from "@/lib/firebase/helpers";

interface TogglTimeEntry {
  id: number;
  description: string;
  duration: number;
  start: string;
  stop: string | null;
  project_id: number | null;
  tags: string[];
  billable: boolean;
}

/** GET /api/toggl/entries/[projectId] — fetch raw Toggl time entries for a mapped project */
export async function GET(
  _request: Request,
  { params }: { params: { projectId: string } }
) {
  const me = await getSessionClient();
  if (!me?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const settingsSnap = await adminDb.doc("settings/toggl").get();
  if (!settingsSnap.exists) return NextResponse.json({ error: "Toggl not configured" }, { status: 400 });
  const { api_token, workspace_id } = settingsSnap.data()!;
  if (!api_token || !workspace_id) return NextResponse.json({ error: "Toggl not configured" }, { status: 400 });

  const projectSnap = await adminDb.collection("projects").doc(params.projectId).get();
  if (!projectSnap.exists) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  const togglProjectId: number | null = projectSnap.data()!.toggl_project_id ?? null;
  if (!togglProjectId) return NextResponse.json({ error: "No Toggl project mapped" }, { status: 400 });

  const since = new Date(Date.now() - 89 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const until = new Date().toISOString().slice(0, 10);
  const auth  = Buffer.from(`${api_token}:api_token`).toString("base64");

  let allEntries: TogglTimeEntry[] = [];
  let page = 1;

  while (true) {
    const url = `https://api.track.toggl.com/api/v9/me/time_entries?start_date=${since}&end_date=${until}&meta=true&page=${page}`;
    const res = await fetch(url, {
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `Toggl API error: ${res.status} ${text}` }, { status: 502 });
    }
    const batch: TogglTimeEntry[] = await res.json();
    if (!Array.isArray(batch) || batch.length === 0) break;
    allEntries = allEntries.concat(batch);
    if (batch.length < 50) break;
    page++;
  }

  const togglProjectIdNum = Number(togglProjectId);
  const relevant = allEntries
    .filter((e) => Number(e.project_id) === togglProjectIdNum && e.duration > 0)
    .sort((a, b) => b.start.localeCompare(a.start));

  // Also return all unique project IDs seen for debug
  const allProjectIds = Array.from(new Set(allEntries.map((e) => e.project_id)));

  return NextResponse.json({
    entries: relevant,
    total_entries_fetched: allEntries.length,
    toggl_project_id: togglProjectIdNum,
    all_project_ids_seen: allProjectIds,
  });
}
