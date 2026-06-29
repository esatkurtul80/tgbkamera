"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { Kullanici } from "@/types";

interface AuthContextType {
  user: User | null;
  kullanici: Kullanici | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [kullanici, setKullanici] = useState<Kullanici | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        const snap = await getDoc(doc(db, "users", firebaseUser.uid));
        if (snap.exists()) {
          setKullanici({ id: snap.id, ...snap.data() } as Kullanici);
        } else {
          setKullanici(null);
        }
      } else {
        setKullanici(null);
      }

      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    const userDocRef = doc(db, "users", result.user.uid);
    const snap = await getDoc(userDocRef);
    const isAdminEmail = result.user.email?.toLowerCase() === "esatkurtul@gmail.com";

    if (!snap.exists()) {
      await setDoc(userDocRef, {
        email: result.user.email,
        displayName: result.user.displayName || "",
        rol: isAdminEmail ? "admin" : null,
        aktif: true,
        olusturmaTarihi: serverTimestamp(),
        guncellemeTarihi: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
      });
    } else {
      await setDoc(
        userDocRef,
        {
          email: result.user.email,
          lastLoginAt: serverTimestamp(),
          ...(isAdminEmail && !snap.data()?.rol && { rol: "admin" }),
        },
        { merge: true }
      );
    }
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const userDocRef = doc(db, "users", result.user.uid);
    const snap = await getDoc(userDocRef);
    const isAdminEmail = result.user.email?.toLowerCase() === "esatkurtul@gmail.com";

    if (!snap.exists()) {
      await setDoc(userDocRef, {
        email: result.user.email,
        displayName: result.user.displayName || "",
        rol: isAdminEmail ? "admin" : null,
        aktif: true,
        olusturmaTarihi: serverTimestamp(),
        guncellemeTarihi: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
      });
    } else {
      await setDoc(
        userDocRef,
        {
          email: result.user.email,
          displayName: snap.data()?.displayName || result.user.displayName || "",
          lastLoginAt: serverTimestamp(),
          ...(isAdminEmail && !snap.data()?.rol && { rol: "admin" }),
        },
        { merge: true }
      );
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (err) {
      console.error("Firebase signOut error:", err);
    }
    setKullanici(null);
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider value={{ user, kullanici, loading, signInWithEmail, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
