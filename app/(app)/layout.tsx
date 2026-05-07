import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { DEMO_ADMIN, DEMO_CLIENT, DEMO_PROJECTS, DEMO_TICKETS } from "@/lib/demo-data";
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
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data } = await supabase.from("clients").select("*").eq("id", user.id).single();
    if (!data) redirect("/login");
    client = data as Client;

    // Fetch projects scoped to this user (RLS handles visibility)
    const { data: projectsData } = await supabase
      .from("projects")
      .select("*")
      .order("created_at");

    const { data: ticketCounts } = await supabase
      .from("tickets")
      .select("project_id")
      .not("project_id", "is", null);

    const countMap: Record<string, number> = {};
    (ticketCounts ?? []).forEach((t: { project_id: string }) => {
      countMap[t.project_id] = (countMap[t.project_id] ?? 0) + 1;
    });

    projects = (projectsData ?? []).map((p) => ({
      ...p,
      ticket_count: countMap[p.id] ?? 0,
    })) as (Project & { ticket_count: number })[];
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar user={client} projects={projects} />
      <main className="flex-1 ml-56 min-h-screen">
        {children}
      </main>
    </div>
  );
}
