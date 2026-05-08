import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function getClientApp(): FirebaseApp {
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

let _auth: Auth | undefined;
let _db: Firestore | undefined;

/**
 * Lazy proxy — getAuth / getFirestore are only called on first property access,
 * not at module load time. This prevents build-time crashes when
 * NEXT_PUBLIC_FIREBASE_* env vars are absent (e.g. Vercel build without vars set).
 */
function lazyProxy<T extends object>(getInstance: () => T): T {
  return new Proxy({} as T, {
    get(_target, prop: string | symbol) {
      const instance = getInstance();
      const value = (instance as Record<string | symbol, unknown>)[prop];
      // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
      return typeof value === "function" ? (value as Function).bind(instance) : value;
    },
  });
}

export const auth = lazyProxy<Auth>(
  () => (_auth ??= getAuth(getClientApp()))
);

export const db = lazyProxy<Firestore>(
  () => (_db ??= getFirestore(getClientApp()))
);

export const googleProvider = new GoogleAuthProvider();
export { signInWithPopup };
