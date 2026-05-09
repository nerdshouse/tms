import { notFound, redirect } from "next/navigation";
import ClientDetail from "@/components/admin/ClientDetail";
import {
  getSessionClient, adminDb,
  docToClient, docToProject, docToTicket, docToTeamMember,
} from "@/lib/firebase/helpers";
import type { Client, Project, Ticket, TeamMember } from "@/types";

export const dynamic = "force-dynamic";

export default async function AdminClientDetailPage({ params }: { params: { id: string } }) {
  const me = await getSessionClient();
  if (!me?.is_admin) redirect("/");

  const [clientSnap, projectsSnap, ticketsSnap, membersSnap] = await Promise.all([
    adminDb.collection("clients").doc(params.id).get(),
    adminDb.collection("projects").where("client_id", "==", params.id).orderBy("created_at").get(),
    adminDb.collection("tickets").where("client_id", "==", params.id).orderBy("updated_at", "desc").get(),
    adminDb.collection("team_members").orderBy("created_at").get(),
  ]);

  if (!clientSnap.exists) notFound();
  const client: Client = docToClient(clientSnap);
  const projects: Project[] = projectsSnap.docs.map(docToProject);
  const tickets: Ticket[] = ticketsSnap.docs.map(docToTicket);
  const teamMembers: TeamMember[] = membersSnap.docs.map(docToTeamMember);

  return (
    <ClientDetail
      client={client}
      projects={projects}
      tickets={tickets}
      teamMembers={teamMembers}
    />
  );
}
