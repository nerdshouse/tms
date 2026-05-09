"use client";

import { useState, useMemo } from "react";
import { formatIST } from "@/lib/utils";
import type { SystemLog } from "@/types";

interface Props {
  initialLogs: SystemLog[];
}

type FilterId = "all" | "status" | "tickets" | "admin";

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all",     label: "All" },
  { id: "status",  label: "Status changes" },
  { id: "tickets", label: "Tickets" },
  { id: "admin",   label: "Admin actions" },
];

const ACTION_GROUPS: Record<FilterId, string[]> = {
  all:     [],
  status:  ["ticket_status_changed"],
  tickets: ["ticket_created", "comment_posted", "ticket_assigned"],
  admin:   ["client_added", "project_added", "project_removed", "team_member_added", "team_member_removed", "poc_assigned", "contact_added", "contact_removed"],
};

const ACTION_LABELS: Record<string, string> = {
  ticket_created:        "Ticket created",
  ticket_status_changed: "Status changed",
  ticket_assigned:       "Assigned",
  comment_posted:        "Comment posted",
  client_added:          "Client added",
  project_added:         "Project added",
  project_removed:       "Project removed",
  team_member_added:     "Member added",
  team_member_removed:   "Member removed",
  poc_assigned:          "POC assigned",
  contact_added:         "Contact added",
  contact_removed:       "Contact removed",
};

const ACTION_COLORS: Record<string, string> = {
  ticket_created:        "bg-blue-50 text-blue-700 border-blue-100",
  ticket_status_changed: "bg-amber-50 text-amber-700 border-amber-100",
  ticket_assigned:       "bg-purple-50 text-purple-700 border-purple-100",
  comment_posted:        "bg-gray-100 text-gray-600 border-gray-200",
  client_added:          "bg-green-50 text-green-700 border-green-100",
  project_added:         "bg-green-50 text-green-700 border-green-100",
  project_removed:       "bg-red-50 text-red-700 border-red-100",
  team_member_added:     "bg-green-50 text-green-700 border-green-100",
  team_member_removed:   "bg-red-50 text-red-700 border-red-100",
  poc_assigned:          "bg-accent/10 text-accent border-accent/20",
  contact_added:         "bg-green-50 text-green-700 border-green-100",
  contact_removed:       "bg-red-50 text-red-700 border-red-100",
};

const PAGE_SIZE = 50;

export default function SystemLogs({ initialLogs }: Props) {
  const [filter, setFilter]   = useState<FilterId>("all");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(false);

  const filtered = useMemo(() => {
    if (filter === "all") return initialLogs;
    const group = ACTION_GROUPS[filter];
    return initialLogs.filter((l) => group.includes(l.action_type));
  }, [initialLogs, filter]);

  const shown = filtered.slice(0, visible);

  async function loadMore() {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 100)); // slight delay for UX
    setVisible((v) => v + PAGE_SIZE);
    setLoading(false);
  }

  return (
    <div className="p-6">
      <div className="mb-5">
        <h1 className="text-[17px] font-semibold text-foreground">System Logs</h1>
        <p className="text-xs text-muted mt-0.5">Full audit trail of all portal activity</p>
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5 w-fit mb-5">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => { setFilter(f.id); setVisible(PAGE_SIZE); }}
            className={`px-4 py-1.5 rounded-md text-[12px] font-medium transition-colors ${
              filter === f.id
                ? "bg-white text-foreground shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            {f.label}
            {f.id !== "all" && (
              <span className="ml-1.5 text-[10px] tabular-nums opacity-60">
                {initialLogs.filter((l) => ACTION_GROUPS[f.id].includes(l.action_type)).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {shown.length === 0 ? (
          <p className="text-[13px] text-muted text-center py-12">No logs found.</p>
        ) : (
          <>
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-border bg-gray-50/60">
                  <th className="text-left px-4 py-2.5 font-medium text-muted text-[11px] uppercase tracking-wide w-40">Time</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted text-[11px] uppercase tracking-wide w-32">User</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted text-[11px] uppercase tracking-wide w-36">Action</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted text-[11px] uppercase tracking-wide">Detail</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted text-[11px] uppercase tracking-wide w-24">Type</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((log, i) => (
                  <tr
                    key={log.id}
                    className={`border-b border-border last:border-0 hover:bg-gray-50/50 transition-colors ${i % 2 !== 0 ? "bg-gray-50/20" : ""}`}
                  >
                    <td className="px-4 py-3 text-muted whitespace-nowrap">{formatIST(log.timestamp)}</td>
                    <td className="px-4 py-3">
                      {log.user_name ? (
                        <span className="font-medium text-foreground">{log.user_name}</span>
                      ) : (
                        <span className="text-muted italic">System</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${
                        ACTION_COLORS[log.action_type] ?? "bg-gray-100 text-gray-600 border-gray-200"
                      }`}>
                        {ACTION_LABELS[log.action_type] ?? log.action_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-foreground">{log.detail}</td>
                    <td className="px-4 py-3 text-muted text-[11px] capitalize">{log.entity_type ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {visible < filtered.length && (
              <div className="px-4 py-3 border-t border-border flex items-center justify-between">
                <p className="text-[12px] text-muted">
                  Showing {shown.length} of {filtered.length}
                </p>
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="px-4 py-1.5 text-[12px] font-medium text-accent border border-accent/30 rounded-lg hover:bg-accent/5 transition disabled:opacity-60"
                >
                  {loading ? "Loading…" : "Load more"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
