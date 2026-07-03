import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getAuth, browserLocalPersistence, setPersistence } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || ""
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const db = getFirestore(app);
export const functions = getFunctions(app);
export const auth = getAuth(app);

// Ensure users stay logged in across page refreshes and browser sessions
if (typeof window !== "undefined") {
  setPersistence(auth, browserLocalPersistence).catch((err) => {
    console.error("Failed to set auth persistence:", err);
  });
}

// Suppress benign Firestore/WebChannel AbortErrors to prevent Next.js error overlays in development
if (typeof window !== "undefined") {
  const isAbortError = (err: unknown): boolean => {
    if (!err) return false;
    if (err instanceof DOMException && err.name === "AbortError") return true;
    const error = err as { name?: string; message?: string; stack?: string };
    if (error.name === "AbortError") return true;
    const str = String(err);
    if (str.includes("signal is aborted without reason")) return true;
    if (error.message?.includes("signal is aborted without reason")) return true;
    if (error.stack?.includes("webchannel_blob")) return true;
    return false;
  };

  // Use capture phase (3rd arg = true) to intercept BEFORE Next.js error overlay
  window.addEventListener("error", (event) => {
    if (isAbortError(event.error) || event.message?.includes("signal is aborted without reason")) {
      event.stopImmediatePropagation();
      event.preventDefault();
      return false;
    }
  }, true);

  window.addEventListener("unhandledrejection", (event) => {
    if (isAbortError(event.reason)) {
      event.stopImmediatePropagation();
      event.preventDefault();
      return false;
    }
  }, true);
}
