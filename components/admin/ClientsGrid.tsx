"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Building2, Ticket } from "lucide-react";
import Sheet from "@/components/ui/Sheet";
import AddClientSheet from "@/components/admin/AddClientSheet";
import AddProjectSheet from "@/components/admin/AddProjectSheet";
import { useRealtime } from "@/lib/use-realtime";
import { useIsDemo } from "@/lib/demo-context";
import type { Client, Project } from "@/types";

interface Props {
  clients: Client[];
  projects: Project[];
  ticketCounts: Record<string, number>;
}

export default function ClientsGrid({ clients: initial, projects: initialProjects, ticketCounts: initialCounts }: Props) {
  const [clients, setClients]             = useState(initial);
  const [projects, setProjects]           = useState(initialProjects);
  const [ticketCounts]                    = useState(initialCounts);
  const [addClientOpen, setAddClientOpen] = useState(false);
  const [addProjectFor, setAddProjectFor] = useState<Client | null>(null);
  const isDemo = useIsDemo();

  // ── Realtime: clients collection ─────────────────────────────────────────
  useRealtime<Client>({
    table: "clients",
    disabled: isDemo,
    onInsert: (row) => setClients((prev) => prev.some((c) => c.id === row.id) ? prev : [row, ...prev]),
    onUpdate: (row) => setClients((prev) => prev.map((c) => c.id === row.id ? { ...c, ...row } : c)),
    onDelete: (row) => setClients((prev) => prev.filter((c) => c.id !== row.id)),
  });

  // ── Realtime: projects (all, admin view) ──────────────────────────────────
  useRealtime<Project>({
    table: "projects",
    disabled: isDemo,
    onInsert: (row) => setProjects((prev) => prev.some((p) => p.id === row.id) ? prev : [...prev, row]),
    onUpdate: (row) => setProjects((prev) => prev.map((p) => p.id === row.id ? { ...p, ...row } : p)),
    onDelete: (row) => setProjects((prev) => prev.filter((p) => p.id !== row.id)),
  });

  function handleClientAdded(client: Client) {
    setClients((prev) => [client, ...prev]);
    setAddClientOpen(false);
  }

  // onSnapshot handles state update; just close the sheet
  function handleProjectAdded() {
    setAddProjectFor(null);
  }

  const projectsForClient = (clientId: string) =>
    projects.filter((p) => p.client_id === clientId);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[17px] font-semibold text-foreground">Clients</h1>
          <p className="text-xs text-muted mt-0.5">{clients.length} clients</p>
        </div>
        <button
          onClick={() => setAddClientOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2 bg-accent hover:bg-accent-hover text-white text-[13px] font-medium rounded-lg transition"
        >
          <Plus size={14} />
          Add Client
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {clients.map((client) => {
          const clientProjects = projectsForClient(client.id);
          const count = ticketCounts[client.id] ?? 0;
          return (
            <div key={client.id} className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3">
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-accent/15 flex items-center justify-center flex-shrink-0">
                    <span className="text-accent text-sm font-semibold">
                      {client.name[0]?.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-foreground leading-tight">{client.name}</p>
                    <p className="text-[11px] text-muted">{client.company}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                  client.status === "active"
                    ? "bg-green-50 text-green-700 border-green-100"
                    : "bg-gray-100 text-gray-500 border-gray-200"
                }`}>
                  {client.status}
                </span>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 text-[12px] text-muted">
                <span className="flex items-center gap-1">
                  <Ticket size={12} />
                  {count} ticket{count !== 1 ? "s" : ""}
                </span>
                <span className="flex items-center gap-1">
                  <Building2 size={12} />
                  {clientProjects.length} project{clientProjects.length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Projects */}
              <div className="space-y-1">
                {clientProjects.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 text-[12px] text-muted">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                    {p.name}
                  </div>
                ))}
                {clientProjects.length === 0 && (
                  <p className="text-[11px] text-muted/60 italic">No projects yet</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1 mt-auto border-t border-border">
                <button
                  onClick={() => setAddProjectFor(client)}
                  className="flex items-center gap-1 text-[12px] text-muted hover:text-accent transition-colors"
                >
                  <Plus size={12} /> Project
                </button>
                <Link
                  href={`/admin/clients/${client.id}`}
                  className="ml-auto text-[12px] text-accent hover:underline"
                >
                  View →
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      <Sheet open={addClientOpen} onClose={() => setAddClientOpen(false)} title="Add Client">
        <AddClientSheet onSuccess={handleClientAdded} onClose={() => setAddClientOpen(false)} />
      </Sheet>

      <Sheet open={!!addProjectFor} onClose={() => setAddProjectFor(null)} title="Add Project">
        {addProjectFor && (
          <AddProjectSheet
            client={addProjectFor}
            onSuccess={handleProjectAdded}
            onClose={() => setAddProjectFor(null)}
          />
        )}
      </Sheet>
    </div>
  );
}
