import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getAuth } from "firebase/auth";

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

