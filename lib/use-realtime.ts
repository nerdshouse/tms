"use client";

import { useEffect } from "react";
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
  type Query,
  type DocumentData,
} from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";

type ChangeEvent = "INSERT" | "UPDATE" | "DELETE" | "*";

interface RealtimeOptions<T = Record<string, unknown>> {
  table: string;
  filter?: { column: string; value: string };
  events?: ChangeEvent[];
  onInsert?: (row: T) => void;
  onUpdate?: (row: T) => void;
  onDelete?: (row: T) => void;
  disabled?: boolean;
}

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

function getFirebaseInstances() {
  const firebaseConfig = {
    apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return { db: getFirestore(app), auth: getAuth(app) };
}

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

    const { db, auth } = getFirebaseInstances();
    let unsubSnapshot: (() => void) | null = null;

    // Wait for Firebase Auth to restore the user session before subscribing.
    // Without this, onSnapshot fires unauthenticated and gets permission-denied.
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      // Clean up any previous snapshot listener
      if (unsubSnapshot) { unsubSnapshot(); unsubSnapshot = null; }
      if (!user) return; // Not signed in — don't subscribe

      const colRef = collection(db, table);
      const q: Query<DocumentData> = filter
        ? query(colRef, where(filter.column, "==", filter.value))
        : query(colRef);

      let initialized = false;

      unsubSnapshot = onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (!initialized && change.type === "added") return;

          const raw = convertTimestamps(change.doc.data());
          const docData = { id: change.doc.id, ...raw } as T;

          if (change.type === "added"    && onInsert) onInsert(docData);
          if (change.type === "modified" && onUpdate) onUpdate(docData);
          if (change.type === "removed"  && onDelete) onDelete(docData);
        });
        initialized = true;
      });
    });

    return () => {
      unsubAuth();
      if (unsubSnapshot) unsubSnapshot();
    };
  }, [table, filter?.column, filter?.value, disabled]); // eslint-disable-line react-hooks/exhaustive-deps
}
