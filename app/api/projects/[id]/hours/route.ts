import { NextResponse } from "next/server";
import { adminDb, getSessionClient, docToHourEntry } from "@/lib/firebase/helpers";
import admin from "firebase-admin";

/** GET /api/projects/[id]/hours — list hour entries (admin/team only) */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const me = await getSessionClient();
  if (!me?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const snap = await adminDb
    .collection("projects").doc(params.id)
    .collection("hours")
    .orderBy("date", "desc")
    .get();

  return NextResponse.json(snap.docs.map(docToHourEntry));
}

/** POST /api/projects/[id]/hours — add an hour entry (admin/team only) */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const me = await getSessionClient();
  if (!me?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { description, hours, date } = await request.json() as {
    description?: string;
    hours?: number;
    date?: string;
  };

  if (!hours || hours <= 0) return NextResponse.json({ error: "Hours must be > 0" }, { status: 400 });
  if (!date) return NextResponse.json({ error: "Date is required" }, { status: 400 });

  const now = admin.firestore.FieldValue.serverTimestamp();
  const projectRef = adminDb.collection("projects").doc(params.id);

  const ref = await projectRef.collection("hours").add({
    project_id:    params.id,
    description:   description?.trim() ?? "",
    hours:         Number(hours),
    date,
    added_by_name: me.name,
    created_at:    now,
  });

  // Increment total_hours on the project doc
  await projectRef.update({
    total_hours: admin.firestore.FieldValue.increment(Number(hours)),
  });

  return NextResponse.json({
    id:            ref.id,
    project_id:    params.id,
    description:   description?.trim() ?? "",
    hours:         Number(hours),
    date,
    added_by_name: me.name,
    created_at:    new Date().toISOString(),
  });
}
