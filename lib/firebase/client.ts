import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithRedirect, getRedirectResult, signOut } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Only initialize on the client — this file should never be imported server-side.
// All components/hooks that import from here must be "use client" or loaded via
// next/dynamic with ssr:false.
const app = typeof window !== "undefined"
  ? (getApps().length ? getApp() : initializeApp(firebaseConfig))
  : null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const auth        = app ? getAuth(app)      : (null as any);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db          = app ? getFirestore(app) : (null as any);
export const googleProvider = new GoogleAuthProvider();
export { signInWithRedirect, getRedirectResult, signOut };

/** Alias kept for callers that used getDb() after the proxy migration. */
export function getDb() { return db; }
