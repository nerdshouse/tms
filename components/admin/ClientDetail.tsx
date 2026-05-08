"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, Plus, Trash2, Mail, Building2, UserCheck } from "lucide-react";
import { useIsDemo } from "@/lib/demo-context";
import Sheet from "@/components/ui/Sheet";
import AddProjectSheet from "@/components/admin/AddProjectSheet";
import { StatusIcon } from "@/components/ui/StatusIcon";
import { PriorityBadge, TypeBadge } from "@/components/ui/Badges";
import { formatIST } from "@/lib/utils";
import { useRealtime } from "@/lib/use-realtime";
import type { Client, Project, Ticket, TeamMember } from "@/types";

interface Props {
  client: Client;
  projects: Project[];
  tickets: Ticket[];
  teamMembers: TeamMember[];
}

export default function ClientDetail({ client, projects: initialProjects, tickets, teamMembers }: Props) {
  const [projects, setProjects]             = useState(initialProjects);
  const [addProjectOpen, setAddProjectOpen] = useState(false);
  const [removingId, setRemovingId]         = useState<string | null>(null);
  const [pocId, setPocId]                   = useState(client.poc_id ?? "");
  const [savingPoc, setSavingPoc]           = useState(false);
  const isDemo = useIsDemo();

  // ── Realtime: projects scoped to this client ──────────────────────────────
  useRealtime<Project>({
    table: "projects",
    filter: { column: "client_id", value: client.id },
    disabled: isDemo,
    onInsert: (row) => setProjects((prev) => prev.some((p) => p.id === row.id) ? prev : [...prev, row]),
    onUpdate: (row) => setProjects((prev) => prev.map((p) => p.id === row.id ? { ...p, ...row } : p)),
    onDelete: (row) => setProjects((prev) => prev.filter((p) => p.id !== row.id)),
  });

  // onSnapshot handles state; just close the sheet
  function handleProjectAdded() {
    setAddProjectOpen(false);
  }

  async function removeProject(id: string) {
    setRemovingId(id);
    if (!isDemo) {
      await fetch(`/api/projects/${id}`, { method: "DELETE" });
      // onSnapshot will remove it from state
    }
    setRemovingId(null);
  }

  async function savePoc(value: string) {
    setSavingPoc(true);
    if (!isDemo) {
      await fetch(`/api/clients/${client.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ poc_id: value || null }),
      });
    }
    setPocId(value);
    setSavingPoc(false);
  }

  const poc = teamMembers.find((m) => m.id === pocId);

  return (
    <div className="p-6">
      <Link href="/admin/clients" className="inline-flex items-center gap-1 text-[13px] text-muted hover:text-foreground mb-5 transition-colors">
        <ChevronLeft size={14} />
        Back to Clients
      </Link>

      <div className="flex gap-6">
        {/* Main */}
        <div className="flex-1 min-w-0 space-y-5">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
              <h2 className="text-[13px] font-semibold text-foreground">Tickets ({tickets.length})</h2>
              <Link href={`/?client=${client.id}`} className="text-[12px] text-accent hover:underline">View all →</Link>
            </div>
            {tickets.length === 0 ? (
              <p className="text-[13px] text-muted text-center py-10">No tickets yet.</p>
            ) : (
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-border bg-gray-50/60">
                    <th className="text-left px-4 py-2.5 font-medium text-muted text-[11px] uppercase tracking-wide">Title</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted text-[11px] uppercase tracking-wide w-20">Type</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted text-[11px] uppercase tracking-wide w-16">Priority</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted text-[11px] uppercase tracking-wide w-28">Status</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted text-[11px] uppercase tracking-wide w-28">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.slice(0, 10).map((t) => (
                    <tr key={t.id} className="border-b border-border last:border-0 hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/tickets/${t.id}`} className="font-medium text-foreground hover:text-accent transition-colors line-clamp-1">{t.title}</Link>
                        {t.projects && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: t.projects.color }} />
                            <span className="text-[11px] text-muted">{t.projects.name}</span>
                          </div>
                        )}
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
        </div>

        {/* Sidebar */}
        <div className="w-60 flex-shrink-0 space-y-4">
          {/* Client info */}
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-accent/15 flex items-center justify-center flex-shrink-0">
                <span className="text-accent font-semibold">{client.name[0]?.toUpperCase()}</span>
              </div>
              <div>
                <p className="text-[13px] font-semibold text-foreground">{client.name}</p>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${
                  client.status === "active" ? "bg-green-50 text-green-700 border-green-100" : "bg-gray-100 text-gray-500 border-gray-200"
                }`}>{client.status}</span>
              </div>
            </div>
            <div className="space-y-2 text-[12px]">
              <div className="flex items-center gap-2 text-muted">
                <Building2 size={12} />
                <span>{client.company || "—"}</span>
              </div>
              <div className="flex items-center gap-2 text-muted">
                <Mail size={12} />
                <a href={`mailto:${client.email}`} className="hover:text-accent transition-colors">{client.email}</a>
              </div>
            </div>
          </div>

          {/* POC assignment */}
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <UserCheck size={13} className="text-muted" />
              <h3 className="text-[11px] font-semibold text-muted uppercase tracking-wider">Point of Contact</h3>
            </div>
            {poc && (
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-accent/15 flex items-center justify-center text-[10px] font-semibold text-accent flex-shrink-0">
                  {poc.avatar_initials}
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-medium text-foreground truncate">{poc.name}</p>
                  <p className="text-[11px] text-muted truncate">{poc.email}</p>
                </div>
              </div>
            )}
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
          </div>

          {/* Projects */}
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[11px] font-semibold text-muted uppercase tracking-wider">Projects</h3>
              <button onClick={() => setAddProjectOpen(true)} className="text-muted hover:text-accent transition-colors">
                <Plus size={13} />
              </button>
            </div>
            {projects.length === 0 ? (
              <p className="text-[12px] text-muted/60 italic">No projects</p>
            ) : (
              <ul className="space-y-1.5">
                {projects.map((p) => (
                  <li key={p.id} className="flex items-center gap-2 group">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                    <div className="flex-1 min-w-0">
                      <span className="text-[12px] text-foreground truncate block">{p.name}</span>
                      {p.description && (
                        <span className="text-[11px] text-muted truncate block">{p.description}</span>
                      )}
                    </div>
                    <button
                      onClick={() => removeProject(p.id)}
                      disabled={removingId === p.id}
                      className="opacity-0 group-hover:opacity-100 text-muted hover:text-red-500 transition-all"
                    >
                      <Trash2 size={11} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <Sheet open={addProjectOpen} onClose={() => setAddProjectOpen(false)} title="Add Project">
        <AddProjectSheet client={client} onSuccess={handleProjectAdded} onClose={() => setAddProjectOpen(false)} />
      </Sheet>
    </div>
  );
}
