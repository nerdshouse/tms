"use client";

import { useState } from "react";
import { Plus, Trash2, Pencil, Loader2 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import Sheet from "@/components/ui/Sheet";
import AddTeamMemberSheet from "@/components/admin/AddTeamMemberSheet";
import { useRealtime } from "@/lib/use-realtime";
import type { TeamMember, TeamRole } from "@/types";

interface Props { members: TeamMember[]; canInvite?: boolean; canRemove?: boolean }

const ROLE_COLORS: Record<TeamRole, string> = {
  Admin:     "#4a4fe0",
  Developer: "#16a34a",
  Designer:  "#db2777",
  QA:        "#ea580c",
};

export default function TeamPage({ members: initial, canInvite = false, canRemove = false }: Props) {
  const [members, setMembers]   = useState(initial);
  const [addOpen, setAddOpen]   = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [editMember, setEditMember] = useState<TeamMember | null>(null);
  const [editForm, setEditForm]     = useState({ name: "", email: "", role: "Developer" as TeamRole, status: "active" as import("@/types").MemberStatus });
  const [savingEdit, setSavingEdit] = useState(false);

  // ── Realtime: team_members ────────────────────────────────────────────────
  useRealtime<TeamMember>({
    table: "team_members",
    onInsert: (row) => setMembers((prev) => prev.some((m) => m.id === row.id) ? prev : [...prev, row]),
    onUpdate: (row) => setMembers((prev) => prev.map((m) => m.id === row.id ? { ...m, ...row } : m)),
    onDelete: (row) => setMembers((prev) => prev.filter((m) => m.id !== row.id)),
  });

  function handleAdded(m: TeamMember) {
    setMembers((prev) => prev.some((x) => x.id === m.id) ? prev : [...prev, m]);
    setAddOpen(false);
  }

  async function removeMember(id: string) {
    setRemovingId(id);
    await fetch(`/api/team-members/${id}`, { method: "DELETE" });
    setRemovingId(null);
  }

  function openEdit(m: TeamMember) {
    setEditMember(m);
    setEditForm({ name: m.name, email: m.email, role: m.role, status: m.status });
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editMember) return;
    setSavingEdit(true);
    const res = await fetch(`/api/team-members/${editMember.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    const data = await res.json();
    if (res.ok) {
      setMembers((prev) => prev.map((m) => m.id === editMember.id ? { ...m, ...data } : m));
      setEditMember(null);
    }
    setSavingEdit(false);
  }

  const chartData = members.map((m) => ({
    name: m.avatar_initials,
    fullName: m.name,
    tickets: m.open_ticket_count ?? 0,
    role: m.role,
  }));

  const active = members.filter((m) => m.status === "active").length;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[17px] font-semibold text-foreground">Team</h1>
          <p className="text-xs text-muted mt-0.5">{active} active · {members.length} total</p>
        </div>
        {canInvite && (
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-accent hover:bg-accent-hover text-white text-[13px] font-medium rounded-lg transition"
          >
            <Plus size={14} /> Invite Member
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">
        {/* Member table */}
        <div className="col-span-2 bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border bg-gray-50/60">
                <th className="text-left px-4 py-2.5 font-medium text-muted text-[11px] uppercase tracking-wide">Member</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted text-[11px] uppercase tracking-wide w-24">Role</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted text-[11px] uppercase tracking-wide w-28">Email</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted text-[11px] uppercase tracking-wide w-20">Open</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted text-[11px] uppercase tracking-wide w-20">Status</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-b border-border last:border-0 hover:bg-gray-50/50 transition-colors group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold text-white flex-shrink-0"
                        style={{ backgroundColor: ROLE_COLORS[m.role] }}>
                        {m.avatar_initials}
                      </div>
                      <span className="font-medium text-foreground">{m.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded border"
                      style={{ color: ROLE_COLORS[m.role], backgroundColor: `${ROLE_COLORS[m.role]}15`, borderColor: `${ROLE_COLORS[m.role]}30` }}>
                      {m.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted text-[12px] truncate max-w-[140px]">{m.email}</td>
                  <td className="px-4 py-3 text-muted">{m.open_ticket_count ?? 0}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                      m.status === "active" ? "bg-green-50 text-green-700 border-green-100" : "bg-gray-100 text-gray-500 border-gray-200"
                    }`}>{m.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      {canInvite && (
                        <button
                          onClick={() => openEdit(m)}
                          className="text-muted hover:text-accent transition-colors"
                          title="Edit"
                        >
                          <Pencil size={13} />
                        </button>
                      )}
                      {canRemove && (
                        <button
                          onClick={() => removeMember(m.id)}
                          disabled={removingId === m.id}
                          className="text-muted hover:text-red-500 transition-colors disabled:opacity-40"
                          title="Remove"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Workload chart */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-[13px] font-semibold text-foreground mb-4">Workload</h2>
          <p className="text-[11px] text-muted mb-3">Open tickets per member</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barSize={20} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0ee" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={30} tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-white border border-border rounded-lg px-3 py-2 text-[12px] shadow-sm">
                      <p className="font-medium text-foreground">{d.fullName}</p>
                      <p className="text-muted">{d.tickets} open ticket{d.tickets !== 1 ? "s" : ""}</p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="tickets" fill="#4a4fe0" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <Sheet open={addOpen} onClose={() => setAddOpen(false)} title="Invite Team Member">
        <AddTeamMemberSheet onSuccess={handleAdded} onClose={() => setAddOpen(false)} />
      </Sheet>

      <Sheet open={!!editMember} onClose={() => setEditMember(null)} title="Edit Team Member">
        <form onSubmit={saveEdit} className="space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-foreground mb-1.5">Full name <span className="text-red-500">*</span></label>
            <input type="text" required value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-2 text-[13px] border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition" />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-foreground mb-1.5">Work email <span className="text-red-500">*</span></label>
            <input type="email" required value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full px-3 py-2 text-[13px] border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition" />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-foreground mb-1.5">Role</label>
            <select value={editForm.role} onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value as TeamRole }))}
              className="w-full px-3 py-2 text-[13px] border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition">
              {(["Admin", "Developer", "Designer", "QA"] as TeamRole[]).map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[12px] font-medium text-foreground mb-1.5">Status</label>
            <select value={editForm.status} onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value as import("@/types").MemberStatus }))}
              className="w-full px-3 py-2 text-[13px] border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={savingEdit} className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-white text-[13px] font-medium rounded-lg transition disabled:opacity-60">
              {savingEdit && <Loader2 size={13} className="animate-spin" />}
              {savingEdit ? "Saving…" : "Save Changes"}
            </button>
            <button type="button" onClick={() => setEditMember(null)} className="px-4 py-2 text-[13px] text-muted border border-border rounded-lg hover:bg-gray-50 transition">
              Cancel
            </button>
          </div>
        </form>
      </Sheet>
    </div>
  );
}
