import * as admin from "firebase-admin";

/**
 * Server-side Firebase Admin SDK singleton.
 *
 * Authentication priority:
 * 1. FIREBASE_SERVICE_ACCOUNT_JSON env var (full JSON string) — for production
 * 2. GOOGLE_APPLICATION_CREDENTIALS env var (path to JSON file) — ADC standard
 *
 * Fails hard if no credentials are configured.
 */
function getAdminApp(): admin.app.App {
  if (admin.apps.length > 0) {
    return admin.apps[0]!;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || "gamezone-vibe";

  // Option 1: Service account JSON string in env var
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (serviceAccountJson) {
    try {
      const serviceAccount = JSON.parse(serviceAccountJson);
      return admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId,
      });
    } catch (e) {
      console.error("[Firebase Admin] Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:", e);
    }
  }

  // Option 2: Application Default Credentials (GOOGLE_APPLICATION_CREDENTIALS path set)
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId,
    });
  }

  // No credentials — fail hard in production, warn in development
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "[Firebase Admin] FATAL: No credentials configured for production. " +
      "Set FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS."
    );
  }

  // Dev fallback: Initialize without credentials (requires open Firestore rules)
  console.warn(
    "[Firebase Admin] ⚠ DEV MODE: No credentials configured. Using project ID only. " +
    "Set FIREBASE_SERVICE_ACCOUNT_JSON in .env.local for full access."
  );
  return admin.initializeApp({ projectId });
}

const adminApp = getAdminApp();
export const adminDb = admin.firestore(adminApp);
export const adminAuth = admin.auth(adminApp);
