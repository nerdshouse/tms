import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminDb, getSessionClient } from "@/lib/firebase/helpers";
import { sendStatusChangedEmail } from "@/lib/email";
import admin from "firebase-admin";
import type { Status } from "@/types";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  // Demo mode
  const demoUser = cookies().get("demo_user")?.value;
  if (demoUser === "admin") {
    const body = await request.json();
    return NextResponse.json({ id: params.id, ...body });
  }

  const me = await getSessionClient();
  if (!me?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { status, assignee_id } = await request.json() as {
    status: Status;
    assignee_id?: string | null;
  };

  const ticketRef = adminDb.collection("tickets").doc(params.id);
  const ticketSnap = await ticketRef.get();
  if (!ticketSnap.exists) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

  const ticketData = ticketSnap.data()!;

  // Look up assignee name/initials for denormalization
  let assigneeName: string | null = null;
  let assigneeInitials: string | null = null;
  if (assignee_id) {
    const mSnap = await adminDb.collection("team_members").doc(assignee_id).get();
    if (mSnap.exists) {
      assigneeName     = mSnap.data()!.name;
      assigneeInitials = mSnap.data()!.avatar_initials;
    }
  }

  const update: Record<string, unknown> = {
    status,
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
  };
  if (assignee_id !== undefined) {
    update.assignee_id       = assignee_id ?? null;
    update.assignee_name     = assigneeName;
    update.assignee_initials = assigneeInitials;
  }

  await ticketRef.update(update);

  // Notify client of status change (non-blocking)
  sendStatusChangedEmail({
    ticketId:    params.id,
    title:       ticketData.title,
    newStatus:   status,
    clientName:  ticketData.client_name ?? "",
    clientEmail: ticketData.client_email ?? "",
  }).catch(console.error);

  const updated = { id: params.id, ...ticketData, ...update };
  return NextResponse.json(updated);
}
