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

  // Admin creating on behalf of a client
  let clientId      = client.id;
  let clientName    = client.name;
  let clientEmail   = client.email;
  let clientCompany = client.company;

  const forClientId = formData.get("for_client_id") as string | null;
  if (client.is_admin && forClientId) {
    const cSnap = await adminDb.collection("clients").doc(forClientId).get();
    if (cSnap.exists) {
      const cd    = cSnap.data()!;
      clientId      = forClientId;
      clientName    = cd.name;
      clientEmail   = cd.email;
      clientCompany = cd.company ?? "";
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
    client_id:        clientId,
    client_name:      clientName,
    client_email:     clientEmail,
    client_company:   clientCompany,
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
    clientName:  clientName,
    clientEmail: clientEmail,
    priority,
    type:        ticketType,
    module:      ticketModule,
  }).catch(console.error);

  logEvent({
    action_type: "ticket_created",
    detail:      `"${title}" created by ${clientName}`,
    entity_id:   ref.id,
    entity_type: "ticket",
    user_id:     clientId,
    user_name:   clientName,
  }).catch(console.error);

  return NextResponse.json({ id: ref.id });
}
