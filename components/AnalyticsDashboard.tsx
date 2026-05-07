"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { Ticket, Status } from "@/types";

interface Props {
  tickets: Ticket[];
}

const STATUS_COLORS: Record<Status, string> = {
  open:        "#9ca3af",
  in_progress: "#3b82f6",
  review:      "#f59e0b",
  done:        "#22c55e",
};

const STATUS_LABELS: Record<Status, string> = {
  open:        "Open",
  in_progress: "In Progress",
  review:      "In Review",
  done:        "Done",
};

export default function AnalyticsDashboard({ tickets }: Props) {
  const total = tickets.length;
  const open = tickets.filter((t) => t.status === "open").length;
  const inProgress = tickets.filter((t) => t.status === "in_progress").length;
  const done = tickets.filter((t) => t.status === "done").length;

  // By status
  const byStatus = (["open", "in_progress", "review", "done"] as Status[]).map((s) => ({
    name: STATUS_LABELS[s],
    count: tickets.filter((t) => t.status === s).length,
    status: s,
  }));

  // By module
  const moduleMap: Record<string, number> = {};
  tickets.forEach((t) => {
    const m = t.module || "Other";
    moduleMap[m] = (moduleMap[m] ?? 0) + 1;
  });
  const byModule = Object.entries(moduleMap)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-[17px] font-semibold text-foreground">Analytics</h1>
        <p className="text-xs text-muted mt-0.5">Overview of all requests</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Requests" value={total} color="text-foreground" />
        <StatCard label="Open" value={open} color="text-gray-500" />
        <StatCard label="In Progress" value={inProgress} color="text-blue-600" />
        <StatCard label="Resolved" value={done} color="text-green-600" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        {/* By status */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-[13px] font-semibold text-foreground mb-4">By Status</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byStatus} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0ee" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e5e3" }}
                cursor={{ fill: "rgba(0,0,0,0.03)" }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {byStatus.map((entry) => (
                  <Cell key={entry.status} fill={STATUS_COLORS[entry.status as Status]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* By module */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-[13px] font-semibold text-foreground mb-4">By Module</h2>
          {byModule.length === 0 ? (
            <p className="text-[13px] text-muted text-center py-16">No data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byModule} barSize={32} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0ee" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e5e3" }}
                  cursor={{ fill: "rgba(0,0,0,0.03)" }}
                />
                <Bar dataKey="count" fill="#4a4fe0" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <p className="text-[11px] text-muted mb-1">{label}</p>
      <p className={`text-3xl font-semibold ${color}`}>{value}</p>
    </div>
  );
}
