import { NextResponse } from "next/server";
import { adminDb, getSessionClient } from "@/lib/firebase/helpers";
import { sendStatusChangedEmail } from "@/lib/email";
import { notifyTicketAssigned } from "@/lib/email/notifications";
import { logEvent } from "@/lib/log";
import admin from "firebase-admin";
import type { Status } from "@/types";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const me = await getSessionClient();
  if (!me?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { status, assignee_id, due_date } = await request.json() as {
    status: Status;
    assignee_id?: string | null;
    due_date?: string | null;
  };

  const ticketRef = adminDb.collection("tickets").doc(params.id);
  const ticketSnap = await ticketRef.get();
  if (!ticketSnap.exists) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

  const ticketData = ticketSnap.data()!;

  // Look up assignee name/initials for denormalization
  let assigneeName: string | null = null;
  let assigneeInitials: string | null = null;
  let assigneeEmail: string | null = null;
  if (assignee_id) {
    const mSnap = await adminDb.collection("team_members").doc(assignee_id).get();
    if (mSnap.exists) {
      assigneeName     = mSnap.data()!.name;
      assigneeInitials = mSnap.data()!.avatar_initials;
      assigneeEmail    = mSnap.data()!.email ?? null;
    }
  }

  const prevAssigneeId = ticketData.assignee_id ?? null;

  const update: Record<string, unknown> = {
    status,
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
  };
  if (assignee_id !== undefined) {
    update.assignee_id       = assignee_id ?? null;
    update.assignee_name     = assigneeName;
    update.assignee_initials = assigneeInitials;
  }
  if (due_date !== undefined) {
    update.due_date = due_date ?? null;
  }

  await ticketRef.update(update);

  // Notify assignee if they were just assigned (non-blocking)
  if (assignee_id && assignee_id !== prevAssigneeId && assigneeEmail) {
    notifyTicketAssigned({
      ticketId:      params.id,
      title:         ticketData.title,
      assigneeName:  assigneeName ?? "",
      assigneeEmail: assigneeEmail,
      clientName:    ticketData.client_name ?? "",
      priority:      ticketData.priority ?? "",
      type:          ticketData.type ?? "",
    }).catch(console.error);
  }

  // Notify client of status change (non-blocking)
  sendStatusChangedEmail({
    ticketId:    params.id,
    title:       ticketData.title,
    newStatus:   status,
    clientName:  ticketData.client_name ?? "",
    clientEmail: ticketData.client_email ?? "",
  }).catch(console.error);

  // Audit logs (non-blocking)
  if (status !== ticketData.status) {
    logEvent({
      action_type: "ticket_status_changed",
      detail:      `"${ticketData.title}" → ${status}`,
      entity_id:   params.id,
      entity_type: "ticket",
      user_id:     me.id,
      user_name:   me.name,
    }).catch(console.error);
  }
  if (assignee_id !== undefined && assignee_id !== prevAssigneeId) {
    logEvent({
      action_type: "ticket_assigned",
      detail:      `"${ticketData.title}" assigned to ${assigneeName ?? "nobody"}`,
      entity_id:   params.id,
      entity_type: "ticket",
      user_id:     me.id,
      user_name:   me.name,
    }).catch(console.error);
  }

  const updated = { id: params.id, ...ticketData, ...update };
  return NextResponse.json(updated);
}
