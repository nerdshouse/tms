import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AnalyticsDashboard from "@/components/AnalyticsDashboard";
import { DEMO_TICKETS } from "@/lib/demo-data";
import type { Ticket } from "@/types";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const cookieStore = cookies();
  const demoUser = cookieStore.get("demo_user")?.value;

  let tickets: Ticket[];

  if (demoUser === "admin" || demoUser === "client") {
    if (demoUser !== "admin") redirect("/");
    tickets = DEMO_TICKETS as Ticket[];
  } else {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data: client } = await supabase
      .from("clients")
      .select("is_admin")
      .eq("id", user.id)
      .single();
    if (!client?.is_admin) redirect("/");

    const { data } = await supabase
      .from("tickets")
      .select("id, status, priority, type, module, created_at");
    tickets = (data ?? []) as Ticket[];
  }

  return <AnalyticsDashboard tickets={tickets} />;
}
