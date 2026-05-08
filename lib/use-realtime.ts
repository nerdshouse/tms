"use client";

import { useEffect } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  type Query,
  type DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";

type ChangeEvent = "INSERT" | "UPDATE" | "DELETE" | "*";

interface RealtimeOptions<T = Record<string, unknown>> {
  table: string;
  /** Optional eq filter, e.g. { column: "ticket_id", value: "abc" } */
  filter?: { column: string; value: string };
  events?: ChangeEvent[];
  onInsert?: (row: T) => void;
  onUpdate?: (row: T) => void;
  onDelete?: (row: T) => void;
  /** Skip setting up subscription (e.g. in demo mode) */
  disabled?: boolean;
}

/** Convert Firestore Timestamps to ISO strings in a plain data object. */
function convertTimestamps(data: DocumentData): DocumentData {
  const out: DocumentData = {};
  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === "object" && typeof value.toDate === "function") {
      out[key] = (value as { toDate: () => Date }).toDate().toISOString();
    } else {
      out[key] = value;
    }
  }
  return out;
}

/**
 * Subscribe to Firestore collection changes.
 * Mirrors the old Supabase useRealtime API so callers need no changes.
 * Skips the initial snapshot (onInsert not called for pre-existing docs).
 * Cleans up on unmount or when options change.
 */
export function useRealtime<T = Record<string, unknown>>({
  table,
  filter,
  onInsert,
  onUpdate,
  onDelete,
  disabled = false,
}: RealtimeOptions<T>) {
  useEffect(() => {
    if (disabled) return;

    const colRef = collection(db, table);
    let q: Query<DocumentData>;

    if (filter) {
      q = query(colRef, where(filter.column, "==", filter.value));
    } else {
      q = query(colRef);
    }

    let initialized = false;

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        // Skip "added" events from the initial load — those are already in server-rendered data
        if (!initialized && change.type === "added") return;

        const raw = convertTimestamps(change.doc.data());
        const docData = { id: change.doc.id, ...raw } as T;

        if (change.type === "added"    && onInsert) onInsert(docData);
        if (change.type === "modified" && onUpdate) onUpdate(docData);
        if (change.type === "removed"  && onDelete) onDelete(docData);
      });

      initialized = true;
    });

    return () => unsubscribe();
  }, [table, filter?.column, filter?.value, disabled]); // eslint-disable-line react-hooks/exhaustive-deps
}
