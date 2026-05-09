import { redirect } from "next/navigation";
import Dashboard from "@/components/admin/Dashboard";
import { getSessionClient, adminDb, docToTicket } from "@/lib/firebase/helpers";
import type { Status } from "@/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const client = await getSessionClient();
  if (!client) redirect("/login");
  if (!client.is_admin) redirect("/");

  const [ticketsSnap] = await Promise.all([
    adminDb.collection("tickets").orderBy("updated_at", "desc").get(),
    adminDb.collection("team_members").where("status", "==", "active").get(),
  ]);

  const tickets = ticketsSnap.docs.map(docToTicket);

  const now = new Date();

  // Stat counts
  const statusBreakdown: Record<Status, number> = { open: 0, in_progress: 0, review: 0, done: 0 };
  let overdueTickets = 0;

  for (const t of tickets) {
    statusBreakdown[t.status] = (statusBreakdown[t.status] ?? 0) + 1;
    if (t.due_date && new Date(t.due_date) < now && t.status !== "done") {
      overdueTickets++;
    }
  }

  const stats = {
    totalTickets:      tickets.length,
    openTickets:       statusBreakdown.open,
    inProgressTickets: statusBreakdown.in_progress,
    doneTickets:       statusBreakdown.done,
    overdueTickets,
  };

  // Recent 10 tickets
  const recentTickets = tickets.slice(0, 10).map((t) => ({
    id:         t.id,
    title:      t.title,
    status:     t.status,
    priority:   t.priority,
    clientName: t.clients?.name ?? "",
    updatedAt:  t.updated_at,
  }));

  // Assignee workload
  const assigneeMap: Record<string, { name: string; initials: string; open: number; inProgress: number }> = {};
  for (const t of tickets) {
    if (!t.assignee_id || !t.team_members) continue;
    if (!assigneeMap[t.assignee_id]) {
      assigneeMap[t.assignee_id] = {
        name:       t.team_members.name,
        initials:   t.team_members.avatar_initials,
        open:       0,
        inProgress: 0,
      };
    }
    if (t.status === "open")        assigneeMap[t.assignee_id].open++;
    if (t.status === "in_progress") assigneeMap[t.assignee_id].inProgress++;
  }
  const assigneeStats = Object.values(assigneeMap)
    .sort((a, b) => (b.open + b.inProgress) - (a.open + a.inProgress))
    .slice(0, 5);

  return (
    <Dashboard
      stats={stats}
      recentTickets={recentTickets}
      assigneeStats={assigneeStats}
      statusBreakdown={statusBreakdown}
    />
  );
}
