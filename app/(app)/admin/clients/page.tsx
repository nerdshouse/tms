import { redirect } from "next/navigation";
import ClientsGrid from "@/components/admin/ClientsGrid";
import { getSessionClient, adminDb, docToClient, docToProject } from "@/lib/firebase/helpers";
import { isFullAdmin } from "@/lib/permissions";
import type { Client, Project } from "@/types";

export const dynamic = "force-dynamic";

export default async function AdminClientsPage() {
  const me = await getSessionClient();
  if (!me?.is_admin) redirect("/");

  const fullAdmin = isFullAdmin(me);

  const [clientsSnap, projectsSnap, ticketsSnap] = await Promise.all([
    adminDb.collection("clients").where("is_admin", "==", false).orderBy("created_at").get(),
    adminDb.collection("projects").orderBy("created_at").get(),
    fullAdmin
      ? adminDb.collection("tickets").select("client_id").get()
      : adminDb.collection("tickets").where("assignee_id", "==", me.team_member_id ?? "").select("client_id").get(),
  ]);

  const ticketCounts: Record<string, number> = {};
  ticketsSnap.docs.forEach((d) => {
    const cid = d.data().client_id as string;
    if (cid) ticketCounts[cid] = (ticketCounts[cid] ?? 0) + 1;
  });

  const clients: Client[] = clientsSnap.docs.map(docToClient);
  const projects: Project[] = projectsSnap.docs.map(docToProject);

  // For developer roles: set of client IDs that have tickets assigned to them
  const assignedClientIds: Set<string> | undefined = fullAdmin
    ? undefined
    : new Set(Object.keys(ticketCounts));

  return (
    <ClientsGrid
      clients={clients}
      projects={projects}
      ticketCounts={ticketCounts}
      canAddClient={fullAdmin}
      assignedClientIds={assignedClientIds}
    />
  );
}
