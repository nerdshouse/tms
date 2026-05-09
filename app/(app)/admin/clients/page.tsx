import { redirect } from "next/navigation";
import ClientsGrid from "@/components/admin/ClientsGrid";
import { getSessionClient, adminDb, docToClient, docToProject } from "@/lib/firebase/helpers";
import type { Client, Project } from "@/types";

export const dynamic = "force-dynamic";

export default async function AdminClientsPage() {
  const me = await getSessionClient();
  if (!me?.is_admin) redirect("/");

  const isFullAdmin = !me.team_role || me.team_role === "Admin";

  const [clientsSnap, projectsSnap, ticketsSnap] = await Promise.all([
    adminDb.collection("clients").where("is_admin", "==", false).orderBy("created_at").get(),
    adminDb.collection("projects").orderBy("created_at").get(),
    // For restricted members: fetch tickets assigned to them to find their client IDs
    isFullAdmin
      ? adminDb.collection("tickets").select("client_id").get()
      : adminDb.collection("tickets").where("assignee_id", "==", me.team_member_id ?? "").select("client_id", "assignee_id").get(),
  ]);

  const ticketCounts: Record<string, number> = {};
  ticketsSnap.docs.forEach((d) => {
    const cid = d.data().client_id as string;
    if (cid) ticketCounts[cid] = (ticketCounts[cid] ?? 0) + 1;
  });

  let clients: Client[] = clientsSnap.docs.map(docToClient);
  const projects: Project[] = projectsSnap.docs.map(docToProject);

  if (!isFullAdmin) {
    // Only show clients that have at least one ticket assigned to this team member
    const assignedClientIds = new Set(Object.keys(ticketCounts));
    clients = clients.filter((c) => assignedClientIds.has(c.id));
  }

  return <ClientsGrid clients={clients} projects={projects} ticketCounts={ticketCounts} canAddClient={isFullAdmin} />;
}
