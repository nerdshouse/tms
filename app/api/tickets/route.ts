import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { sendTicketCreatedEmail } from "@/lib/email";

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const formData = await request.formData();
  const title = formData.get("title") as string;
  const priority = formData.get("priority") as string;
  const ticketType = formData.get("type") as string;
  const ticketModule = formData.get("module") as string;
  const description = formData.get("description") as string;
  const projectId = formData.get("project_id") as string | null;

  if (!title || !description) {
    return NextResponse.json({ error: "Title and description are required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: ticket, error } = await admin
    .from("tickets")
    .insert({
      title,
      priority,
      type: ticketType,
      module: ticketModule,
      description,
      client_id: user.id,
      project_id: projectId || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Send email notification (non-blocking)
  sendTicketCreatedEmail({
    ticketId: ticket.id,
    title: ticket.title,
    clientName: client.name,
    clientEmail: client.email,
    priority: ticket.priority,
    type: ticket.type as string,
    module: ticket.module as string,
  }).catch(console.error);

  return NextResponse.json({ id: ticket.id });
}
