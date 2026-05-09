import { NextResponse } from "next/server";
import { adminDb, getSessionClient } from "@/lib/firebase/helpers";
import { sendTicketCreatedEmail } from "@/lib/email";
import { logEvent } from "@/lib/log";
import admin from "firebase-admin";

export async function POST(request: Request) {
  const client = await getSessionClient();
  if (!client) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const title          = formData.get("title") as string;
  const priority       = formData.get("priority") as string;
  const ticketType     = formData.get("type") as string;
  const ticketModule   = formData.get("module") as string;
  const description    = formData.get("description") as string;
  const projectId      = formData.get("project_id") as string | null;
  const attachmentsRaw = formData.get("attachments") as string | null;
  const attachments    = attachmentsRaw ? JSON.parse(attachmentsRaw) : [];
  const pageUrl        = (formData.get("page_url") as string | null)?.trim() || null;

  if (!title || !description) {
    return NextResponse.json({ error: "Title and description are required" }, { status: 400 });
  }

  // Look up project name/color for denormalization
  let projectName: string | null = null;
  let projectColor: string | null = null;
  if (projectId) {
    const pSnap = await adminDb.collection("projects").doc(projectId).get();
    if (pSnap.exists) {
      projectName  = pSnap.data()!.name;
      projectColor = pSnap.data()!.color;
    }
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  const ref = await adminDb.collection("tickets").add({
    title,
    description,
    priority,
    type: ticketType,
    module: ticketModule,
    status: "open",
    client_id:        client.id,
    client_name:      client.name,
    client_email:     client.email,
    client_company:   client.company,
    project_id:       projectId || null,
    project_name:     projectName,
    project_color:    projectColor,
    assignee_id:      null,
    assignee_name:    null,
    assignee_initials: null,
    attachments:      attachments,
    page_url:         pageUrl,
    created_at: now,
    updated_at: now,
  });

  sendTicketCreatedEmail({
    ticketId:    ref.id,
    title,
    clientName:  client.name,
    clientEmail: client.email,
    priority,
    type:        ticketType,
    module:      ticketModule,
  }).catch(console.error);

  logEvent({
    action_type: "ticket_created",
    detail:      `"${title}" created by ${client.name}`,
    entity_id:   ref.id,
    entity_type: "ticket",
    user_id:     client.id,
    user_name:   client.name,
  }).catch(console.error);

  return NextResponse.json({ id: ref.id });
}
