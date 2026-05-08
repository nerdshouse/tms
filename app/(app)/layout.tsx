import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { DEMO_ADMIN, DEMO_CLIENT, DEMO_PROJECTS, DEMO_TICKETS } from "@/lib/demo-data";
import { DemoProvider } from "@/lib/demo-context";
import { getSessionClient, adminDb, docToProject } from "@/lib/firebase/helpers";
import type { Client, Project } from "@/types";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = cookies();
  const demoUser = cookieStore.get("demo_user")?.value;

  let client: Client;
  let projects: (Project & { ticket_count: number })[] = [];

  if (demoUser === "admin" || demoUser === "client") {
    client = demoUser === "admin" ? DEMO_ADMIN : DEMO_CLIENT;

    if (demoUser === "admin") {
      projects = DEMO_PROJECTS.map((p) => ({
        ...p,
        ticket_count: DEMO_TICKETS.filter((t) => t.project_id === p.id).length,
      }));
    } else {
      projects = DEMO_PROJECTS
        .filter((p) => p.client_id === client.id)
        .map((p) => ({
          ...p,
          ticket_count: DEMO_TICKETS.filter((t) => t.project_id === p.id).length,
        }));
    }
  } else {
    const sessionClient = await getSessionClient();
    if (!sessionClient) redirect("/login");
    client = sessionClient;

    // Projects visible to this user (admin sees all, client sees own)
    const projectsQuery = client.is_admin
      ? adminDb.collection("projects").orderBy("created_at")
      : adminDb.collection("projects").where("client_id", "==", client.id).orderBy("created_at");

    const [projectsSnap, ticketsSnap] = await Promise.all([
      projectsQuery.get(),
      adminDb.collection("tickets").select("project_id").get(),
    ]);

    const countMap: Record<string, number> = {};
    ticketsSnap.docs.forEach((d) => {
      const pid = d.data().project_id;
      if (pid) countMap[pid] = (countMap[pid] ?? 0) + 1;
    });

    projects = projectsSnap.docs.map((snap) => ({
      ...docToProject(snap),
      ticket_count: countMap[snap.id] ?? 0,
    }));
  }

  const isDemo = demoUser === "admin" || demoUser === "client";

  return (
    <DemoProvider isDemo={isDemo}>
      <div className="flex min-h-screen bg-background">
        <Sidebar user={client} projects={projects} isDemo={isDemo} />
        <main className="flex-1 ml-56 min-h-screen">
          {children}
        </main>
      </div>
    </DemoProvider>
  );
}
