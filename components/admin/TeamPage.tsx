"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useIsDemo } from "@/lib/demo-context";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import Sheet from "@/components/ui/Sheet";
import AddTeamMemberSheet from "@/components/admin/AddTeamMemberSheet";
import { useRealtime } from "@/lib/use-realtime";
import type { TeamMember, TeamRole } from "@/types";

interface Props { members: TeamMember[] }

const ROLE_COLORS: Record<TeamRole, string> = {
  Admin:     "#4a4fe0",
  Developer: "#16a34a",
  Designer:  "#db2777",
  QA:        "#ea580c",
};

export default function TeamPage({ members: initial }: Props) {
  const [members, setMembers]   = useState(initial);
  const [addOpen, setAddOpen]   = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const isDemo = useIsDemo();

  // ── Realtime: team_members ────────────────────────────────────────────────
  useRealtime<TeamMember>({
    table: "team_members",
    disabled: isDemo,
    onInsert: (row) => setMembers((prev) => prev.some((m) => m.id === row.id) ? prev : [...prev, row]),
    onUpdate: (row) => setMembers((prev) => prev.map((m) => m.id === row.id ? { ...m, ...row } : m)),
    onDelete: (row) => setMembers((prev) => prev.filter((m) => m.id !== row.id)),
  });

  function handleAdded(m: TeamMember) {
    setMembers((prev) => [...prev, m]);
    setAddOpen(false);
  }

  async function removeMember(id: string) {
    setRemovingId(id);
    if (isDemo) {
      setMembers((prev) => prev.filter((m) => m.id !== id));
      setRemovingId(null);
      return;
    }
    await fetch(`/api/team-members/${id}`, { method: "DELETE" });
    // onSnapshot handles state
    setRemovingId(null);
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
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2 bg-accent hover:bg-accent-hover text-white text-[13px] font-medium rounded-lg transition"
        >
          <Plus size={14} /> Invite Member
        </button>
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
                    <button
                      onClick={() => removeMember(m.id)}
                      disabled={removingId === m.id}
                      className="opacity-0 group-hover:opacity-100 text-muted hover:text-red-500 transition-all disabled:opacity-40"
                    >
                      <Trash2 size={13} />
                    </button>
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
    </div>
  );
}
