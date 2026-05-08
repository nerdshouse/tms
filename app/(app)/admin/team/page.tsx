import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import TeamPage from "@/components/admin/TeamPage";
import { DEMO_TEAM_MEMBERS } from "@/lib/demo-data";
import { getSessionClient, adminDb, docToTeamMember } from "@/lib/firebase/helpers";
import type { TeamMember } from "@/types";

export const dynamic = "force-dynamic";

export default async function AdminTeamPage() {
  const cookieStore = cookies();
  const demoUser = cookieStore.get("demo_user")?.value;

  let members: TeamMember[];

  if (demoUser === "admin") {
    members = DEMO_TEAM_MEMBERS;
  } else {
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

    members = membersSnap.docs.map((snap) => ({
      ...docToTeamMember(snap),
      open_ticket_count: countMap[snap.id] ?? 0,
    }));
  }

  return <TeamPage members={members} />;
}
