import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AnalyticsDashboard from "@/components/AnalyticsDashboard";
import type { Ticket } from "@/types";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: client } = await supabase
    .from("clients")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!client?.is_admin) redirect("/");

  const { data: tickets } = await supabase
    .from("tickets")
    .select("id, status, priority, type, module, created_at");

  return <AnalyticsDashboard tickets={(tickets ?? []) as Ticket[]} />;
}
