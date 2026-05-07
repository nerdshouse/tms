"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="bg-card border border-border rounded-xl p-8 w-full max-w-sm shadow-sm">
        {/* Brand */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 mb-1">
            <span className="w-7 h-7 rounded-md bg-accent flex items-center justify-center">
              <span className="text-white text-xs font-bold">N</span>
            </span>
            <span className="font-semibold text-[15px] text-foreground">Nerdshouse</span>
          </div>
          <p className="text-muted text-sm mt-1">Client Portal</p>
        </div>

        {sent ? (
          <div className="text-center">
            <div className="text-2xl mb-3">📬</div>
            <h2 className="font-semibold text-foreground mb-1">Check your email</h2>
            <p className="text-sm text-muted">
              We sent a magic link to <strong>{email}</strong>. Click it to sign in.
            </p>
          </div>
        ) : (
          <>
            <h1 className="text-lg font-semibold text-foreground mb-1">Sign in</h1>
            <p className="text-sm text-muted mb-6">
              Enter your email to receive a magic link.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition"
                />
              </div>
              {error && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 px-4 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-lg transition disabled:opacity-60"
              >
                {loading ? "Sending…" : "Send magic link"}
              </button>
            </form>

            {/* Demo access */}
            <div className="mt-6 pt-5 border-t border-border">
              <p className="text-[11px] text-muted text-center mb-3 uppercase tracking-wide font-medium">
                Demo access
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/api/demo-login?role=client"
                  className="flex flex-col items-center gap-0.5 px-3 py-2.5 rounded-lg border border-border hover:bg-gray-50 hover:border-accent/40 transition text-center"
                >
                  <span className="text-[13px] font-medium text-foreground">Client</span>
                  <span className="text-[11px] text-muted">Priya Sharma</span>
                </Link>
                <Link
                  href="/api/demo-login?role=admin"
                  className="flex flex-col items-center gap-0.5 px-3 py-2.5 rounded-lg border border-border hover:bg-gray-50 hover:border-accent/40 transition text-center"
                >
                  <span className="text-[13px] font-medium text-foreground">Admin</span>
                  <span className="text-[11px] text-muted">Axit Mehta</span>
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
