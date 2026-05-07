"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useIsDemo } from "@/lib/demo-context";
import type { Client, ClientStatus } from "@/types";

interface Props {
  onSuccess: (client: Client) => void;
  onClose: () => void;
}

const field = "w-full px-3 py-2 text-[13px] border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition";

export default function AddClientSheet({ onSuccess, onClose }: Props) {
  const [form, setForm] = useState({ name: "", company: "", email: "", status: "active" as ClientStatus });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const isDemo = useIsDemo();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Demo mode: fabricate a client object
    if (isDemo) {
      const fakeClient: Client = {
        id: `demo-new-${Date.now()}`,
        ...form,
        is_admin: false,
        created_at: new Date().toISOString(),
      };
      onSuccess(fakeClient);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to add client");
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
        <input type="text" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Priya Sharma" className={field} />
      </div>
      <div>
        <label className="block text-[12px] font-medium text-foreground mb-1.5">Company</label>
        <input type="text" value={form.company} onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))} placeholder="Acme Corp" className={field} />
      </div>
      <div>
        <label className="block text-[12px] font-medium text-foreground mb-1.5">Email <span className="text-red-500">*</span></label>
        <input type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="priya@acme.com" className={field} />
      </div>
      <div>
        <label className="block text-[12px] font-medium text-foreground mb-1.5">Status</label>
        <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as ClientStatus }))} className={field}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {error && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

      <div className="flex gap-2 pt-2">
        <button type="submit" disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-white text-[13px] font-medium rounded-lg transition disabled:opacity-60">
          {loading && <Loader2 size={13} className="animate-spin" />}
          {loading ? "Adding…" : "Add Client"}
        </button>
        <button type="button" onClick={onClose} className="px-4 py-2 text-[13px] text-muted border border-border rounded-lg hover:bg-gray-50 transition">
          Cancel
        </button>
      </div>
    </form>
  );
}
