import { NextResponse } from "next/server";
import { adminDb, getSessionClient } from "@/lib/firebase/helpers";
import { notifyNewComment, notifyClientReply } from "@/lib/email/notifications";
import { logEvent } from "@/lib/log";
import admin from "firebase-admin";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const client = await getSessionClient();
  if (!client) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { message } = await request.json();
  if (!message?.trim()) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  const authorType = client.is_admin ? "team" : "client";

  // Fetch ticket data before writing (needed for email notification)
  const ticketSnap = await adminDb.collection("tickets").doc(params.id).get();
  const ticketData = ticketSnap.exists ? ticketSnap.data()! : null;

  const now = admin.firestore.FieldValue.serverTimestamp();
  const ref = await adminDb.collection("ticket_updates").add({
    ticket_id:   params.id,
    message:     message.trim(),
    author_type: authorType,
    author_name: client.name,
    created_at:  now,
  });

  // Also bump the ticket's updated_at
  await adminDb.collection("tickets").doc(params.id).update({
    updated_at: now,
  });

  logEvent({
    action_type: "comment_posted",
    detail:      `${client.name} commented on "${ticketData?.title ?? params.id}"`,
    entity_id:   params.id,
    entity_type: "ticket",
    user_id:     client.id,
    user_name:   client.name,
  }).catch(console.error);

  // Notify client when team posts a comment (non-blocking)
  if (authorType === "team" && ticketData?.client_email) {
    notifyNewComment({
      ticketId:    params.id,
      title:       ticketData.title ?? "",
      clientName:  ticketData.client_name ?? "",
      clientEmail: ticketData.client_email,
      authorName:  client.name,
      message:     message.trim(),
    }).catch(console.error);
  }

  // Notify assignee when client posts a comment (non-blocking)
  if (authorType === "client" && ticketData?.assignee_id) {
    adminDb.collection("team_members").doc(ticketData.assignee_id).get().then((mSnap) => {
      if (!mSnap.exists) return;
      const assigneeEmail = mSnap.data()!.email as string | undefined;
      const assigneeName  = mSnap.data()!.name as string;
      if (!assigneeEmail) return;
      notifyClientReply({
        ticketId:      params.id,
        title:         ticketData.title ?? "",
        assigneeName,
        assigneeEmail,
        clientName:    ticketData.client_name ?? "",
        message:       message.trim(),
      });
    }).catch(console.error);
  }

  return NextResponse.json({
    id:          ref.id,
    ticket_id:   params.id,
    message:     message.trim(),
    author_type: authorType,
    author_name: client.name,
    created_at:  new Date().toISOString(),
  });
}
