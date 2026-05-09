import { redirect } from "next/navigation";
import TeamPage from "@/components/admin/TeamPage";
import { getSessionClient, adminDb, docToTeamMember } from "@/lib/firebase/helpers";
import type { TeamMember } from "@/types";

export const dynamic = "force-dynamic";

export default async function AdminTeamPage() {
  const me = await getSessionClient();
  if (!me?.is_admin) redirect("/");

  const [membersSnap, ticketsSnap] = await Promise.all([
    adminDb.collection("team_members").orderBy("created_at").get(),
    adminDb
      .collection("tickets")
      .where("status", "!=", "done")
      .select("assignee_id")
      .get(),
  ]);

  const countMap: Record<string, number> = {};
  ticketsSnap.docs.forEach((d) => {
    const aid = d.data().assignee_id as string | null;
    if (aid) countMap[aid] = (countMap[aid] ?? 0) + 1;
  });

  const members: TeamMember[] = membersSnap.docs.map((snap) => ({
    ...docToTeamMember(snap),
    open_ticket_count: countMap[snap.id] ?? 0,
  }));

  const isFullAdmin = !me.team_role || me.team_role === "Admin";

  return <TeamPage members={members} canInvite={isFullAdmin} />;
}
