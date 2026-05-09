import { redirect, notFound } from "next/navigation";
import IssueTable from "@/components/IssueTable";
import {
  getSessionClient, adminDb, docToTicket, docToProject, effectiveClientId,
} from "@/lib/firebase/helpers";
import type { Ticket } from "@/types";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const client = await getSessionClient();
  if (!client) redirect("/login");

  const [projectSnap, ticketsSnap] = await Promise.all([
    adminDb.collection("projects").doc(params.id).get(),
    adminDb
      .collection("tickets")
      .where("project_id", "==", params.id)
      .orderBy("updated_at", "desc")
      .get(),
  ]);

  if (!projectSnap.exists) notFound();
  const project = docToProject(projectSnap);

  // Non-admin clients may only view their own projects
  if (!client.is_admin && project.client_id !== effectiveClientId(client)) {
    redirect("/projects");
  }

  const tickets: Ticket[] = ticketsSnap.docs.map(docToTicket);

  return (
    <IssueTable
      tickets={tickets}
      isAdmin={client.is_admin}
      initialStatus="all"
      initialSearch=""
      project={project}
    />
  );
}
