import { NextResponse } from "next/server";
import { adminDb, getSessionClient } from "@/lib/firebase/helpers";
import { sendStatusChangedEmail } from "@/lib/email";
import { notifyTicketAssigned } from "@/lib/email/notifications";
import { logEvent } from "@/lib/log";
import admin from "firebase-admin";
import type { Status } from "@/types";

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const me = await getSessionClient();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const snap = await adminDb.collection("tickets").doc(params.id).get();
  if (!snap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const ticketData = snap.data()!;

  // Clients can only delete their own tickets
  if (!me.is_admin && ticketData.client_id !== me.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const title = ticketData.title as string;

  // Delete ticket + all its updates in a batch
  const updatesSnap = await adminDb
    .collection("ticket_updates")
    .where("ticket_id", "==", params.id)
    .get();

  const batch = adminDb.batch();
  batch.delete(adminDb.collection("tickets").doc(params.id));
  updatesSnap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();

  logEvent({
    action_type: "ticket_deleted",
    detail:      `"${title}" deleted`,
    entity_id:   params.id,
    entity_type: "ticket",
    user_id:     me.id,
    user_name:   me.name,
  }).catch(console.error);

  return NextResponse.json({ ok: true });
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const me = await getSessionClient();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ticketRef  = adminDb.collection("tickets").doc(params.id);
  const ticketSnap = await ticketRef.get();
  if (!ticketSnap.exists) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

  const ticketData = ticketSnap.data()!;

  // Clients can only edit their own tickets
  if (!me.is_admin && ticketData.client_id !== me.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json() as {
    status?: Status;
    assignee_id?: string | null;
    due_date?: string | null;
    title?: string;
    description?: string;
    priority?: string;
    type?: string;
    module?: string;
    page_url?: string | null;
  };

  const update: Record<string, unknown> = {
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
  };

  // Admin-only fields
  if (me.is_admin) {
    if (body.status !== undefined) update.status = body.status;
    if (body.due_date !== undefined) update.due_date = body.due_date ?? null;

    if (body.assignee_id !== undefined) {
      let assigneeName: string | null = null;
      let assigneeInitials: string | null = null;
      let assigneeEmail: string | null = null;
      if (body.assignee_id) {
        const mSnap = await adminDb.collection("team_members").doc(body.assignee_id).get();
        if (mSnap.exists) {
          assigneeName     = mSnap.data()!.name;
          assigneeInitials = mSnap.data()!.avatar_initials;
          assigneeEmail    = mSnap.data()!.email ?? null;
        }
      }
      update.assignee_id       = body.assignee_id ?? null;
      update.assignee_name     = assigneeName;
      update.assignee_initials = assigneeInitials;

      const prevAssigneeId = ticketData.assignee_id ?? null;
      if (body.assignee_id && body.assignee_id !== prevAssigneeId && assigneeEmail) {
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
    }

    if (body.status !== undefined && body.status !== ticketData.status) {
      sendStatusChangedEmail({
        ticketId:    params.id,
        title:       ticketData.title,
        newStatus:   body.status,
        clientName:  ticketData.client_name ?? "",
        clientEmail: ticketData.client_email ?? "",
      }).catch(console.error);
      logEvent({
        action_type: "ticket_status_changed",
        detail:      `"${ticketData.title}" → ${body.status}`,
        entity_id:   params.id,
        entity_type: "ticket",
        user_id:     me.id,
        user_name:   me.name,
      }).catch(console.error);
    }
  }

  // Client-editable fields (admin can also edit these)
  if (body.title       !== undefined) update.title       = body.title.trim();
  if (body.description !== undefined) update.description = body.description.trim();
  if (body.priority    !== undefined) update.priority    = body.priority;
  if (body.type        !== undefined) update.type        = body.type;
  if (body.module      !== undefined) update.module      = body.module;
  if (body.page_url    !== undefined) update.page_url    = body.page_url?.trim() || null;
  if (!me.is_admin && body.due_date !== undefined) update.due_date = body.due_date ?? null;

  await ticketRef.update(update);

  if (me.is_admin && body.assignee_id !== undefined && body.assignee_id !== (ticketData.assignee_id ?? null)) {
    logEvent({
      action_type: "ticket_assigned",
      detail:      `"${ticketData.title}" assigned to ${update.assignee_name ?? "nobody"}`,
      entity_id:   params.id,
      entity_type: "ticket",
      user_id:     me.id,
      user_name:   me.name,
    }).catch(console.error);
  }

  return NextResponse.json({ ok: true, id: params.id });
}
