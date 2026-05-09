import { NextResponse } from "next/server";
import { adminDb, getSessionClient } from "@/lib/firebase/helpers";
import admin from "firebase-admin";

interface TogglTimeEntry {
  id: number;
  description: string;
  duration: number; // seconds; negative = running
  start: string;    // ISO date
  project_id: number | null;
  workspace_id: number;
}

/** POST /api/toggl/sync/[projectId] — sync Toggl time entries for a portal project */
export async function POST(
  _request: Request,
  { params }: { params: { projectId: string } }
) {
  const me = await getSessionClient();
  if (!me?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Load Toggl settings
  const settingsSnap = await adminDb.doc("settings/toggl").get();
  if (!settingsSnap.exists) return NextResponse.json({ error: "Toggl not configured" }, { status: 400 });
  const { api_token, workspace_id } = settingsSnap.data()!;
  if (!api_token || !workspace_id) return NextResponse.json({ error: "Toggl not configured" }, { status: 400 });

  // Load portal project to get the mapped Toggl project ID
  const projectSnap = await adminDb.collection("projects").doc(params.projectId).get();
  if (!projectSnap.exists) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const togglProjectId: number | null = projectSnap.data()!.toggl_project_id ?? null;
  if (!togglProjectId) return NextResponse.json({ error: "No Toggl project mapped to this project" }, { status: 400 });

  // Fetch time entries from Toggl (last 90 days)
  const since   = new Date(Date.now() - 89 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const until   = new Date().toISOString().slice(0, 10);
  const auth    = Buffer.from(`${api_token}:api_token`).toString("base64");

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

  // Filter to entries for the mapped project and only completed ones (duration > 0)
  const relevant = allEntries.filter(
    (e) => e.project_id === togglProjectId && e.duration > 0
  );

  if (relevant.length === 0) {
    return NextResponse.json({ synced: 0, skipped: 0 });
  }

  // Load existing entries to check for duplicates
  const hoursRef = adminDb.collection("projects").doc(params.projectId).collection("hours");
  const existingSnap = await hoursRef.where("toggl_entry_id", "!=", null).get();
  const existingTogglIds = new Set(existingSnap.docs.map((d) => d.data().toggl_entry_id as number));

  const projectRef = adminDb.collection("projects").doc(params.projectId);
  let synced = 0;
  let skipped = 0;

  for (const entry of relevant) {
    if (existingTogglIds.has(entry.id)) {
      skipped++;
      continue;
    }

    const hours = parseFloat((entry.duration / 3600).toFixed(2));
    const date  = entry.start.slice(0, 10);

    await hoursRef.add({
      project_id:      params.projectId,
      description:     entry.description || "",
      hours,
      date,
      added_by_name:   "Toggl Sync",
      toggl_entry_id:  entry.id,
      created_at:      admin.firestore.FieldValue.serverTimestamp(),
    });

    await projectRef.update({
      total_hours: admin.firestore.FieldValue.increment(hours),
    });

    synced++;
  }

  // Update last sync timestamp
  await adminDb.doc("settings/toggl").update({
    last_synced_at: new Date().toISOString(),
  });

  return NextResponse.json({ synced, skipped });
}
