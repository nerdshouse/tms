import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import TicketDetail from "@/components/TicketDetail";
import { DEMO_TICKETS, DEMO_UPDATES, DEMO_ADMIN, DEMO_CLIENT, DEMO_TEAM_MEMBERS } from "@/lib/demo-data";
import { getSessionClient, adminDb, docToTicket, docToUpdate, docToTeamMember } from "@/lib/firebase/helpers";
import type { Ticket, TicketUpdate, Client, TeamMember } from "@/types";

export const dynamic = "force-dynamic";

export default async function TicketPage({ params }: { params: { id: string } }) {
  const cookieStore = cookies();
  const demoUser = cookieStore.get("demo_user")?.value;

  let ticket: Ticket;
  let updates: TicketUpdate[];
  let currentClient: Client;
  let teamMembers: TeamMember[] = [];

  if (demoUser === "admin" || demoUser === "client") {
    currentClient = demoUser === "admin" ? DEMO_ADMIN : DEMO_CLIENT;
    const found = DEMO_TICKETS.find((t) => t.id === params.id);
    if (!found) notFound();
    ticket = found as Ticket;
    updates = DEMO_UPDATES[params.id] ?? [];
    if (demoUser === "admin") teamMembers = DEMO_TEAM_MEMBERS;
  } else {
    const client = await getSessionClient();
    if (!client) redirect("/login");
    currentClient = client;

    const [ticketSnap, updatesSnap, membersSnap] = await Promise.all([
      adminDb.collection("tickets").doc(params.id).get(),
      adminDb
        .collection("ticket_updates")
        .where("ticket_id", "==", params.id)
        .orderBy("created_at", "asc")
        .get(),
      client.is_admin
        ? adminDb.collection("team_members").where("status", "==", "active").get()
        : Promise.resolve(null),
    ]);

    if (!ticketSnap.exists) notFound();
    ticket = docToTicket(ticketSnap);
    updates = updatesSnap.docs.map(docToUpdate);
    teamMembers = membersSnap ? membersSnap.docs.map(docToTeamMember) : [];
  }

  return (
    <TicketDetail
      ticket={ticket}
      updates={updates}
      currentClient={currentClient}
      teamMembers={teamMembers}
    />
  );
}
