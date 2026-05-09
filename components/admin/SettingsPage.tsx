"use client";

import { useState } from "react";
import { Settings, CheckCircle2, AlertCircle, Loader2, ExternalLink } from "lucide-react";

interface TogglSettings {
  api_token: string;
  workspace_id: string;
  last_synced_at: string | null;
}

interface Props {
  initialToggl: TogglSettings;
}

export default function SettingsPage({ initialToggl }: Props) {
  const [form, setForm] = useState({
    api_token:    initialToggl.api_token,
    workspace_id: initialToggl.workspace_id,
  });
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [error, setError]       = useState("");
  const [testing, setTesting]   = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);
    setTestResult(null);

    const res = await fetch("/api/toggl/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Failed to save");
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    const res = await fetch("/api/toggl/projects");
    if (res.ok) {
      const projects = await res.json();
      setTestResult({ ok: true, message: `Connected! Found ${projects.length} active project${projects.length !== 1 ? "s" : ""} in workspace.` });
    } else {
      const data = await res.json().catch(() => ({}));
      setTestResult({ ok: false, message: data.error ?? `Connection failed (${res.status})` });
    }
    setTesting(false);
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-2 mb-6">
        <Settings size={18} className="text-muted" />
        <h1 className="text-[17px] font-semibold text-foreground">Settings</h1>
      </div>

      {/* Toggl Integration */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-[14px] font-semibold text-foreground">Toggl Track Integration</h2>
            <p className="text-[12px] text-muted mt-0.5">
              Connect your Toggl workspace to sync time entries to projects.
            </p>
          </div>
          <a
            href="https://track.toggl.com/profile"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[12px] text-accent hover:underline"
          >
            Get API token <ExternalLink size={11} />
          </a>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-foreground mb-1.5">
              API Token <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              required
              placeholder="Your Toggl API token"
              value={form.api_token}
              onChange={(e) => setForm((f) => ({ ...f, api_token: e.target.value }))}
              className="w-full px-3 py-2 text-[13px] border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition font-mono"
            />
            <p className="text-[11px] text-muted mt-1">
              Found at toggl.com → Profile → API Token
            </p>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-foreground mb-1.5">
              Workspace ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 1234567"
              value={form.workspace_id}
              onChange={(e) => setForm((f) => ({ ...f, workspace_id: e.target.value }))}
              className="w-full px-3 py-2 text-[13px] border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition"
            />
            <p className="text-[11px] text-muted mt-1">
              Found in the Toggl Track URL: track.toggl.com/&lt;workspace_id&gt;/...
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-100 rounded-lg text-[12px] text-red-700">
              <AlertCircle size={13} /> {error}
            </div>
          )}

          {saved && (
            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-100 rounded-lg text-[12px] text-green-700">
              <CheckCircle2 size={13} /> Settings saved successfully.
            </div>
          )}

          {testResult && (
            <div className={`flex items-start gap-2 px-3 py-2 rounded-lg text-[12px] border ${
              testResult.ok
                ? "bg-green-50 border-green-100 text-green-700"
                : "bg-red-50 border-red-100 text-red-700"
            }`}>
              {testResult.ok ? <CheckCircle2 size={13} className="mt-0.5 flex-shrink-0" /> : <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />}
              {testResult.message}
            </div>
          )}

          {initialToggl.last_synced_at && (
            <p className="text-[11px] text-muted">
              Last synced: {new Date(initialToggl.last_synced_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST
            </p>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-white text-[13px] font-medium rounded-lg transition disabled:opacity-60"
            >
              {saving && <Loader2 size={13} className="animate-spin" />}
              {saving ? "Saving…" : "Save Settings"}
            </button>
            <button
              type="button"
              onClick={handleTest}
              disabled={testing || !form.api_token || !form.workspace_id}
              className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-muted border border-border rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
            >
              {testing && <Loader2 size={13} className="animate-spin" />}
              {testing ? "Testing…" : "Test Connection"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
