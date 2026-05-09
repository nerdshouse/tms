"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Loader2, Send } from "lucide-react";
import { StatusIcon } from "@/components/ui/StatusIcon";
import { PriorityBadge, TypeBadge } from "@/components/ui/Badges";
import { formatIST, formatISTShort } from "@/lib/utils";
import type { Ticket, TicketUpdate, Client, Status, TeamMember } from "@/types";
import { useRealtime } from "@/lib/use-realtime";

interface TicketDetailProps {
  ticket: Ticket;
  updates: TicketUpdate[];
  currentClient: Client;
  teamMembers: TeamMember[];
}

const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: "open",        label: "○  Open" },
  { value: "in_progress", label: "◑  In Progress" },
  { value: "review",      label: "◕  In Review" },
  { value: "done",        label: "●  Done" },
];

export default function TicketDetail({ ticket, updates, currentClient, teamMembers }: TicketDetailProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [newStatus, setNewStatus] = useState<Status>(ticket.status);
  const [newAssigneeId, setNewAssigneeId] = useState<string>(ticket.assignee_id ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [localUpdates, setLocalUpdates] = useState(updates);
  const [localTicket, setLocalTicket] = useState(ticket);

  // Live activity feed: append new updates as they arrive
  useRealtime<TicketUpdate>({
    table: "ticket_updates",
    filter: { column: "ticket_id", value: ticket.id },
    events: ["INSERT"],
    onInsert: (row) =>
      setLocalUpdates((prev) =>
        prev.some((u) => u.id === row.id) ? prev : [...prev, row]
      ),
  });

  // Live ticket status/assignee changes from other sessions
  useRealtime<Ticket>({
    table: "tickets",
    filter: { column: "id", value: ticket.id },
    events: ["UPDATE"],
    onUpdate: (row) => {
      setLocalTicket((t) => ({ ...t, ...row }));
      setNewStatus(row.status);
      if (row.assignee_id !== undefined) setNewAssigneeId(row.assignee_id ?? "");
    },
  });

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/updates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to post reply");
      setLocalUpdates((prev) => [...prev, data]);
      setMessage("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAdminUpdate() {
    if (newStatus === localTicket.status && newAssigneeId === (localTicket.assignee_id ?? "")) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          assignee_id: newAssigneeId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update ticket");
      const assignee = teamMembers.find((m) => m.id === newAssigneeId);
      setLocalTicket((t) => ({
        ...t,
        status: newStatus,
        assignee_id: newAssigneeId || null,
        team_members: assignee ? { name: assignee.name, avatar_initials: assignee.avatar_initials } : undefined,
      }));
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-6">
      <Link href="/" className="inline-flex items-center gap-1 text-[13px] text-muted hover:text-foreground mb-5 transition-colors">
        <ChevronLeft size={14} />
        Back to requests
      </Link>

      <div className="flex gap-6">
        {/* Main */}
        <div className="flex-1 min-w-0">
          {/* Ticket header */}
          <div className="bg-card border border-border rounded-xl p-5 mb-4">
            <div className="flex items-start gap-3 mb-3">
              <div className="flex-1 min-w-0">
                <h1 className="text-[16px] font-semibold text-foreground leading-snug">{localTicket.title}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-[11px] text-muted font-mono">#{ticket.id.slice(0, 8)}</p>
                  {localTicket.projects && (
                    <>
                      <span className="text-muted text-[11px]">·</span>
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: localTicket.projects.color }} />
                      <span className="text-[11px] text-muted">{localTicket.projects.name}</span>
                    </>
                  )}
                </div>
              </div>
              <StatusIcon status={localTicket.status} showLabel />
            </div>
            <p className="text-[13px] text-muted leading-relaxed whitespace-pre-wrap">{localTicket.description}</p>
          </div>

          {/* Activity */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-[13px] font-semibold text-foreground mb-4">Activity</h2>
            {localUpdates.length === 0 ? (
              <p className="text-[13px] text-muted text-center py-6">No activity yet.</p>
            ) : (
              <div className="space-y-4">
                {localUpdates.map((u) => (
                  <div key={u.id} className="flex gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-semibold ${
                      u.author_type === "team" ? "bg-accent/15 text-accent" : "bg-gray-100 text-gray-600"
                    }`}>
                      {u.author_name[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[12px] font-medium text-foreground">{u.author_name}</span>
                        {u.author_type === "team" && (
                          <span className="text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded font-medium">Team</span>
                        )}
                        <span className="text-[11px] text-muted">{formatISTShort(u.created_at)}</span>
                      </div>
                      <p className="text-[13px] text-foreground leading-relaxed whitespace-pre-wrap bg-gray-50/60 rounded-lg px-3 py-2">
                        {u.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Reply */}
            <form onSubmit={handleReply} className="mt-5 pt-4 border-t border-border">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={currentClient.is_admin ? "Reply to client…" : "Add a comment…"}
                rows={3}
                className="w-full px-3 py-2 text-[13px] border border-border rounded-lg bg-background text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition resize-none mb-3"
              />
              {error && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-3">{error}</p>}
              <button
                type="submit"
                disabled={submitting || !message.trim()}
                className="flex items-center gap-2 px-3.5 py-2 bg-accent hover:bg-accent-hover text-white text-[13px] font-medium rounded-lg transition disabled:opacity-60"
              >
                {submitting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                {submitting ? "Posting…" : "Post Reply"}
              </button>
            </form>
          </div>
        </div>

        {/* Properties panel */}
        <div className="w-56 flex-shrink-0 space-y-3">
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-3">Properties</h3>
            <dl className="space-y-3 text-[13px]">
              <div>
                <dt className="text-muted text-[11px] mb-0.5">Status</dt>
                <dd><StatusIcon status={localTicket.status} showLabel /></dd>
              </div>
              <div>
                <dt className="text-muted text-[11px] mb-0.5">Priority</dt>
                <dd><PriorityBadge priority={localTicket.priority} /></dd>
              </div>
              <div>
                <dt className="text-muted text-[11px] mb-0.5">Type</dt>
                <dd><TypeBadge type={localTicket.type} /></dd>
              </div>
              <div>
                <dt className="text-muted text-[11px] mb-0.5">Module</dt>
                <dd className="text-foreground">{localTicket.module || "—"}</dd>
              </div>
              {localTicket.projects && (
                <div>
                  <dt className="text-muted text-[11px] mb-0.5">Project</dt>
                  <dd className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: localTicket.projects.color }} />
                    <span className="text-foreground text-[12px]">{localTicket.projects.name}</span>
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-muted text-[11px] mb-0.5">Assignee</dt>
                <dd>
                  {localTicket.team_members ? (
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-accent/15 flex items-center justify-center text-[9px] font-semibold text-accent">
                        {localTicket.team_members.avatar_initials}
                      </div>
                      <span className="text-[12px] text-foreground">{localTicket.team_members.name}</span>
                    </div>
                  ) : (
                    <span className="text-muted text-[12px]">Unassigned</span>
                  )}
                </dd>
              </div>
              {currentClient.is_admin && (
                <>
                  <div>
                    <dt className="text-muted text-[11px] mb-0.5">Client</dt>
                    <dd className="text-foreground">{localTicket.clients?.name ?? "—"}</dd>
                  </div>
                </>
              )}
              <div>
                <dt className="text-muted text-[11px] mb-0.5">Created</dt>
                <dd className="text-muted text-[12px]">{formatIST(localTicket.created_at)}</dd>
              </div>
              <div>
                <dt className="text-muted text-[11px] mb-0.5">Updated</dt>
                <dd className="text-muted text-[12px]">{formatIST(localTicket.updated_at)}</dd>
              </div>
            </dl>
          </div>

          {/* Admin controls */}
          {currentClient.is_admin && (
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <h3 className="text-[11px] font-semibold text-muted uppercase tracking-wider">Admin</h3>

              <div>
                <label className="block text-[11px] text-muted mb-1">Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as Status)}
                  className="w-full px-2.5 py-1.5 text-[12px] border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition"
                >
                  {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-muted mb-1">Assignee</label>
                <select
                  value={newAssigneeId}
                  onChange={(e) => setNewAssigneeId(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-[12px] border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition"
                >
                  <option value="">Unassigned</option>
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleAdminUpdate}
                disabled={submitting || (newStatus === localTicket.status && newAssigneeId === (localTicket.assignee_id ?? ""))}
                className="w-full py-1.5 text-[12px] font-medium bg-accent hover:bg-accent-hover text-white rounded-lg transition disabled:opacity-60"
              >
                {submitting ? "Saving…" : "Save Changes"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
