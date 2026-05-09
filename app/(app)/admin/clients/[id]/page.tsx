import { notFound, redirect } from "next/navigation";
import ClientDetail from "@/components/admin/ClientDetail";
import {
  getSessionClient, adminDb,
  docToClient, docToProject, docToTicket, docToTeamMember, docToContact,
} from "@/lib/firebase/helpers";
import { isFullAdmin } from "@/lib/permissions";
import type { Client, Project, Ticket, TeamMember, ClientContact } from "@/types";

export const dynamic = "force-dynamic";

export default async function AdminClientDetailPage({ params }: { params: { id: string } }) {
  const me = await getSessionClient();
  if (!me?.is_admin) redirect("/");

  const fullAdmin = isFullAdmin(me);

  // For developer roles, check if they have any ticket assigned for this client
  if (!fullAdmin) {
    const assignedSnap = await adminDb
      .collection("tickets")
      .where("client_id", "==", params.id)
      .where("assignee_id", "==", me.team_member_id ?? "")
      .limit(1)
      .get();
    if (assignedSnap.empty) {
      redirect("/admin/clients?denied=1");
    }
  }

  const [clientSnap, projectsSnap, allTicketsSnap, devTicketsSnap, membersSnap, contactsSnap] = await Promise.all([
    adminDb.collection("clients").doc(params.id).get(),
    adminDb.collection("projects").where("client_id", "==", params.id).get(),
    // Full admins see all tickets; developer role query runs separately
    fullAdmin
      ? adminDb.collection("tickets").where("client_id", "==", params.id).get()
      : Promise.resolve(null),
    !fullAdmin
      ? adminDb.collection("tickets")
          .where("client_id", "==", params.id)
          .where("assignee_id", "==", me.team_member_id ?? "")
          .get()
      : Promise.resolve(null),
    adminDb.collection("team_members").get(),
    adminDb.collection("clients").doc(params.id).collection("contacts").get(),
  ]);

  if (!clientSnap.exists) notFound();

  const client: Client          = docToClient(clientSnap);
  const projects: Project[]     = projectsSnap.docs.map(docToProject)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  const ticketSource            = fullAdmin ? allTicketsSnap! : devTicketsSnap!;
  const tickets: Ticket[]       = ticketSource.docs.map(docToTicket)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  const teamMembers: TeamMember[] = membersSnap.docs.map(docToTeamMember)
    .sort((a, b) => a.name.localeCompare(b.name));
  const contacts: ClientContact[] = contactsSnap.docs.map(docToContact)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  return (
    <ClientDetail
      client={client}
      projects={projects}
      tickets={tickets}
      teamMembers={teamMembers}
      contacts={contacts}
      isFullAdmin={fullAdmin}
    />
  );
}
