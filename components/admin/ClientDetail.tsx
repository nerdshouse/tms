"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Plus, Trash2, Mail, UserCheck, Users, X, Loader2, Pencil, AlertTriangle } from "lucide-react";
import Sheet from "@/components/ui/Sheet";
import AddProjectSheet from "@/components/admin/AddProjectSheet";
import { StatusIcon } from "@/components/ui/StatusIcon";
import { PriorityBadge, TypeBadge } from "@/components/ui/Badges";
import { formatIST } from "@/lib/utils";
import { useRealtime } from "@/lib/use-realtime";
import type { Client, Project, Ticket, TeamMember, ClientContact, Status, Priority } from "@/types";

type TabId = "overview" | "tickets" | "projects" | "team" | "analytics";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview",  label: "Overview" },
  { id: "tickets",   label: "Tickets" },
  { id: "projects",  label: "Projects" },
  { id: "team",      label: "Team" },
  { id: "analytics", label: "Analytics" },
];

const STATUS_LABELS: Record<Status, string> = {
  open: "Open", in_progress: "In Progress", review: "In Review", done: "Done",
};
const STATUS_COLORS: Record<Status, string> = {
  open: "bg-gray-400", in_progress: "bg-amber-400", review: "bg-blue-400", done: "bg-green-500",
};
const PRIORITY_COLORS: Record<Priority, string> = {
  P0: "bg-red-500", P1: "bg-amber-400", P2: "bg-blue-400",
};
const PRIORITY_TEXT: Record<Priority, string> = {
  P0: "text-red-600 bg-red-50", P1: "text-amber-600 bg-amber-50", P2: "text-blue-600 bg-blue-50",
};

interface Props {
  client: Client;
  projects: Project[];
  tickets: Ticket[];
  teamMembers: TeamMember[];
  contacts: ClientContact[];
  isFullAdmin?: boolean;
}

export default function ClientDetail({
  client,
  projects: initialProjects,
  tickets,
  teamMembers,
  contacts: initialContacts,
  isFullAdmin = true,
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab]   = useState<TabId>("overview");
  const [addProjectOpen, setAddProjectOpen] = useState(false);

  // Edit client
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: client.name, company: client.company, status: client.status });
  const [saving, setSaving]     = useState(false);
  const [localClient, setLocalClient] = useState({ name: client.name, company: client.company, status: client.status });

  // Delete client
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting]           = useState(false);

  // Projects (realtime)
  const [projects, setProjects]               = useState(initialProjects);
  const [removingProjectId, setRemovingProjectId] = useState<string | null>(null);

  // POC
  const [pocId, setPocId]     = useState(client.poc_id ?? "");
  const [savingPoc, setSavingPoc] = useState(false);

  // Assigned members
  const [assignedMemberIds, setAssignedMemberIds] = useState<string[]>(client.assigned_members ?? []);
  const [savingAssigned, setSavingAssigned] = useState(false);

  // Contacts
  const [contacts, setContacts]           = useState(initialContacts);
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactName, setContactName]     = useState("");
  const [contactEmail, setContactEmail]   = useState("");
  const [addingContact, setAddingContact] = useState(false);
  const [contactError, setContactError]   = useState("");
  const [removingContactId, setRemovingContactId] = useState<string | null>(null);

  // ── Realtime: projects ────────────────────────────────────────────────────
  useRealtime<Project>({
    table: "projects",
    filter: { column: "client_id", value: client.id },
    onInsert: (row) => setProjects((prev) => prev.some((p) => p.id === row.id) ? prev : [...prev, row]),
    onUpdate: (row) => setProjects((prev) => prev.map((p) => p.id === row.id ? { ...p, ...row } : p)),
    onDelete: (row) => setProjects((prev) => prev.filter((p) => p.id !== row.id)),
  });

  // ── Computed stats ────────────────────────────────────────────────────────
  const ticketStats = useMemo(() => {
    const byStatus: Record<Status, number> = { open: 0, in_progress: 0, review: 0, done: 0 };
    const byPriority: Record<Priority, number> = { P0: 0, P1: 0, P2: 0 };
    tickets.forEach((t) => {
      byStatus[t.status]++;
      byPriority[t.priority]++;
    });
    return { byStatus, byPriority, total: tickets.length };
  }, [tickets]);

  const projectStats = useMemo(() => {
    const map: Record<string, Record<Status, number>> = {};
    tickets.forEach((t) => {
      if (!t.project_id) return;
      if (!map[t.project_id]) map[t.project_id] = { open: 0, in_progress: 0, review: 0, done: 0 };
      map[t.project_id][t.status]++;
    });
    return map;
  }, [tickets]);

  const poc = teamMembers.find((m) => m.id === pocId) ?? null;

  // ── Handlers ──────────────────────────────────────────────────────────────
  async function savePoc(value: string) {
    setSavingPoc(true);
    await fetch(`/api/clients/${client.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ poc_id: value || null }),
    });
    setPocId(value);
    setSavingPoc(false);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch(`/api/clients/${client.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    setLocalClient({ ...editForm });
    setSaving(false);
    setEditOpen(false);
  }

  async function deleteClient() {
    setDeleting(true);
    await fetch(`/api/clients/${client.id}`, { method: "DELETE" });
    router.push("/admin/clients");
  }

  async function saveAssignedMembers(ids: string[]) {
    setSavingAssigned(true);
    await fetch(`/api/clients/${client.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assigned_members: ids }),
    });
    setAssignedMemberIds(ids);
    setSavingAssigned(false);
  }

  function handleProjectAdded(project: Project) {
    setProjects((prev) => prev.some((p) => p.id === project.id) ? prev : [...prev, project]);
    setAddProjectOpen(false);
  }

  async function removeProject(id: string) {
    setRemovingProjectId(id);
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    setRemovingProjectId(null);
  }

  async function addContact(e: React.FormEvent) {
    e.preventDefault();
    setAddingContact(true);
    setContactError("");
    try {
      const res = await fetch(`/api/clients/${client.id}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: contactName, email: contactEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to add");
      setContacts((prev) => [data, ...prev]);
      setContactName("");
      setContactEmail("");
      setShowContactForm(false);
    } catch (err: unknown) {
      setContactError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setAddingContact(false);
    }
  }

  async function removeContact(id: string) {
    setRemovingContactId(id);
    await fetch(`/api/clients/${client.id}/contacts/${id}`, { method: "DELETE" });
    setContacts((prev) => prev.filter((c) => c.id !== id));
    setRemovingContactId(null);
  }

  return (
    <div className="p-6">
      {/* Back */}
      <Link
        href="/admin/clients"
        className="inline-flex items-center gap-1 text-[13px] text-muted hover:text-foreground mb-4 transition-colors"
      >
        <ChevronLeft size={14} /> Back to Clients
      </Link>

      {/* Client header */}
      <div className="flex items-center gap-4 mb-5">
        <div className="w-11 h-11 rounded-full bg-accent/15 flex items-center justify-center flex-shrink-0">
          <span className="text-accent text-lg font-semibold">{localClient.name[0]?.toUpperCase()}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-[17px] font-semibold text-foreground">{localClient.name}</h1>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
              localClient.status === "active"
                ? "bg-green-50 text-green-700 border-green-100"
                : "bg-gray-100 text-gray-500 border-gray-200"
            }`}>{localClient.status}</span>
          </div>
          <p className="text-[12px] text-muted truncate">{localClient.company}{localClient.company && " · "}{client.email}</p>
        </div>
        {isFullAdmin && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => { setEditForm({ name: localClient.name, company: localClient.company, status: localClient.status }); setEditOpen(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-muted border border-border rounded-lg hover:bg-gray-50 hover:text-foreground transition"
            >
              <Pencil size={12} /> Edit
            </button>
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition"
              >
                <Trash2 size={12} /> Delete
              </button>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle size={12} className="text-red-600" />
                <span className="text-[12px] text-red-700 font-medium">Confirm?</span>
                <button
                  onClick={deleteClient}
                  disabled={deleting}
                  className="text-[12px] font-semibold text-red-600 hover:text-red-800 disabled:opacity-50"
                >
                  {deleting ? "Deleting…" : "Yes, delete"}
                </button>
                <button onClick={() => setConfirmDelete(false)} className="text-[12px] text-muted hover:text-foreground">Cancel</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5 w-fit mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-1.5 rounded-md text-[12px] font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-white text-foreground shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Overview ────────────────────────────────────────────────── */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-3 gap-5">
          {/* Left: status summary + projects list */}
          <div className="col-span-2 space-y-4">
            {/* Ticket status bars */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="text-[13px] font-semibold text-foreground mb-4">
                Ticket Summary · {ticketStats.total} total
              </h2>
              <div className="space-y-3">
                {(["open", "in_progress", "review", "done"] as Status[]).map((s) => {
                  const count = ticketStats.byStatus[s];
                  const pct = ticketStats.total ? Math.round((count / ticketStats.total) * 100) : 0;
                  return (
                    <div key={s}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[12px] text-muted">{STATUS_LABELS[s]}</span>
                        <span className="text-[12px] font-medium text-foreground">{count}</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
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

            {/* Projects overview */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
                <h2 className="text-[13px] font-semibold text-foreground">Projects ({projects.length})</h2>
                {isFullAdmin && (
                  <button
                    onClick={() => setAddProjectOpen(true)}
                    className="flex items-center gap-1 text-[12px] text-muted hover:text-accent transition-colors"
                  >
                    <Plus size={12} /> Add
                  </button>
                )}
              </div>
              {projects.length === 0 ? (
                <p className="text-[13px] text-muted text-center py-8">No projects yet.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {projects.map((p) => {
                    const stats = projectStats[p.id] ?? { open: 0, in_progress: 0, review: 0, done: 0 };
                    const total = Object.values(stats).reduce((a, b) => a + b, 0);
                    return (
                      <li key={p.id} className="flex items-center gap-3 px-5 py-3 group hover:bg-gray-50/50 transition-colors">
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-foreground truncate">{p.name}</p>
                          {p.description && <p className="text-[11px] text-muted truncate">{p.description}</p>}
                        </div>
                        <span className="text-[11px] text-muted">{total} ticket{total !== 1 ? "s" : ""}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* Right: client info + POC */}
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-3">Client Details</h3>
              <dl className="space-y-2.5 text-[12px]">
                <div>
                  <dt className="text-muted text-[11px] mb-0.5">Name</dt>
                  <dd className="font-medium text-foreground">{localClient.name}</dd>
                </div>
                <div>
                  <dt className="text-muted text-[11px] mb-0.5">Company</dt>
                  <dd className="text-foreground">{localClient.company || "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted text-[11px] mb-0.5">Email</dt>
                  <dd>
                    <a href={`mailto:${client.email}`} className="text-accent hover:underline">{client.email}</a>
                  </dd>
                </div>
                <div>
                  <dt className="text-muted text-[11px] mb-0.5">Status</dt>
                  <dd>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                      localClient.status === "active"
                        ? "bg-green-50 text-green-700 border-green-100"
                        : "bg-gray-100 text-gray-500 border-gray-200"
                    }`}>{localClient.status}</span>
                  </dd>
                </div>
                <div>
                  <dt className="text-muted text-[11px] mb-0.5">Joined</dt>
                  <dd className="text-muted">{formatIST(client.created_at)}</dd>
                </div>
              </dl>
            </div>

            {/* POC */}
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-1.5 mb-3">
                <UserCheck size={13} className="text-muted" />
                <h3 className="text-[11px] font-semibold text-muted uppercase tracking-wider">Point of Contact</h3>
              </div>
              {poc && (
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="w-7 h-7 rounded-full bg-accent/15 flex items-center justify-center text-[10px] font-semibold text-accent flex-shrink-0">
                    {poc.avatar_initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12px] font-medium text-foreground truncate">{poc.name}</p>
                    <p className="text-[11px] text-muted truncate">{poc.email}</p>
                  </div>
                </div>
              )}
              {isFullAdmin ? (
                <select
                  value={pocId}
                  onChange={(e) => savePoc(e.target.value)}
                  disabled={savingPoc}
                  className="w-full px-2.5 py-1.5 text-[12px] border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition disabled:opacity-60"
                >
                  <option value="">— No POC —</option>
                  {teamMembers.filter((m) => m.status === "active").map((m) => (
                    <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
                  ))}
                </select>
              ) : (
                !poc && <p className="text-[12px] text-muted">No POC assigned</p>
              )}
            </div>

            {/* Assigned Team Members — full admin only */}
            {isFullAdmin && (
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-1.5 mb-3">
                  <Users size={13} className="text-muted" />
                  <h3 className="text-[11px] font-semibold text-muted uppercase tracking-wider">Assigned Members</h3>
                  {savingAssigned && <Loader2 size={11} className="animate-spin text-muted ml-auto" />}
                </div>

                {/* Chips for assigned members */}
                {assignedMemberIds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {assignedMemberIds.map((mid) => {
                      const m = teamMembers.find((tm) => tm.id === mid);
                      if (!m) return null;
                      return (
                        <span key={mid} className="inline-flex items-center gap-1 text-[11px] font-medium bg-accent/10 text-accent px-2 py-0.5 rounded-full">
                          {m.name}
                          <button
                            onClick={() => saveAssignedMembers(assignedMemberIds.filter((id) => id !== mid))}
                            disabled={savingAssigned}
                            className="hover:text-accent/70 transition-colors disabled:opacity-40"
                          >
                            <X size={10} />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Dropdown to add a member */}
                <select
                  value=""
                  onChange={(e) => {
                    if (!e.target.value) return;
                    if (!assignedMemberIds.includes(e.target.value)) {
                      saveAssignedMembers([...assignedMemberIds, e.target.value]);
                    }
                  }}
                  disabled={savingAssigned}
                  className="w-full px-2.5 py-1.5 text-[12px] border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition disabled:opacity-60"
                >
                  <option value="">+ Add member…</option>
                  {teamMembers
                    .filter((m) => m.status === "active" && !assignedMemberIds.includes(m.id))
                    .map((m) => (
                      <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
                    ))}
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Tickets ─────────────────────────────────────────────────── */}
      {activeTab === "tickets" && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {tickets.length === 0 ? (
            <p className="text-[13px] text-muted text-center py-12">No tickets for this client.</p>
          ) : (
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border bg-gray-50/60">
                  <th className="text-left px-4 py-2.5 font-medium text-muted text-[11px] uppercase tracking-wide w-24">ID</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted text-[11px] uppercase tracking-wide">Title</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted text-[11px] uppercase tracking-wide w-28">Project</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted text-[11px] uppercase tracking-wide w-20">Type</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted text-[11px] uppercase tracking-wide w-16">Priority</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted text-[11px] uppercase tracking-wide w-28">Status</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted text-[11px] uppercase tracking-wide w-28">Updated</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t, i) => (
                  <tr
                    key={t.id}
                    onClick={() => router.push(`/tickets/${t.id}`)}
                    className={`border-b border-border last:border-0 hover:bg-gray-50/50 transition-colors cursor-pointer ${i % 2 !== 0 ? "bg-gray-50/20" : ""}`}
                  >
                    <td className="px-4 py-3 font-mono text-[11px] text-muted">#{t.id.slice(0, 8)}</td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-foreground line-clamp-1">{t.title}</span>
                    </td>
                    <td className="px-4 py-3">
                      {t.projects ? (
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: t.projects.color }} />
                          <span className="text-[12px] text-foreground truncate max-w-[90px]">{t.projects.name}</span>
                        </div>
                      ) : <span className="text-muted">—</span>}
                    </td>
                    <td className="px-4 py-3"><TypeBadge type={t.type} /></td>
                    <td className="px-4 py-3"><PriorityBadge priority={t.priority} /></td>
                    <td className="px-4 py-3"><StatusIcon status={t.status} showLabel /></td>
                    <td className="px-4 py-3 text-muted whitespace-nowrap">{formatIST(t.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Tab: Projects ────────────────────────────────────────────────── */}
      {activeTab === "projects" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-[13px] text-muted">{projects.length} project{projects.length !== 1 ? "s" : ""}</p>
            {isFullAdmin && (
              <button
                onClick={() => setAddProjectOpen(true)}
                className="flex items-center gap-2 px-3.5 py-2 bg-accent hover:bg-accent-hover text-white text-[13px] font-medium rounded-lg transition"
              >
                <Plus size={14} /> Add Project
              </button>
            )}
          </div>
          {projects.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-12 text-center">
              <p className="text-[13px] text-muted">No projects yet. Add one to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {projects.map((p) => {
                const stats = projectStats[p.id] ?? { open: 0, in_progress: 0, review: 0, done: 0 };
                const total = Object.values(stats).reduce((a, b) => a + b, 0);
                const donePct = total ? Math.round((stats.done / total) * 100) : 0;
                return (
                  <div key={p.id} className="bg-card border border-border rounded-xl p-5 group">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${p.color}22` }}
                        >
                          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: p.color }} />
                        </div>
                        <div>
                          <p className="text-[13px] font-semibold text-foreground">{p.name}</p>
                          {p.description && <p className="text-[11px] text-muted">{p.description}</p>}
                        </div>
                      </div>
                      {isFullAdmin && (
                        <button
                          onClick={() => removeProject(p.id)}
                          disabled={removingProjectId === p.id}
                          className="opacity-0 group-hover:opacity-100 text-muted hover:text-red-500 transition-all disabled:opacity-40"
                        >
                          {removingProjectId === p.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                        </button>
                      )}
                    </div>

                    {/* Status grid */}
                    <div className="grid grid-cols-4 gap-2 mb-3">
                      {(["open", "in_progress", "review", "done"] as Status[]).map((s) => (
                        <div key={s} className="text-center">
                          <p className="text-[16px] font-semibold text-foreground">{stats[s]}</p>
                          <p className="text-[10px] text-muted">{STATUS_LABELS[s]}</p>
                        </div>
                      ))}
                    </div>

                    {/* Progress bar */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] text-muted">Progress</span>
                        <span className="text-[11px] font-medium text-foreground">{donePct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-green-500 transition-all"
                          style={{ width: `${donePct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Team ────────────────────────────────────────────────────── */}
      {activeTab === "team" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-[13px] text-muted">{contacts.length + 1} member{contacts.length !== 0 ? "s" : ""}</p>
            {isFullAdmin && (
              <button
                onClick={() => { setShowContactForm((v) => !v); setContactError(""); }}
                className="flex items-center gap-2 px-3.5 py-2 bg-accent hover:bg-accent-hover text-white text-[13px] font-medium rounded-lg transition"
              >
                <Plus size={14} /> Add Member
              </button>
            )}
          </div>

          {/* Inline add form */}
          {showContactForm && (
            <form onSubmit={addContact} className="bg-card border border-border rounded-xl p-5 mb-4 space-y-3">
              <h3 className="text-[13px] font-semibold text-foreground">Invite a team member</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-muted mb-1">Name *</label>
                  <input
                    type="text"
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full px-3 py-2 text-[13px] border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-muted mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="jane@example.com"
                    className="w-full px-3 py-2 text-[13px] border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition"
                  />
                </div>
              </div>
              {contactError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{contactError}</p>
              )}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={addingContact}
                  className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-white text-[13px] font-medium rounded-lg transition disabled:opacity-60"
                >
                  {addingContact ? <Loader2 size={13} className="animate-spin" /> : <Mail size={13} />}
                  {addingContact ? "Sending…" : "Send Invite"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowContactForm(false)}
                  className="px-4 py-2 text-[13px] text-muted border border-border rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border bg-gray-50/60">
                  <th className="text-left px-4 py-2.5 font-medium text-muted text-[11px] uppercase tracking-wide">Name</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted text-[11px] uppercase tracking-wide w-24">Role</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted text-[11px] uppercase tracking-wide">Email</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted text-[11px] uppercase tracking-wide w-20">Status</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {/* Primary account */}
                <tr className="border-b border-border hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-accent/15 flex items-center justify-center text-[11px] font-semibold text-accent flex-shrink-0">
                        {client.name[0]?.toUpperCase()}
                      </div>
                      <span className="font-medium text-foreground">{client.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[11px] font-medium text-accent bg-accent/10 px-2 py-0.5 rounded">Primary</span>
                  </td>
                  <td className="px-4 py-3 text-muted">{client.email}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                      client.status === "active"
                        ? "bg-green-50 text-green-700 border-green-100"
                        : "bg-gray-100 text-gray-500 border-gray-200"
                    }`}>{client.status}</span>
                  </td>
                  <td className="px-4 py-3" />
                </tr>

                {/* Contacts */}
                {contacts.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-gray-50/50 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-[11px] font-semibold text-gray-600 flex-shrink-0">
                          {c.name[0]?.toUpperCase()}
                        </div>
                        <span className="font-medium text-foreground">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] text-muted">Member</span>
                    </td>
                    <td className="px-4 py-3 text-muted">{c.email}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        c.status === "active"
                          ? "bg-green-50 text-green-700 border-green-100"
                          : "bg-amber-50 text-amber-700 border-amber-100"
                      }`}>{c.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      {isFullAdmin && (
                        <button
                          onClick={() => removeContact(c.id)}
                          disabled={removingContactId === c.id}
                          className="opacity-0 group-hover:opacity-100 text-muted hover:text-red-500 transition-all disabled:opacity-40"
                        >
                          {removingContactId === c.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}

                {contacts.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted text-[13px]">
                      No team members invited yet. Use &ldquo;Add Member&rdquo; to invite colleagues.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Tab: Analytics ───────────────────────────────────────────────── */}
      {activeTab === "analytics" && (
        <div className="space-y-5">
          {/* Stat cards */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "Total Tickets",   value: ticketStats.total,                  color: "text-foreground" },
              { label: "Open",            value: ticketStats.byStatus.open,           color: "text-gray-600" },
              { label: "Done",            value: ticketStats.byStatus.done,           color: "text-green-600" },
              { label: "Projects",        value: projects.length,                     color: "text-accent" },
            ].map((card) => (
              <div key={card.label} className="bg-card border border-border rounded-xl p-4">
                <p className="text-[11px] text-muted uppercase tracking-wider font-medium mb-2">{card.label}</p>
                <p className={`text-[28px] font-semibold ${card.color}`}>{card.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* By status */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="text-[13px] font-semibold text-foreground mb-4">By Status</h2>
              <div className="space-y-3">
                {(["open", "in_progress", "review", "done"] as Status[]).map((s) => {
                  const count = ticketStats.byStatus[s];
                  const pct = ticketStats.total ? Math.round((count / ticketStats.total) * 100) : 0;
                  return (
                    <div key={s}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[12px] text-muted">{STATUS_LABELS[s]}</span>
                        <span className="text-[12px] font-medium text-foreground">{count}</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div className={`h-full rounded-full ${STATUS_COLORS[s]}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* By priority */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="text-[13px] font-semibold text-foreground mb-4">By Priority</h2>
              <div className="space-y-3">
                {(["P0", "P1", "P2"] as Priority[]).map((p) => {
                  const count = ticketStats.byPriority[p];
                  const pct = ticketStats.total ? Math.round((count / ticketStats.total) * 100) : 0;
                  return (
                    <div key={p}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${PRIORITY_TEXT[p]}`}>{p}</span>
                        <span className="text-[12px] font-medium text-foreground">{count}</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div className={`h-full rounded-full ${PRIORITY_COLORS[p]}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      <Sheet open={addProjectOpen} onClose={() => setAddProjectOpen(false)} title="Add Project">
        <AddProjectSheet client={client} onSuccess={handleProjectAdded} onClose={() => setAddProjectOpen(false)} />
      </Sheet>

      {/* Edit client sheet */}
      <Sheet open={editOpen} onClose={() => setEditOpen(false)} title="Edit Client">
        <form onSubmit={saveEdit} className="space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-foreground mb-1.5">Full name <span className="text-red-500">*</span></label>
            <input
              type="text" required
              value={editForm.name}
              onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-2 text-[13px] border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition"
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-foreground mb-1.5">Company</label>
            <input
              type="text"
              value={editForm.company}
              onChange={(e) => setEditForm((f) => ({ ...f, company: e.target.value }))}
              className="w-full px-3 py-2 text-[13px] border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition"
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-foreground mb-1.5">Status</label>
            <select
              value={editForm.status}
              onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value as import("@/types").ClientStatus }))}
              className="w-full px-3 py-2 text-[13px] border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-white text-[13px] font-medium rounded-lg transition disabled:opacity-60">
              {saving && <Loader2 size={13} className="animate-spin" />}
              {saving ? "Saving…" : "Save Changes"}
            </button>
            <button type="button" onClick={() => setEditOpen(false)} className="px-4 py-2 text-[13px] text-muted border border-border rounded-lg hover:bg-gray-50 transition">
              Cancel
            </button>
          </div>
        </form>
      </Sheet>
    </div>
  );
}
