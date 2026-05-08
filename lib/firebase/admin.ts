import admin from "firebase-admin";

function getApp(): admin.app.App {
  if (admin.apps.length > 0) return admin.apps[0]!;

  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
  if (!b64 || b64.startsWith("placeholder")) {
    throw new Error(
      "Firebase Admin SDK is not configured.\n" +
      "Add FIREBASE_SERVICE_ACCOUNT_B64 to .env.local:\n" +
      "  base64 -i serviceAccountKey.json | tr -d '\\n'"
    );
  }

  let serviceAccount: object;
  try {
    serviceAccount = JSON.parse(Buffer.from(b64, "base64").toString("utf-8"));
  } catch {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_B64 is not valid base64-encoded JSON.\n" +
      "Re-encode your service account file:\n" +
      "  base64 -i serviceAccountKey.json | tr -d '\\n'"
    );
  }

  return admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

/**
 * Lazy proxy — getApp() (and therefore Firebase initialisation) is only
 * called when the first method is actually invoked, not at module load time.
 * This keeps demo mode working even without real Firebase credentials.
 */
function lazyProxy<T extends object>(getInstance: () => T): T {
  return new Proxy({} as T, {
    get(_target, prop: string | symbol) {
      const instance = getInstance();
      const value = (instance as Record<string | symbol, unknown>)[prop];
      // Bind methods so `this` is correct inside Firebase SDK internals
      // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
      return typeof value === "function" ? (value as Function).bind(instance) : value;
    },
  });
}

export const adminAuth = lazyProxy<admin.auth.Auth>(() => getApp().auth());
export const adminDb   = lazyProxy<admin.firestore.Firestore>(() => getApp().firestore());
