import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import TeamPage from "@/components/admin/TeamPage";
import { DEMO_TEAM_MEMBERS } from "@/lib/demo-data";
import type { TeamMember } from "@/types";

export const dynamic = "force-dynamic";

export default async function AdminTeamPage() {
  const cookieStore = cookies();
  const demoUser = cookieStore.get("demo_user")?.value;

  let members: TeamMember[];

  if (demoUser === "admin") {
    members = DEMO_TEAM_MEMBERS;
  } else {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");
    const { data: me } = await supabase.from("clients").select("is_admin").eq("id", user.id).single();
    if (!me?.is_admin) redirect("/");

    // Get members with open ticket counts
    const { data: membersData } = await supabase.from("team_members").select("*").order("created_at");
    const { data: ticketData } = await supabase.from("tickets").select("assignee_id").neq("status", "done").not("assignee_id", "is", null);

    const countMap: Record<string, number> = {};
    (ticketData ?? []).forEach((t: { assignee_id: string }) => {
      countMap[t.assignee_id] = (countMap[t.assignee_id] ?? 0) + 1;
    });

    members = (membersData ?? []).map((m) => ({
      ...m,
      open_ticket_count: countMap[m.id] ?? 0,
    })) as TeamMember[];
  }

  return <TeamPage members={members} />;
}
