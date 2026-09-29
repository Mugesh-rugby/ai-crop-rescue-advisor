// src/lib/firebase.ts
// Single source of truth for Firebase — Auth, Firestore, Storage.
// Now that credentials are configured, this connects directly to your Firebase project.

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, initializeFirestore, persistentLocalCache } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
);

let app: FirebaseApp;

export function getFirebaseApp(): FirebaseApp {
  if (!getApps().length) {
    if (!isFirebaseConfigured) {
      console.warn(
        "[CropRescue] Firebase env vars missing — running in offline mode. " +
        "Set NEXT_PUBLIC_FIREBASE_* variables in .env.local to enable cloud sync."
      );
    }
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
  return app;
}

export const auth = () => getAuth(getFirebaseApp());
export const googleProvider = new GoogleAuthProvider();

// Offline-persistence Firestore for reliable rural connectivity
export const db = () => {
  const fbApp = getFirebaseApp();
  if (getApps().length > 1) return getFirestore(fbApp);
  try {
    return initializeFirestore(fbApp, { localCache: persistentLocalCache() });
  } catch {
    return getFirestore(fbApp);
  }
};

export const storage = () => getStorage(getFirebaseApp());
