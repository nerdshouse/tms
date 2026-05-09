import { notFound, redirect } from "next/navigation";
import TicketDetail from "@/components/TicketDetail";
import { getSessionClient, adminDb, docToTicket, docToUpdate, docToTeamMember } from "@/lib/firebase/helpers";
import type { Ticket, TicketUpdate, Client, TeamMember } from "@/types";

export const dynamic = "force-dynamic";

export default async function TicketPage({ params }: { params: { id: string } }) {
  const client = await getSessionClient();
  if (!client) redirect("/login");
  const currentClient: Client = client;

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
  const ticket: Ticket = docToTicket(ticketSnap);
  const updates: TicketUpdate[] = updatesSnap.docs.map(docToUpdate);
  const teamMembers: TeamMember[] = membersSnap ? membersSnap.docs.map(docToTeamMember) : [];

  return (
    <TicketDetail
      ticket={ticket}
      updates={updates}
      currentClient={currentClient}
      teamMembers={teamMembers}
    />
  );
}
