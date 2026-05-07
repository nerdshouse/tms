"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { StatusIcon } from "@/components/ui/StatusIcon";
import { PriorityBadge, TypeBadge } from "@/components/ui/Badges";
import type { Ticket, Status } from "@/types";
import { formatIST } from "@/lib/utils";

interface IssueTableProps {
  tickets: Ticket[];
  isAdmin: boolean;
  initialStatus: string;
  initialSearch: string;
}

const statusTabs: { label: string; value: string }[] = [
  { label: "All", value: "all" },
  { label: "Open", value: "open" },
  { label: "In Progress", value: "in_progress" },
  { label: "In Review", value: "review" },
  { label: "Done", value: "done" },
];

export default function IssueTable({ tickets, isAdmin, initialStatus, initialSearch }: IssueTableProps) {
  const [activeStatus, setActiveStatus] = useState(initialStatus);
  const [search, setSearch] = useState(initialSearch);

  const filtered = useMemo(() => {
    return tickets.filter((t) => {
      const matchesStatus = activeStatus === "all" || t.status === activeStatus;
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        t.title.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        t.module.toLowerCase().includes(q) ||
        (isAdmin && t.clients?.name?.toLowerCase().includes(q));
      return matchesStatus && matchesSearch;
    });
  }, [tickets, activeStatus, search, isAdmin]);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[17px] font-semibold text-foreground">
            {isAdmin ? "All Requests" : "My Requests"}
          </h1>
          <p className="text-xs text-muted mt-0.5">{tickets.length} total</p>
        </div>
        <Link
          href="/new"
          className="px-3.5 py-2 bg-accent hover:bg-accent-hover text-white text-[13px] font-medium rounded-lg transition"
        >
          + New Request
        </Link>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 mb-4">
        {/* Status tabs */}
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

        {/* Search */}
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
              <th className="text-left px-4 py-2.5 font-medium text-muted text-[11px] uppercase tracking-wide w-28">ID</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted text-[11px] uppercase tracking-wide">Title</th>
              {isAdmin && (
                <th className="text-left px-4 py-2.5 font-medium text-muted text-[11px] uppercase tracking-wide w-32">Client</th>
              )}
              <th className="text-left px-4 py-2.5 font-medium text-muted text-[11px] uppercase tracking-wide w-24">Type</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted text-[11px] uppercase tracking-wide w-16">Priority</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted text-[11px] uppercase tracking-wide w-28">Status</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted text-[11px] uppercase tracking-wide w-28">Module</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted text-[11px] uppercase tracking-wide w-28">Updated</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 8 : 7} className="px-4 py-12 text-center text-muted text-[13px]">
                  No issues found.
                </td>
              </tr>
            ) : (
              filtered.map((ticket, i) => (
                <tr
                  key={ticket.id}
                  className={`border-b border-border last:border-0 hover:bg-gray-50/50 transition-colors ${i % 2 === 0 ? "" : "bg-gray-50/20"}`}
                >
                  <td className="px-4 py-3 font-mono text-[11px] text-muted">
                    #{ticket.id.slice(0, 8)}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/tickets/${ticket.id}`}
                      className="font-medium text-foreground hover:text-accent transition-colors line-clamp-1"
                    >
                      {ticket.title}
                    </Link>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-muted">
                      {ticket.clients?.name ?? "—"}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <TypeBadge type={ticket.type} />
                  </td>
                  <td className="px-4 py-3">
                    <PriorityBadge priority={ticket.priority} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusIcon status={ticket.status as Status} showLabel />
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {ticket.module || "—"}
                  </td>
                  <td className="px-4 py-3 text-muted whitespace-nowrap">
                    {formatIST(ticket.updated_at)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
