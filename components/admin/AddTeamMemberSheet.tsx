"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import type { TeamMember, TeamRole } from "@/types";

interface Props {
  onSuccess: (member: TeamMember) => void;
  onClose: () => void;
}

const ROLES: TeamRole[] = ["Admin", "Developer", "Designer", "QA"];
const field = "w-full px-3 py-2 text-[13px] border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition";

export default function AddTeamMemberSheet({ onSuccess, onClose }: Props) {
  const [form, setForm] = useState({ name: "", email: "", role: "Developer" as TeamRole });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const isDemo = document.cookie.includes("demo_user=");
    if (isDemo) {
      const initials = form.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
      const fake: TeamMember = {
        id: `tm-new-${Date.now()}`,
        ...form,
        avatar_initials: initials,
        status: "active",
        created_at: new Date().toISOString(),
        open_ticket_count: 0,
      };
      onSuccess(fake);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/team-members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to invite member");
      onSuccess(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-[12px] font-medium text-foreground mb-1.5">Full name <span className="text-red-500">*</span></label>
        <input type="text" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Sneha Joshi" className={field} />
      </div>
      <div>
        <label className="block text-[12px] font-medium text-foreground mb-1.5">Work email <span className="text-red-500">*</span></label>
        <input type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="sneha@nerdshouse.in" className={field} />
      </div>
      <div>
        <label className="block text-[12px] font-medium text-foreground mb-1.5">Role</label>
        <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as TeamRole }))} className={field}>
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      <p className="text-[11px] text-muted bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
        An invite email will be sent to this address via Resend.
      </p>

      {error && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

      <div className="flex gap-2 pt-2">
        <button type="submit" disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-white text-[13px] font-medium rounded-lg transition disabled:opacity-60">
          {loading && <Loader2 size={13} className="animate-spin" />}
          {loading ? "Inviting…" : "Send Invite"}
        </button>
        <button type="button" onClick={onClose} className="px-4 py-2 text-[13px] text-muted border border-border rounded-lg hover:bg-gray-50 transition">
          Cancel
        </button>
      </div>
    </form>
  );
}
