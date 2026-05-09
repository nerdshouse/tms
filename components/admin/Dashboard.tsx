"use client";

import Link from "next/link";
import type { Status, Priority } from "@/types";

interface DashboardStats {
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  doneTickets: number;
  overdueTickets: number;
}

interface RecentTicket {
  id: string;
  title: string;
  status: Status;
  priority: Priority;
  clientName: string;
  updatedAt: string;
}

interface AssigneeStat {
  name: string;
  initials: string;
  open: number;
  inProgress: number;
}

interface DashboardProps {
  stats: DashboardStats;
  recentTickets: RecentTicket[];
  assigneeStats: AssigneeStat[];
  statusBreakdown: Record<Status, number>;
}

const STATUS_LABELS: Record<Status, string> = {
  open: "Open",
  in_progress: "In Progress",
  review: "In Review",
  done: "Done",
};

const STATUS_COLORS: Record<Status, string> = {
  open: "bg-gray-200",
  in_progress: "bg-amber-400",
  review: "bg-blue-400",
  done: "bg-green-500",
};

const PRIORITY_COLORS: Record<Priority, string> = {
  P0: "text-red-600 bg-red-50",
  P1: "text-amber-600 bg-amber-50",
  P2: "text-blue-600 bg-blue-50",
};

export default function Dashboard({ stats, recentTickets, assigneeStats, statusBreakdown }: DashboardProps) {
  const total = stats.totalTickets || 1;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-[17px] font-semibold text-foreground">Dashboard</h1>
        <p className="text-xs text-muted mt-0.5">Overview of all active work</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Tickets", value: stats.totalTickets, href: "/", color: "text-foreground" },
          { label: "Open", value: stats.openTickets, href: "/?status=open", color: "text-gray-600" },
          { label: "In Progress", value: stats.inProgressTickets, href: "/?status=in_progress", color: "text-amber-600" },
          { label: "Overdue", value: stats.overdueTickets, href: "/", color: stats.overdueTickets > 0 ? "text-red-600" : "text-foreground" },
        ].map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="bg-card border border-border rounded-xl p-4 hover:border-accent/40 transition-colors"
          >
            <p className="text-[11px] text-muted uppercase tracking-wider font-medium mb-2">{card.label}</p>
            <p className={`text-[28px] font-semibold ${card.color}`}>{card.value}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Recent tickets */}
        <div className="col-span-2 bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h2 className="text-[13px] font-semibold text-foreground">Recent Tickets</h2>
            <Link href="/" className="text-[12px] text-accent hover:underline">View all →</Link>
          </div>
          <table className="w-full text-[12px]">
            <tbody>
              {recentTickets.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-muted">No tickets yet.</td>
                </tr>
              ) : (
                recentTickets.map((t) => (
                  <tr key={t.id} className="border-b border-border last:border-0 hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-2.5">
                      <Link href={`/tickets/${t.id}`} className="font-medium text-foreground hover:text-accent transition-colors line-clamp-1">
                        {t.title}
                      </Link>
                      <p className="text-[11px] text-muted mt-0.5">{t.clientName}</p>
                    </td>
                    <td className="px-4 py-2.5 w-20">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${PRIORITY_COLORS[t.priority]}`}>
                        {t.priority}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 w-24 text-muted text-[11px]">
                      {STATUS_LABELS[t.status]}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Status breakdown */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h2 className="text-[13px] font-semibold text-foreground mb-3">By Status</h2>
            <div className="space-y-2.5">
              {(["open", "in_progress", "review", "done"] as Status[]).map((s) => {
                const count = statusBreakdown[s] ?? 0;
                const pct = Math.round((count / total) * 100);
                return (
                  <div key={s}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[12px] text-muted">{STATUS_LABELS[s]}</span>
                      <span className="text-[12px] font-medium text-foreground">{count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${STATUS_COLORS[s]} transition-all`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Assignee workload */}
          {assigneeStats.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4">
              <h2 className="text-[13px] font-semibold text-foreground mb-3">Team Workload</h2>
              <div className="space-y-2.5">
                {assigneeStats.map((a) => (
                  <div key={a.name} className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-accent/15 flex items-center justify-center text-[9px] font-semibold text-accent flex-shrink-0">
                      {a.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-foreground truncate">{a.name}</p>
                      <p className="text-[11px] text-muted">{a.open} open · {a.inProgress} in progress</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
