import { NextResponse } from "next/server";
import { adminDb, getSessionClient } from "@/lib/firebase/helpers";
import admin from "firebase-admin";

/** PATCH /api/projects/[id]/hours/[hourId] — edit an hour entry */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string; hourId: string } }
) {
  const me = await getSessionClient();
  if (!me?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { description, hours, date } = await request.json() as {
    description?: string;
    hours?: number;
    date?: string;
  };

  const entryRef   = adminDb.collection("projects").doc(params.id).collection("hours").doc(params.hourId);
  const entrySnap  = await entryRef.get();
  if (!entrySnap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const oldHours = entrySnap.data()!.hours as number;
  const newHours = hours !== undefined ? Number(hours) : oldHours;

  await entryRef.update({
    ...(description !== undefined && { description: description.trim() }),
    ...(hours !== undefined       && { hours: newHours }),
    ...(date !== undefined        && { date }),
  });

  // Adjust total_hours by the delta
  const delta = newHours - oldHours;
  if (delta !== 0) {
    await adminDb.collection("projects").doc(params.id).update({
      total_hours: admin.firestore.FieldValue.increment(delta),
    });
  }

  return NextResponse.json({ ok: true });
}

/** DELETE /api/projects/[id]/hours/[hourId] — delete an hour entry */
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string; hourId: string } }
) {
  const me = await getSessionClient();
  if (!me?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const entryRef  = adminDb.collection("projects").doc(params.id).collection("hours").doc(params.hourId);
  const entrySnap = await entryRef.get();
  if (!entrySnap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const hours = entrySnap.data()!.hours as number;
  await entryRef.delete();

  // Decrement total_hours — floor at 0
  await adminDb.collection("projects").doc(params.id).update({
    total_hours: admin.firestore.FieldValue.increment(-hours),
  });

  return NextResponse.json({ ok: true });
}
