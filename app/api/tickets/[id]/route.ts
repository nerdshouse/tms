import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { sendStatusChangedEmail } from "@/lib/email";
import type { Status } from "@/types";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!client?.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { status } = await request.json() as { status: Status };

  const admin = createAdminClient();

  // Get ticket for email notification
  const { data: ticket } = await admin
    .from("tickets")
    .select("*, clients(name, email)")
    .eq("id", params.id)
    .single();

  if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

  const { data: updated, error } = await admin
    .from("tickets")
    .update({ status })
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notify client of status change (non-blocking)
  sendStatusChangedEmail({
    ticketId: ticket.id,
    title: ticket.title,
    newStatus: status,
    clientName: ticket.clients?.name ?? "",
    clientEmail: ticket.clients?.email ?? "",
  }).catch(console.error);

  return NextResponse.json(updated);
}
