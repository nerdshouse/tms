"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Loader2, Send, Paperclip, Trash2, AlertTriangle, Pencil } from "lucide-react";
import { StatusIcon } from "@/components/ui/StatusIcon";
import { PriorityBadge, TypeBadge } from "@/components/ui/Badges";
import { formatIST, formatISTShort, formatDate } from "@/lib/utils";
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
  const [newDueDate, setNewDueDate] = useState<string>(ticket.due_date ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [localUpdates, setLocalUpdates] = useState(updates);
  const [localTicket, setLocalTicket] = useState(ticket);

  // Client edit state
  const isOwner = !currentClient.is_admin && localTicket.client_id === currentClient.id;
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    title:       ticket.title,
    description: ticket.description,
    priority:    ticket.priority,
    type:        ticket.type,
    due_date:    ticket.due_date ?? "",
    page_url:    ticket.page_url ?? "",
  });
  const [savingEdit, setSavingEdit] = useState(false);

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
      // Dedup: realtime onInsert may fire before or after this response
      setLocalUpdates((prev) => prev.some((u) => u.id === data.id) ? prev : [...prev, data]);
      setMessage("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAdminUpdate() {
    const unchanged =
      newStatus === localTicket.status &&
      newAssigneeId === (localTicket.assignee_id ?? "") &&
      newDueDate === (localTicket.due_date ?? "");
    if (unchanged) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          assignee_id: newAssigneeId || null,
          due_date: newDueDate || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update ticket");
      const assignee = teamMembers.find((m) => m.id === newAssigneeId);
      setLocalTicket((t) => ({
        ...t,
        status: newStatus,
        assignee_id: newAssigneeId || null,
        due_date: newDueDate || null,
        team_members: assignee ? { name: assignee.name, avatar_initials: assignee.avatar_initials } : undefined,
      }));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    await fetch(`/api/tickets/${ticket.id}`, { method: "DELETE" });
    router.push("/");
  }

  async function handleClientEdit(e: React.FormEvent) {
    e.preventDefault();
    setSavingEdit(true);
    setError("");
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title:       editForm.title,
          description: editForm.description,
          priority:    editForm.priority,
          type:        editForm.type,
          due_date:    editForm.due_date || null,
          page_url:    editForm.page_url || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      setLocalTicket((t) => ({ ...t, ...editForm, due_date: editForm.due_date || null, page_url: editForm.page_url || null }));
      setEditOpen(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSavingEdit(false);
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <Link href="/" className="inline-flex items-center gap-1 text-[13px] text-muted hover:text-foreground transition-colors">
          <ChevronLeft size={14} />
          Back to requests
        </Link>
        <div className="flex items-center gap-2">
          {/* Edit button — admin or ticket owner */}
          {(currentClient.is_admin || isOwner) && !confirmDelete && (
            <button
              onClick={() => { setEditForm({ title: localTicket.title, description: localTicket.description, priority: localTicket.priority, type: localTicket.type, due_date: localTicket.due_date ?? "", page_url: localTicket.page_url ?? "" }); setEditOpen((v) => !v); setError(""); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-muted border border-border rounded-lg hover:bg-gray-50 hover:text-foreground transition"
            >
              <Pencil size={12} /> Edit
            </button>
          )}
          {/* Delete button — admin or ticket owner */}
          {(currentClient.is_admin || isOwner) && (
            !confirmDelete ? (
              <button
                onClick={() => { setConfirmDelete(true); setEditOpen(false); }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition"
              >
                <Trash2 size={12} /> Delete
              </button>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle size={12} className="text-red-600" />
                <span className="text-[12px] text-red-700 font-medium">Delete this request?</span>
                <button onClick={handleDelete} disabled={deleting} className="text-[12px] font-semibold text-red-600 hover:text-red-800 disabled:opacity-50">
                  {deleting ? "Deleting…" : "Yes, delete"}
                </button>
                <button onClick={() => setConfirmDelete(false)} className="text-[12px] text-muted hover:text-foreground">Cancel</button>
              </div>
            )
          )}
        </div>
      </div>

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

          {/* Inline edit form */}
          {editOpen && (
            <form onSubmit={currentClient.is_admin ? handleAdminUpdate as unknown as React.FormEventHandler : handleClientEdit} className="bg-card border border-accent/30 rounded-xl p-5 mb-4 space-y-4">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-[13px] font-semibold text-foreground">Edit Request</h3>
                <button type="button" onClick={() => setEditOpen(false)} className="text-muted hover:text-foreground transition-colors text-[12px]">Cancel</button>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-muted mb-1">Title <span className="text-red-500">*</span></label>
                <input type="text" required value={editForm.title}
                  onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2 text-[13px] border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-muted mb-1">Description <span className="text-red-500">*</span></label>
                <textarea required rows={4} value={editForm.description}
                  onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 text-[13px] border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-muted mb-1">Priority</label>
                  <select value={editForm.priority} onChange={(e) => setEditForm((f) => ({ ...f, priority: e.target.value as import("@/types").Priority }))}
                    className="w-full px-2.5 py-1.5 text-[12px] border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition">
                    <option value="P0">P0 — Critical</option>
                    <option value="P1">P1 — High</option>
                    <option value="P2">P2 — Normal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-muted mb-1">Type</label>
                  <select value={editForm.type} onChange={(e) => setEditForm((f) => ({ ...f, type: e.target.value as import("@/types").TicketType }))}
                    className="w-full px-2.5 py-1.5 text-[12px] border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition">
                    <option value="New">New</option>
                    <option value="Existing">Existing</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-muted mb-1">Due Date</label>
                  <input type="date" value={editForm.due_date}
                    onChange={(e) => setEditForm((f) => ({ ...f, due_date: e.target.value }))}
                    className="w-full px-2.5 py-1.5 text-[12px] border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition" />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-muted mb-1">Page URL</label>
                  <input type="url" placeholder="https://…" value={editForm.page_url}
                    onChange={(e) => setEditForm((f) => ({ ...f, page_url: e.target.value }))}
                    className="w-full px-2.5 py-1.5 text-[12px] border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition" />
                </div>
              </div>
              {error && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
              <button type="submit" disabled={savingEdit}
                className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-white text-[13px] font-medium rounded-lg transition disabled:opacity-60">
                {savingEdit && <Loader2 size={13} className="animate-spin" />}
                {savingEdit ? "Saving…" : "Save Changes"}
              </button>
            </form>
          )}

          {/* Attachments */}
          {localTicket.attachments && localTicket.attachments.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-5 mb-4">
              <h2 className="text-[13px] font-semibold text-foreground mb-4">Attachments</h2>
              <div className="space-y-2">
                {localTicket.attachments.map((att, i) => {
                  const isImage = att.type.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(att.name);
                  return isImage ? (
                    <a key={i} href={att.url} target="_blank" rel="noopener noreferrer" className="block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={att.url}
                        alt={att.name}
                        className="max-w-full rounded-lg border border-border object-contain hover:opacity-90 transition"
                      />
                    </a>
                  ) : (
                    <a
                      key={i}
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={att.name}
                      className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-border rounded-lg text-[12px] text-muted hover:text-accent hover:border-accent/40 transition w-fit"
                    >
                      <Paperclip size={12} />
                      <span className="truncate max-w-[240px]">{att.name}</span>
                      <span className="text-[11px] opacity-60 ml-1">{(att.size / 1024).toFixed(0)} KB</span>
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {/* Activity */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-[13px] font-semibold text-foreground mb-4">Activity</h2>
            {localUpdates.length === 0 ? (
              <p className="text-[13px] text-muted text-center py-6">No activity yet.</p>
            ) : (
              <div className="space-y-4">
                {localUpdates.map((u) => (
                  <div key={u.id} className={`flex gap-3 ${u.author_type === "client" ? "pl-4" : ""}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-semibold ${
                      u.author_type === "team" ? "bg-accent/15 text-accent" : "bg-blue-100 text-blue-700"
                    }`}>
                      {u.author_name[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[12px] font-medium text-foreground">
                          {u.author_name === currentClient.name ? "You" : u.author_name}
                        </span>
                        {u.author_type === "team" && (
                          <span className="text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded font-medium">Team</span>
                        )}
                        {u.author_type === "client" && u.author_name !== currentClient.name && (
                          <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium">Client</span>
                        )}
                        <span className="text-[11px] text-muted">{formatISTShort(u.created_at)}</span>
                      </div>
                      <p className={`text-[13px] text-foreground leading-relaxed whitespace-pre-wrap rounded-lg px-3 py-2 ${
                        u.author_type === "team" ? "bg-gray-50/60" : "bg-blue-50 border border-blue-100"
                      }`}>
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
              {localTicket.page_url && (
                <div>
                  <dt className="text-muted text-[11px] mb-0.5">Page URL</dt>
                  <dd>
                    <a
                      href={localTicket.page_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[12px] text-accent hover:underline break-all"
                    >
                      {localTicket.page_url}
                    </a>
                  </dd>
                </div>
              )}
              {localTicket.due_date && (
                <div>
                  <dt className="text-muted text-[11px] mb-0.5">Due Date</dt>
                  <dd className={`text-[12px] font-medium ${new Date(localTicket.due_date) < new Date() && localTicket.status !== "done" ? "text-red-500" : "text-foreground"}`}>
                    {formatDate(localTicket.due_date)}
                  </dd>
                </div>
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

              <div>
                <label className="block text-[11px] text-muted mb-1">Due Date</label>
                <input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-[12px] border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition"
                />
              </div>

              <button
                onClick={handleAdminUpdate}
                disabled={submitting || (newStatus === localTicket.status && newAssigneeId === (localTicket.assignee_id ?? "") && newDueDate === (localTicket.due_date ?? ""))}
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
