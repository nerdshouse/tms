import { redirect } from "next/navigation";
import ClientsGrid from "@/components/admin/ClientsGrid";
import { getSessionClient, adminDb, docToClient, docToProject } from "@/lib/firebase/helpers";
import type { Client, Project } from "@/types";

export const dynamic = "force-dynamic";

export default async function AdminClientsPage() {
  const me = await getSessionClient();
  if (!me?.is_admin) redirect("/");

  const [clientsSnap, projectsSnap, ticketsSnap] = await Promise.all([
    adminDb.collection("clients").where("is_admin", "==", false).orderBy("created_at").get(),
    adminDb.collection("projects").orderBy("created_at").get(),
    adminDb.collection("tickets").select("client_id").get(),
  ]);

  const clients: Client[] = clientsSnap.docs.map(docToClient);
  const projects: Project[] = projectsSnap.docs.map(docToProject);

  const ticketCounts: Record<string, number> = {};
  ticketsSnap.docs.forEach((d) => {
    const cid = d.data().client_id as string;
    if (cid) ticketCounts[cid] = (ticketCounts[cid] ?? 0) + 1;
  });

  return <ClientsGrid clients={clients} projects={projects} ticketCounts={ticketCounts} />;
}
