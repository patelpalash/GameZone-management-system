import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getAuth, browserLocalPersistence, setPersistence } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAhy7uJOYziSdlZA1YzBsE_58bZ6U95beo",
  authDomain: "gamezone-vibe.firebaseapp.com",
  projectId: "gamezone-vibe",
  storageBucket: "gamezone-vibe.firebasestorage.app",
  messagingSenderId: "205564322866",
  appId: "1:205564322866:web:a6d8ec64cac112b91b482b",
  measurementId: "G-2HP4KREG9F"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const db = getFirestore(app);
export const functions = getFunctions(app);
export const auth = getAuth(app);

// Ensure users stay logged in across page refreshes and browser sessions
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.error("Failed to set auth persistence:", err);
});

// Suppress benign Firestore/WebChannel AbortErrors to prevent Next.js error overlays in development
if (typeof window !== "undefined") {
  const isAbortError = (err: unknown) => {
    if (!err) return false;
    const error = err as { name?: string; message?: string };
    return (
      error.name === "AbortError" ||
      String(err).includes("signal is aborted without reason") ||
      (error.message && error.message.includes("signal is aborted without reason"))
    );
  };

  window.addEventListener("unhandledrejection", (event) => {
    if (isAbortError(event.reason)) {
      event.preventDefault();
      console.warn("Suppressed benign Firestore AbortError rejection:", event.reason);
    }
  });

  window.addEventListener("error", (event) => {
    if (isAbortError(event.error) || (event.message && event.message.includes("signal is aborted without reason"))) {
      event.preventDefault();
      console.warn("Suppressed benign Firestore AbortError event:", event.message);
    }
  });
}

