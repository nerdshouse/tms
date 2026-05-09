"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, googleProvider, signInWithRedirect, getRedirectResult, signOut } from "@/lib/firebase/client";

export default function LoginForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  // On mount: check if we just came back from a Google redirect
  useEffect(() => {
    setLoading(true);
    getRedirectResult(auth)
      .then(async (result) => {
        if (!result) { setLoading(false); return; } // No redirect in progress

        const idToken = await result.user.getIdToken();
        const res = await fetch("/api/session", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ idToken }),
        });

        const data = await res.json();
        if (!res.ok) {
          await signOut(auth);
          setError(data.message ?? "Access denied. Contact Nerdshouse to get access.");
          setLoading(false);
          return;
        }

        // Force token refresh so custom claims (is_admin) are immediately
        // available to the client-side Firestore SDK before any onSnapshot
        // subscriptions are set up on the next page.
        await result.user.getIdToken(true);
        router.replace("/");
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Sign-in failed. Please try again.");
        setLoading(false);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleGoogle() {
    setLoading(true);
    setError("");
    try {
      // signInWithRedirect navigates away — no popup, no COOP issues
      await signInWithRedirect(auth, googleProvider);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sign-in failed. Please try again.");
      setLoading(false);
    }
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

        <h1 className="text-[17px] font-semibold text-foreground text-center mb-1">
          Welcome back
        </h1>
        <p className="text-sm text-muted text-center mb-6">
          Sign in with your Google account to access the portal.
        </p>

        <button
          onClick={handleGoogle}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-border rounded-lg bg-card hover:bg-gray-50 text-[13px] font-medium text-foreground transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            <svg className="w-4 h-4 animate-spin text-muted" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
              <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
          )}
          {loading ? "Signing in…" : "Continue with Google"}
        </button>

        {error && (
          <p className="mt-4 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-center">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
