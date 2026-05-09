import { redirect, notFound } from "next/navigation";
import IssueTable from "@/components/IssueTable";
import {
  getSessionClient, adminDb, docToTicket, docToProject, effectiveClientId,
} from "@/lib/firebase/helpers";
export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const client = await getSessionClient();
  if (!client) redirect("/login");

  const [projectSnap, ticketsSnap] = await Promise.all([
    adminDb.collection("projects").doc(params.id).get(),
    // No orderBy — sort in memory to avoid composite index requirement
    adminDb.collection("tickets").where("project_id", "==", params.id).get(),
  ]);

  if (!projectSnap.exists) notFound();
  const project = docToProject(projectSnap);

  // Non-admin clients may only view their own projects
  if (!client.is_admin && project.client_id !== effectiveClientId(client)) {
    redirect("/projects");
  }

  // Sort descending by updated_at in memory
  const tickets = ticketsSnap.docs
    .map(docToTicket)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));

  return (
    <IssueTable
      tickets={tickets}
      isAdmin={client.is_admin}
      initialStatus="all"
      initialSearch=""
      project={project}
      clientId={effectiveClientId(client)}
    />
  );
}
