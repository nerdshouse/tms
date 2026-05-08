import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ClientsGrid from "@/components/admin/ClientsGrid";
import { DEMO_CLIENTS, DEMO_PROJECTS, DEMO_TICKETS } from "@/lib/demo-data";
import { getSessionClient, adminDb, docToClient, docToProject } from "@/lib/firebase/helpers";
import type { Client, Project } from "@/types";

export const dynamic = "force-dynamic";

export default async function AdminClientsPage() {
  const cookieStore = cookies();
  const demoUser = cookieStore.get("demo_user")?.value;

  let clients: Client[];
  let projects: Project[];
  let ticketCounts: Record<string, number>;

  if (demoUser === "admin") {
    clients = DEMO_CLIENTS;
    projects = DEMO_PROJECTS;
    ticketCounts = Object.fromEntries(
      DEMO_CLIENTS.map((c) => [c.id, DEMO_TICKETS.filter((t) => t.client_id === c.id).length])
    );
  } else {
    const me = await getSessionClient();
    if (!me?.is_admin) redirect("/");

    const [clientsSnap, projectsSnap, ticketsSnap] = await Promise.all([
      adminDb.collection("clients").where("is_admin", "==", false).orderBy("created_at").get(),
      adminDb.collection("projects").orderBy("created_at").get(),
      adminDb.collection("tickets").select("client_id").get(),
    ]);

    clients = clientsSnap.docs.map(docToClient);
    projects = projectsSnap.docs.map(docToProject);

    ticketCounts = {};
    ticketsSnap.docs.forEach((d) => {
      const cid = d.data().client_id as string;
      if (cid) ticketCounts[cid] = (ticketCounts[cid] ?? 0) + 1;
    });
  }

  return <ClientsGrid clients={clients} projects={projects} ticketCounts={ticketCounts} />;
}
