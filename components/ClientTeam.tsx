"use client";

import { useState } from "react";
import { Plus, Trash2, Loader2, Mail } from "lucide-react";
import type { ClientContact } from "@/types";

interface Props {
  contacts: ClientContact[];
  clientId: string;
  company: string;
}

const field = "w-full px-3 py-2 text-[13px] border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition";

export default function ClientTeam({ contacts: initial, company }: Props) {
  const [contacts, setContacts]   = useState(initial);
  const [showForm, setShowForm]   = useState(false);
  const [name, setName]           = useState("");
  const [email, setEmail]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError]         = useState("");

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/me/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to invite");
      setContacts((prev) => [data, ...prev]);
      setName("");
      setEmail("");
      setShowForm(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function removeContact(id: string) {
    setRemovingId(id);
    await fetch(`/api/me/contacts/${id}`, { method: "DELETE" });
    setContacts((prev) => prev.filter((c) => c.id !== id));
    setRemovingId(null);
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[17px] font-semibold text-foreground">My Team</h1>
          <p className="text-xs text-muted mt-0.5">
            Invite your team members to access the portal for {company}.
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 px-3.5 py-2 bg-accent hover:bg-accent-hover text-white text-[13px] font-medium rounded-lg transition"
        >
          <Plus size={14} />
          Invite
        </button>
      </div>

      {/* Invite form */}
      {showForm && (
        <form onSubmit={handleInvite} className="bg-card border border-border rounded-xl p-5 mb-5 space-y-3">
          <h2 className="text-[13px] font-semibold text-foreground mb-1">Invite a team member</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-foreground mb-1">Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                className={field}
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-foreground mb-1">Email <span className="text-red-500">*</span></label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@example.com"
                className={field}
              />
            </div>
          </div>
          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-white text-[13px] font-medium rounded-lg transition disabled:opacity-60"
            >
              {loading ? <Loader2 size={13} className="animate-spin" /> : <Mail size={13} />}
              {loading ? "Sending…" : "Send Invite"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-[13px] text-muted border border-border rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Contacts table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {contacts.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-[13px] text-muted">No team members invited yet.</p>
            <p className="text-[12px] text-muted/70 mt-1">Invite your colleagues to give them access to the portal.</p>
          </div>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border bg-gray-50/60">
                <th className="text-left px-4 py-2.5 font-medium text-muted text-[11px] uppercase tracking-wide">Name</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted text-[11px] uppercase tracking-wide">Email</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted text-[11px] uppercase tracking-wide w-24">Status</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-gray-50/50 transition-colors group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-accent/15 flex items-center justify-center text-[11px] font-semibold text-accent flex-shrink-0">
                        {c.name[0]?.toUpperCase()}
                      </div>
                      <span className="font-medium text-foreground">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted">{c.email}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                      c.status === "active"
                        ? "bg-green-50 text-green-700 border-green-100"
                        : "bg-amber-50 text-amber-700 border-amber-100"
                    }`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => removeContact(c.id)}
                      disabled={removingId === c.id}
                      className="opacity-0 group-hover:opacity-100 text-muted hover:text-red-500 transition-all disabled:opacity-40"
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
