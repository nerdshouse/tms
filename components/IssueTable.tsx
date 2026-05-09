"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, ChevronLeft } from "lucide-react";
import { StatusIcon } from "@/components/ui/StatusIcon";
import { PriorityBadge, TypeBadge } from "@/components/ui/Badges";
import type { Ticket, Project, Status } from "@/types";
import { formatIST, formatDate } from "@/lib/utils";
import { useRealtime } from "@/lib/use-realtime";

interface IssueTableProps {
  tickets: Ticket[];
  isAdmin: boolean;
  initialStatus: string;
  initialSearch: string;
  /** When set, this table is scoped to a single project */
  project?: Project;
  /** Client UID — used to scope realtime subscription for non-admin users */
  clientId?: string;
  /** Team members list for assignee filter (admin only) */
  teamMembers?: import("@/types").TeamMember[];
}

const statusTabs = [
  { label: "All",         value: "all" },
  { label: "Open",        value: "open" },
  { label: "In Progress", value: "in_progress" },
  { label: "In Review",   value: "review" },
  { label: "Done",        value: "done" },
];

export default function IssueTable({ tickets: initialTickets, isAdmin, initialStatus, initialSearch, project, clientId, teamMembers }: IssueTableProps) {
  const router = useRouter();
  const [tickets, setTickets] = useState(initialTickets);
  const [activeStatus, setActiveStatus] = useState(initialStatus);
  const [search, setSearch] = useState(initialSearch);
  const [assigneeFilter, setAssigneeFilter] = useState("");

  // Firestore rules only allow clients to query by client_id, not project_id.
  // Admins can use any filter. For project-scoped views, non-admins subscribe
  // to their client_id and filter in the memo — admins subscribe by project_id.
  const realtimeFilter = project
    ? isAdmin
      ? { column: "project_id", value: project.id }
      : clientId ? { column: "client_id", value: clientId } : undefined
    : undefined;

  useRealtime<Ticket>({
    table: "tickets",
    filter: realtimeFilter,
    events: ["INSERT", "UPDATE"],
    onInsert: (row) => setTickets((prev) => prev.some((t) => t.id === row.id) ? prev : [row, ...prev]),
    onUpdate: (row) =>
      setTickets((prev) =>
        prev.map((t) => (t.id === row.id ? { ...t, ...row } : t))
      ),
  });

  const filtered = useMemo(
    () =>
      tickets.filter((t) => {
        // When scoped to a project, only show that project's tickets
        if (project && t.project_id !== project.id) return false;
        const matchesStatus = activeStatus === "all" || t.status === activeStatus;
        const matchesAssignee = !assigneeFilter || t.assignee_id === assigneeFilter;
        const q = search.toLowerCase();
        const matchesSearch =
          !q ||
          t.title.toLowerCase().includes(q) ||
          t.id.toLowerCase().includes(q) ||
          t.module.toLowerCase().includes(q) ||
          t.projects?.name?.toLowerCase().includes(q) ||
          (isAdmin && t.clients?.name?.toLowerCase().includes(q));
        return matchesStatus && matchesAssignee && matchesSearch;
      }),
    [tickets, activeStatus, assigneeFilter, search, isAdmin, project]
  );

  return (
    <div className="p-6">
      {/* Header */}
      {project ? (
        <div className="mb-5">
          <Link
            href="/projects"
            className="inline-flex items-center gap-1 text-[12px] text-muted hover:text-foreground mb-3 transition-colors"
          >
            <ChevronLeft size={13} /> All Projects
          </Link>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${project.color}22` }}
              >
                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: project.color }} />
              </div>
              <div>
                <h1 className="text-[17px] font-semibold text-foreground">{project.name}</h1>
                <p className="text-xs text-muted mt-0.5">{tickets.length} ticket{tickets.length !== 1 ? "s" : ""}</p>
              </div>
            </div>
            <Link
              href={`/new?project_id=${project.id}`}
              className="px-3.5 py-2 bg-accent hover:bg-accent-hover text-white text-[13px] font-medium rounded-lg transition"
            >
              + New Request
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-[17px] font-semibold text-foreground">
              {isAdmin ? "All Requests" : "My Requests"}
            </h1>
            <p className="text-xs text-muted mt-0.5">{tickets.length} total</p>
          </div>
          <Link href="/new" className="px-3.5 py-2 bg-accent hover:bg-accent-hover text-white text-[13px] font-medium rounded-lg transition">
            + New Request
          </Link>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5">
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveStatus(tab.value)}
              className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors ${
                activeStatus === tab.value
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {isAdmin && teamMembers && teamMembers.length > 0 && (
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="px-2.5 py-1.5 text-[12px] border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition"
          >
            <option value="">All Assignees</option>
            {teamMembers.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        )}
        <div className="relative ml-auto">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Search issues…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-[12px] border border-border rounded-lg bg-card text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent w-56 transition"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border bg-gray-50/60">
              <th className="text-left px-4 py-2.5 font-medium text-muted text-[11px] uppercase tracking-wide w-24">ID</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted text-[11px] uppercase tracking-wide">Title</th>
              {isAdmin && (
                <th className="text-left px-4 py-2.5 font-medium text-muted text-[11px] uppercase tracking-wide w-28">Client</th>
              )}
              <th className="text-left px-4 py-2.5 font-medium text-muted text-[11px] uppercase tracking-wide w-32">Project</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted text-[11px] uppercase tracking-wide w-24">Type</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted text-[11px] uppercase tracking-wide w-16">Priority</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted text-[11px] uppercase tracking-wide w-28">Status</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted text-[11px] uppercase tracking-wide w-24">Module</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted text-[11px] uppercase tracking-wide w-24">Due</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted text-[11px] uppercase tracking-wide w-28">Updated</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 10 : 9} className="px-4 py-12 text-center text-muted text-[13px]">
                  No issues found.
                </td>
              </tr>
            ) : (
              filtered.map((ticket, i) => (
                <tr
                  key={ticket.id}
                  onClick={() => router.push(`/tickets/${ticket.id}`)}
                  className={`border-b border-border last:border-0 hover:bg-gray-50/50 transition-colors cursor-pointer ${i % 2 === 0 ? "" : "bg-gray-50/20"}`}
                >
                  <td className="px-4 py-3 font-mono text-[11px] text-muted">
                    #{ticket.id.slice(0, 8)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-foreground line-clamp-1">{ticket.title}</span>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-muted">{ticket.clients?.name ?? "—"}</td>
                  )}
                  <td className="px-4 py-3">
                    {ticket.projects ? (
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: ticket.projects.color }} />
                        <span className="text-[12px] text-foreground truncate max-w-[100px]">{ticket.projects.name}</span>
                      </div>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3"><TypeBadge type={ticket.type} /></td>
                  <td className="px-4 py-3"><PriorityBadge priority={ticket.priority} /></td>
                  <td className="px-4 py-3"><StatusIcon status={ticket.status as Status} showLabel /></td>
                  <td className="px-4 py-3 text-muted">{ticket.module || "—"}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {ticket.due_date ? (
                      <span className={`text-[12px] font-medium ${new Date(ticket.due_date) < new Date() && ticket.status !== "done" ? "text-red-500" : "text-muted"}`}>
                        {formatDate(ticket.due_date)}
                      </span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted whitespace-nowrap">{formatIST(ticket.updated_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
