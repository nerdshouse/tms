import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import ClientDetail from "@/components/admin/ClientDetail";
import { DEMO_CLIENTS, DEMO_PROJECTS, DEMO_TICKETS } from "@/lib/demo-data";
import type { Client, Project, Ticket } from "@/types";

export const dynamic = "force-dynamic";

export default async function AdminClientDetailPage({ params }: { params: { id: string } }) {
  const cookieStore = cookies();
  const demoUser = cookieStore.get("demo_user")?.value;

  let client: Client;
  let projects: Project[];
  let tickets: Ticket[];

  if (demoUser === "admin") {
    const found = DEMO_CLIENTS.find((c) => c.id === params.id);
    if (!found) notFound();
    client = found;
    projects = DEMO_PROJECTS.filter((p) => p.client_id === params.id);
    tickets = DEMO_TICKETS.filter((t) => t.client_id === params.id);
  } else {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");
    const { data: me } = await supabase.from("clients").select("is_admin").eq("id", user.id).single();
    if (!me?.is_admin) redirect("/");

    const [{ data: clientData }, { data: projectsData }, { data: ticketsData }] = await Promise.all([
      supabase.from("clients").select("*").eq("id", params.id).single(),
      supabase.from("projects").select("*").eq("client_id", params.id).order("created_at"),
      supabase.from("tickets").select("*, projects(name,color)").eq("client_id", params.id).order("updated_at", { ascending: false }),
    ]);

    if (!clientData) notFound();
    client = clientData as Client;
    projects = (projectsData ?? []) as Project[];
    tickets = (ticketsData ?? []) as Ticket[];
  }

  return <ClientDetail client={client} projects={projects} tickets={tickets} />;
}
