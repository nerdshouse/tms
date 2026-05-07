import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import TicketDetail from "@/components/TicketDetail";
import { DEMO_TICKETS, DEMO_UPDATES, DEMO_ADMIN, DEMO_CLIENT } from "@/lib/demo-data";
import type { Ticket, TicketUpdate, Client } from "@/types";

export const dynamic = "force-dynamic";

export default async function TicketPage({ params }: { params: { id: string } }) {
  const cookieStore = cookies();
  const demoUser = cookieStore.get("demo_user")?.value;

  let ticket: Ticket;
  let updates: TicketUpdate[];
  let currentClient: Client;

  if (demoUser === "admin" || demoUser === "client") {
    currentClient = demoUser === "admin" ? DEMO_ADMIN : DEMO_CLIENT;
    const found = DEMO_TICKETS.find((t) => t.id === params.id);
    if (!found) notFound();
    ticket = found as Ticket;
    updates = DEMO_UPDATES[params.id] ?? [];
  } else {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data: client } = await supabase
      .from("clients")
      .select("*")
      .eq("id", user.id)
      .single();
    if (!client) redirect("/login");
    currentClient = client as Client;

    const { data: ticketData } = await supabase
      .from("tickets")
      .select("*, clients(name, company, email)")
      .eq("id", params.id)
      .single();
    if (!ticketData) notFound();
    ticket = ticketData as Ticket;

    const { data: updatesData } = await supabase
      .from("ticket_updates")
      .select("*")
      .eq("ticket_id", params.id)
      .order("created_at", { ascending: true });
    updates = (updatesData ?? []) as TicketUpdate[];
  }

  return (
    <TicketDetail
      ticket={ticket}
      updates={updates}
      currentClient={currentClient}
    />
  );
}
