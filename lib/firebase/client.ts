import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const storage     = app ? getStorage(app)   : (null as any);
export const googleProvider = new GoogleAuthProvider();
export { signInWithPopup, signOut };

export interface AttachmentMeta {
  url:  string;
  name: string;
  type: string;
  size: number;
}

/** Upload a file to Firebase Storage under attachments/{uid}/{timestamp}_{name}.
 *  Calls onProgress(0-100) as bytes transfer. Returns full metadata. */
export async function uploadAttachment(
  uid: string,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<AttachmentMeta> {
  const path = `attachments/${uid}/${Date.now()}_${file.name}`;
  const storageRef = ref(storage, path);
  await new Promise<void>((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, file);
    task.on(
      "state_changed",
      (snap) => onProgress?.(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      reject,
      resolve,
    );
  });
  const url = await getDownloadURL(storageRef);
  return { url, name: file.name, type: file.type || "application/octet-stream", size: file.size };
}

/** Alias kept for callers that used getDb() after the proxy migration. */
export function getDb() { return db; }
