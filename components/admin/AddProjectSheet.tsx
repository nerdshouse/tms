"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useIsDemo } from "@/lib/demo-context";
import type { Client, Project } from "@/types";

interface Props {
  client: Client;
  onSuccess: (project: Project) => void;
  onClose: () => void;
}

const PRESET_COLORS = [
  "#4a4fe0", "#16a34a", "#ea580c", "#9333ea",
  "#0891b2", "#db2777", "#ca8a04", "#374151",
];

const field = "w-full px-3 py-2 text-[13px] border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition";

export default function AddProjectSheet({ client, onSuccess, onClose }: Props) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const isDemo = useIsDemo();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (isDemo) {
      const fake: Project = {
        id: `proj-new-${Date.now()}`,
        name,
        client_id: client.id,
        color,
        created_at: new Date().toISOString(),
        clients: { name: client.name, company: client.company },
      };
      onSuccess(fake);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, client_id: client.id, color }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to add project");
      onSuccess(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-[12px] text-muted bg-gray-50 rounded-lg px-3 py-2">
        For client: <span className="font-medium text-foreground">{client.name}</span> · {client.company}
      </div>

      <div>
        <label className="block text-[12px] font-medium text-foreground mb-1.5">Project name <span className="text-red-500">*</span></label>
        <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Platform v2" className={field} />
      </div>

      <div>
        <label className="block text-[12px] font-medium text-foreground mb-2">Colour</label>
        <div className="flex items-center gap-2 flex-wrap">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`w-7 h-7 rounded-full transition-all ${color === c ? "ring-2 ring-offset-2 ring-foreground/30 scale-110" : "hover:scale-105"}`}
              style={{ backgroundColor: c }}
            />
          ))}
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-7 h-7 rounded-full cursor-pointer border border-border"
            title="Custom colour"
          />
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-[11px] text-muted font-mono">{color}</span>
        </div>
      </div>

      {error && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

      <div className="flex gap-2 pt-2">
        <button type="submit" disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-white text-[13px] font-medium rounded-lg transition disabled:opacity-60">
          {loading && <Loader2 size={13} className="animate-spin" />}
          {loading ? "Adding…" : "Add Project"}
        </button>
        <button type="button" onClick={onClose} className="px-4 py-2 text-[13px] text-muted border border-border rounded-lg hover:bg-gray-50 transition">
          Cancel
        </button>
      </div>
    </form>
  );
}
