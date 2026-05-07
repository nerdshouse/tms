import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import TicketDetail from "@/components/TicketDetail";
import type { Ticket, TicketUpdate, Client } from "@/types";

export const dynamic = "force-dynamic";

export default async function TicketPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: currentClient } = await supabase
    .from("clients")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!currentClient) redirect("/login");

  const { data: ticket } = await supabase
    .from("tickets")
    .select("*, clients(name, company, email)")
    .eq("id", params.id)
    .single();

  if (!ticket) notFound();

  const { data: updates } = await supabase
    .from("ticket_updates")
    .select("*")
    .eq("ticket_id", params.id)
    .order("created_at", { ascending: true });

  return (
    <TicketDetail
      ticket={ticket as Ticket}
      updates={(updates ?? []) as TicketUpdate[]}
      currentClient={currentClient as Client}
    />
  );
}
