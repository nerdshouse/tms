"use client";

import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";
import { Upload, X, Loader2 } from "lucide-react";
import type { Priority, TicketType, Project } from "@/types";

const MODULES = [
  "Authentication", "Dashboard", "Billing", "Integrations",
  "Reports", "Settings", "API", "Mobile", "Other",
];

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: "P0", label: "P0 — Critical" },
  { value: "P1", label: "P1 — High" },
  { value: "P2", label: "P2 — Normal" },
];

const TYPES: TicketType[] = ["Bug", "Feature", "Performance"];

export default function NewRequestForm() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [form, setForm] = useState({
    title: "",
    priority: "P1" as Priority,
    type: "Bug" as TicketType,
    module: "Other",
    description: "",
    project_id: "",
  });
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Load projects for this client
  useEffect(() => {
    fetch("/api/me/projects")
      .then((r) => r.ok ? r.json() : [])
      .then((data) => {
        setProjects(data);
        if (data.length > 0) setForm((f) => ({ ...f, project_id: data[0].id }));
      })
      .catch(() => {});
  }, []);

  const onDrop = useCallback((accepted: File[]) => {
    setFiles((prev) => [...prev, ...accepted].slice(0, 5));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [], "application/pdf": [], "text/*": [] },
    maxSize: 10 * 1024 * 1024,
  });

  function removeFile(i: number) {
    setFiles((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.project_id && projects.length > 0) {
      setError("Please select a project.");
      return;
    }
    setSubmitting(true);
    setError("");

    try {
      const body = new FormData();
      Object.entries(form).forEach(([k, v]) => body.append(k, v));
      files.forEach((f) => body.append("files", f));

      const res = await fetch("/api/tickets", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create ticket");

      router.push(`/tickets/${data.id}`);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  const field = "w-full px-3 py-2 text-[13px] border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition";

  return (
    <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-6 space-y-5">
      {/* Title */}
      <div>
        <label className="block text-[13px] font-medium text-foreground mb-1.5">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          placeholder="Short, descriptive title"
          required
          maxLength={200}
          className={field}
        />
      </div>

      {/* Project */}
      <div>
        <label className="block text-[13px] font-medium text-foreground mb-1.5">
          Project <span className="text-red-500">*</span>
        </label>
        {projects.length === 0 ? (
          <p className="text-[12px] text-muted bg-gray-50 border border-border rounded-lg px-3 py-2">
            No projects yet — ask your account manager to set one up.
          </p>
        ) : (
          <select
            value={form.project_id}
            onChange={(e) => setForm((f) => ({ ...f, project_id: e.target.value }))}
            required
            className={field}
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}
        {/* Colour dot preview */}
        {form.project_id && (() => {
          const p = projects.find((x) => x.id === form.project_id);
          return p ? (
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
              <span className="text-[11px] text-muted">{p.name}</span>
            </div>
          ) : null;
        })()}
      </div>

      {/* Priority + Type */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[13px] font-medium text-foreground mb-1.5">Priority</label>
          <select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as Priority }))} className={field}>
            {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[13px] font-medium text-foreground mb-1.5">Type</label>
          <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as TicketType }))} className={field}>
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {/* Module */}
      <div>
        <label className="block text-[13px] font-medium text-foreground mb-1.5">Module</label>
        <select value={form.module} onChange={(e) => setForm((f) => ({ ...f, module: e.target.value }))} className={field}>
          {MODULES.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {/* Description */}
      <div>
        <label className="block text-[13px] font-medium text-foreground mb-1.5">
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder="Describe the issue in detail. For bugs include steps to reproduce."
          required
          rows={5}
          className={`${field} resize-none`}
        />
      </div>

      {/* File Upload */}
      <div>
        <label className="block text-[13px] font-medium text-foreground mb-1.5">
          Attachments <span className="text-muted font-normal">(optional, up to 5 files)</span>
        </label>
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-colors ${
            isDragActive ? "border-accent bg-accent/5" : "border-border hover:border-accent/50 hover:bg-gray-50/50"
          }`}
        >
          <input {...getInputProps()} />
          <Upload size={20} className="mx-auto text-muted mb-2" />
          <p className="text-[13px] text-muted">
            {isDragActive ? "Drop files here…" : "Drag files here, or click to browse"}
          </p>
        </div>
        {files.length > 0 && (
          <ul className="mt-2 space-y-1">
            {files.map((f, i) => (
              <li key={i} className="flex items-center gap-2 text-[12px] text-muted bg-gray-50 rounded-lg px-3 py-1.5">
                <span className="flex-1 truncate">{f.name}</span>
                <span className="text-[11px]">{(f.size / 1024).toFixed(0)} KB</span>
                <button type="button" onClick={() => removeFile(i)} className="hover:text-red-500 transition-colors"><X size={13} /></button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

      <div className="flex items-center gap-3 pt-1">
        <button type="submit" disabled={submitting} className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-white text-[13px] font-medium rounded-lg transition disabled:opacity-60">
          {submitting && <Loader2 size={13} className="animate-spin" />}
          {submitting ? "Submitting…" : "Submit Request"}
        </button>
        <button type="button" onClick={() => router.back()} className="px-4 py-2 text-[13px] text-muted hover:text-foreground border border-border rounded-lg hover:bg-gray-50 transition">
          Cancel
        </button>
      </div>
    </form>
  );
}
