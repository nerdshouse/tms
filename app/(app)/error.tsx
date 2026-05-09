"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app error]", error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6">
      <div className="text-center max-w-sm">
        <AlertTriangle size={28} className="mx-auto text-amber-500 mb-3" />
        <h2 className="text-[15px] font-semibold text-foreground mb-1">Something went wrong</h2>
        <p className="text-[12px] text-muted mb-4">
          {error.message?.includes("index")
            ? "A database index is missing. Run: firebase deploy --only firestore:indexes"
            : error.message || "An unexpected error occurred."}
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-[13px] font-medium rounded-lg transition"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
