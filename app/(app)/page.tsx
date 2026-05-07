import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import IssueTable from "@/components/IssueTable";
import type { Ticket } from "@/types";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: { status?: string; q?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!client) redirect("/login");

  let query = supabase
    .from("tickets")
    .select("*, clients(name, company, email)")
    .order("updated_at", { ascending: false });

  if (searchParams.status && searchParams.status !== "all") {
    query = query.eq("status", searchParams.status);
  }

  const { data: tickets } = await query;

  return (
    <IssueTable
      tickets={(tickets ?? []) as Ticket[]}
      isAdmin={client.is_admin}
      initialStatus={searchParams.status ?? "all"}
      initialSearch={searchParams.q ?? ""}
    />
  );
}
