import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import IssueTable from "@/components/IssueTable";
import { DEMO_TICKETS, DEMO_ADMIN, DEMO_CLIENT } from "@/lib/demo-data";
import type { Ticket } from "@/types";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: { status?: string; q?: string };
}) {
  const cookieStore = cookies();
  const demoUser = cookieStore.get("demo_user")?.value;

  let tickets: Ticket[];
  let isAdmin: boolean;

  if (demoUser === "admin" || demoUser === "client") {
    isAdmin = demoUser === "admin";
    const user = demoUser === "admin" ? DEMO_ADMIN : DEMO_CLIENT;
    tickets = isAdmin
      ? (DEMO_TICKETS as Ticket[])
      : (DEMO_TICKETS.filter((t) => t.client_id === user.id) as Ticket[]);
  } else {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data: client } = await supabase
      .from("clients")
      .select("*")
      .eq("id", user.id)
      .single();
    if (!client) redirect("/login");

    isAdmin = client.is_admin;

    let query = supabase
      .from("tickets")
      .select("*, clients(name, company, email)")
      .order("updated_at", { ascending: false });

    if (searchParams.status && searchParams.status !== "all") {
      query = query.eq("status", searchParams.status);
    }

    const { data } = await query;
    tickets = (data ?? []) as Ticket[];
  }

  return (
    <IssueTable
      tickets={tickets}
      isAdmin={isAdmin}
      initialStatus={searchParams.status ?? "all"}
      initialSearch={searchParams.q ?? ""}
    />
  );
}
