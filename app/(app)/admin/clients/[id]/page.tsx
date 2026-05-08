import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import ClientDetail from "@/components/admin/ClientDetail";
import { DEMO_CLIENTS, DEMO_PROJECTS, DEMO_TICKETS, DEMO_TEAM_MEMBERS } from "@/lib/demo-data";
import {
  getSessionClient, adminDb,
  docToClient, docToProject, docToTicket, docToTeamMember,
} from "@/lib/firebase/helpers";
import type { Client, Project, Ticket, TeamMember } from "@/types";

export const dynamic = "force-dynamic";

export default async function AdminClientDetailPage({ params }: { params: { id: string } }) {
  const cookieStore = cookies();
  const demoUser = cookieStore.get("demo_user")?.value;

  let client: Client;
  let projects: Project[];
  let tickets: Ticket[];
  let teamMembers: TeamMember[];

  if (demoUser === "admin") {
    const found = DEMO_CLIENTS.find((c) => c.id === params.id);
    if (!found) notFound();
    client      = found;
    projects    = DEMO_PROJECTS.filter((p) => p.client_id === params.id);
    tickets     = DEMO_TICKETS.filter((t) => t.client_id === params.id);
    teamMembers = DEMO_TEAM_MEMBERS;
  } else {
    const me = await getSessionClient();
    if (!me?.is_admin) redirect("/");

    const [clientSnap, projectsSnap, ticketsSnap, membersSnap] = await Promise.all([
      adminDb.collection("clients").doc(params.id).get(),
      adminDb.collection("projects").where("client_id", "==", params.id).orderBy("created_at").get(),
      adminDb.collection("tickets").where("client_id", "==", params.id).orderBy("updated_at", "desc").get(),
      adminDb.collection("team_members").orderBy("created_at").get(),
    ]);

    if (!clientSnap.exists) notFound();
    client      = docToClient(clientSnap);
    projects    = projectsSnap.docs.map(docToProject);
    tickets     = ticketsSnap.docs.map(docToTicket);
    teamMembers = membersSnap.docs.map(docToTeamMember);
  }

  return (
    <ClientDetail
      client={client}
      projects={projects}
      tickets={tickets}
      teamMembers={teamMembers}
    />
  );
}
