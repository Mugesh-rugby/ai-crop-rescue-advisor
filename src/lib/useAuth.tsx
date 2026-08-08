"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
  getIdToken,
} from "firebase/auth";
import { auth, googleProvider, isFirebaseConfigured } from "./firebase";

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
}

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  signInEmail: (email: string, password: string) => Promise<void>;
  signUpEmail: (email: string, password: string, name?: string) => Promise<void>;
  signInGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth(), async (u) => {
      if (u) {
        setUser({
          uid: u.uid,
          email: u.email ?? "",
          displayName: u.displayName ?? u.email?.split("@")[0] ?? "User",
          photoURL: u.photoURL ?? undefined,
        });
        try {
          const token = await getIdToken(u, /* forceRefresh */ false);
          // Set a short-lived cookie so middleware can detect an active session.
          // Cookie contents are not trusted for authorization — Firestore rules
          // still enforce request.auth via ID tokens on the server.
          document.cookie = `firebaseAuth=${token}; path=/; max-age=${60 * 60 * 24}; SameSite=Lax`;
        } catch {
          // ignore
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const value: AuthContextValue = {
    user,
    loading,

    signInEmail: async (email, password) => {
      const cred = await signInWithEmailAndPassword(auth(), email, password);
      try {
        const token = await getIdToken(cred.user, /* forceRefresh */ true);
        document.cookie = `firebaseAuth=${token}; path=/; max-age=${60 * 60 * 24}; SameSite=Lax`;
      } catch {
        // ignore cookie errors
      }
    },

    signUpEmail: async (email, password, name) => {
      const cred = await createUserWithEmailAndPassword(auth(), email, password);
      if (name) {
        await updateProfile(cred.user, { displayName: name });
        setUser((prev) => (prev ? { ...prev, displayName: name } : prev));
      }
      try {
        const token = await getIdToken(cred.user, /* forceRefresh */ true);
        document.cookie = `firebaseAuth=${token}; path=/; max-age=${60 * 60 * 24}; SameSite=Lax`;
      } catch {
        // ignore
      }
    },

    signInGoogle: async () => {
      const cred = await signInWithPopup(auth(), googleProvider);
      try {
        const token = await getIdToken(cred.user, /* forceRefresh */ true);
        document.cookie = `firebaseAuth=${token}; path=/; max-age=${60 * 60 * 24}; SameSite=Lax`;
      } catch {
        // ignore
      }
    },

    resetPassword: async (email) => {
      await sendPasswordResetEmail(auth(), email);
    },

    signOut: async () => {
      await firebaseSignOut(auth());
      // Clear cookie so middleware redirects to login immediately
      document.cookie = `firebaseAuth=; path=/; max-age=0; SameSite=Lax`;
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
