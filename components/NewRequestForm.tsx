"use client";

import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";
import { Upload, X, Loader2, FileText } from "lucide-react";
import { auth, uploadAttachment } from "@/lib/firebase/client";
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
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

export default function NewRequestForm({ defaultProjectId }: { defaultProjectId?: string }) {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [form, setForm] = useState({
    title: "",
    priority: "P1" as Priority,
    type: "Bug" as TicketType,
    module: "Other",
    description: "",
    project_id: defaultProjectId ?? "",
  });
  const [pageUrl, setPageUrl] = useState("");
  const [pageUrlError, setPageUrlError] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [fileSizeError, setFileSizeError] = useState("");
  // null = idle, 0-100 = uploading
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/me/projects")
      .then((r) => r.ok ? r.json() : [])
      .then((data: Project[]) => {
        setProjects(data);
        if (data.length > 0 && !defaultProjectId) {
          setForm((f) => ({ ...f, project_id: data[0].id }));
        }
      })
      .catch(() => {});
  }, [defaultProjectId]);

  const onDrop = useCallback((accepted: File[], rejected: import("react-dropzone").FileRejection[]) => {
    const tooBig = rejected.some((r) => r.errors.some((e) => e.code === "file-too-large"));
    if (tooBig) {
      setFileSizeError("One or more files exceed the 10 MB limit.");
      return;
    }
    setFileSizeError("");
    setFiles((prev) => [...prev, ...accepted].slice(0, 5));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [], "application/pdf": [], "text/*": [] },
    maxSize: MAX_SIZE,
  });

  function removeFile(i: number) {
    setFiles((prev) => prev.filter((_, idx) => idx !== i));
    setFileSizeError("");
  }

  function validatePageUrl(val: string): string {
    if (!val) return "";
    try {
      const u = new URL(val);
      if (u.protocol !== "http:" && u.protocol !== "https:") return "URL must start with http:// or https://";
      return "";
    } catch {
      return "Please enter a valid URL (e.g. https://example.com/page)";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.project_id && projects.length > 0) {
      setError("Please select a project.");
      return;
    }
    const urlErr = validatePageUrl(pageUrl);
    if (urlErr) { setPageUrlError(urlErr); return; }
    setSubmitting(true);
    setError("");

    try {
      const uid = auth?.currentUser?.uid ?? "unknown";
      let attachments: { url: string; name: string; type: string; size: number }[] = [];

      if (files.length > 0) {
        const progress = new Array(files.length).fill(0);
        setUploadPct(0);
        attachments = await Promise.all(
          files.map((f, idx) =>
            uploadAttachment(uid, f, (pct) => {
              progress[idx] = pct;
              const avg = Math.round(progress.reduce((a, b) => a + b, 0) / progress.length);
              setUploadPct(avg);
            })
          )
        );
        setUploadPct(null);
      }

      const body = new FormData();
      Object.entries(form).forEach(([k, v]) => body.append(k, v));
      if (pageUrl.trim()) body.append("page_url", pageUrl.trim());
      if (attachments.length > 0) body.append("attachments", JSON.stringify(attachments));

      const res = await fetch("/api/tickets", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create ticket");

      router.push(`/tickets/${data.id}`);
    } catch (err: unknown) {
      setUploadPct(null);
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
          <select disabled value={form.type} className={`${field} opacity-40 cursor-not-allowed`}>
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <p className="text-[11px] text-muted mt-1">Set by Nerdshouse team</p>
        </div>
      </div>

      {/* Module */}
      <div>
        <label className="block text-[13px] font-medium text-foreground mb-1.5">Module</label>
        <select disabled value={form.module} className={`${field} opacity-40 cursor-not-allowed`}>
          {MODULES.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <p className="text-[11px] text-muted mt-1">Set by Nerdshouse team</p>
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

      {/* Page URL */}
      <div>
        <label className="block text-[13px] font-medium text-foreground mb-1.5">
          Page URL <span className="text-muted font-normal">(optional)</span>
        </label>
        <input
          type="url"
          value={pageUrl}
          onChange={(e) => { setPageUrl(e.target.value); setPageUrlError(""); }}
          onBlur={() => setPageUrlError(validatePageUrl(pageUrl))}
          placeholder="https://app.example.com/the-page-with-the-issue"
          className={field}
        />
        {pageUrlError && <p className="text-[11px] text-red-500 mt-1">{pageUrlError}</p>}
        {!pageUrlError && <p className="text-[11px] text-muted mt-1">Link to the page where the issue occurs</p>}
      </div>

      {/* File Upload */}
      <div>
        <label className="block text-[13px] font-medium text-foreground mb-1.5">
          Attachments <span className="text-muted font-normal">(optional, up to 5 files, 10 MB each)</span>
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
          <p className="text-[11px] text-muted mt-1">Images, PDFs, text files — max 10 MB each</p>
        </div>

        {fileSizeError && (
          <p className="text-[11px] text-red-500 mt-1">{fileSizeError}</p>
        )}

        {/* Upload progress bar */}
        {uploadPct !== null && (
          <div className="mt-2">
            <div className="flex items-center justify-between text-[11px] text-muted mb-1">
              <span>Uploading…</span>
              <span>{uploadPct}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div
                className="bg-accent h-1.5 rounded-full transition-all"
                style={{ width: `${uploadPct}%` }}
              />
            </div>
          </div>
        )}

        {/* File previews */}
        {files.length > 0 && (
          <ul className="mt-2 space-y-2">
            {files.map((f, i) => {
              const isImage = f.type.startsWith("image/");
              const previewUrl = isImage ? URL.createObjectURL(f) : null;
              return (
                <li key={i} className="flex items-center gap-3 bg-gray-50 border border-border rounded-lg p-2">
                  {isImage && previewUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={previewUrl} alt={f.name} className="w-10 h-10 rounded object-cover flex-shrink-0 border border-border" />
                  ) : (
                    <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <FileText size={16} className="text-muted" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-foreground truncate">{f.name}</p>
                    <p className="text-[11px] text-muted">{(f.size / 1024).toFixed(0)} KB</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="text-muted hover:text-red-500 transition-colors flex-shrink-0"
                  >
                    <X size={14} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {error && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={submitting || uploadPct !== null}
          className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-white text-[13px] font-medium rounded-lg transition disabled:opacity-60"
        >
          {submitting && <Loader2 size={13} className="animate-spin" />}
          {submitting ? (uploadPct !== null ? "Uploading…" : "Submitting…") : "Submit Request"}
        </button>
        <button type="button" onClick={() => router.back()} className="px-4 py-2 text-[13px] text-muted hover:text-foreground border border-border rounded-lg hover:bg-gray-50 transition">
          Cancel
        </button>
      </div>
    </form>
  );
}
