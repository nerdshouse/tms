import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ClientsGrid from "@/components/admin/ClientsGrid";
import { DEMO_CLIENTS, DEMO_PROJECTS, DEMO_TICKETS } from "@/lib/demo-data";
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
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");
    const { data: me } = await supabase.from("clients").select("is_admin").eq("id", user.id).single();
    if (!me?.is_admin) redirect("/");

    const [{ data: clientsData }, { data: projectsData }] = await Promise.all([
      supabase.from("clients").select("*").eq("is_admin", false).order("created_at"),
      supabase.from("projects").select("*").order("created_at"),
    ]);
    clients = (clientsData ?? []) as Client[];
    projects = (projectsData ?? []) as Project[];

    // Ticket counts via separate query
    const { data: ticketData } = await supabase.from("tickets").select("client_id");
    ticketCounts = {};
    (ticketData ?? []).forEach((t: { client_id: string }) => {
      ticketCounts[t.client_id] = (ticketCounts[t.client_id] ?? 0) + 1;
    });
  }

  return (
    <ClientsGrid
      clients={clients}
      projects={projects}
      ticketCounts={ticketCounts}
    />
  );
}
