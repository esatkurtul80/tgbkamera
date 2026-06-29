import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  signInWithCredential,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { Kullanici } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  kullanici: Kullanici | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signInWithGoogle: (idToken: string) => Promise<void>;
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
        const snap = await getDoc(doc(db, 'users', firebaseUser.uid));
        setKullanici(snap.exists() ? ({ id: snap.id, ...snap.data() } as Kullanici) : null);
      } else {
        setKullanici(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    await setDoc(
      doc(db, 'users', result.user.uid),
      { email: result.user.email, lastLoginAt: serverTimestamp() },
      { merge: true }
    );
  };

  const signInWithGoogle = async (idToken: string) => {
    const credential = GoogleAuthProvider.credential(idToken);
    const result = await signInWithCredential(auth, credential);
    await setDoc(
      doc(db, 'users', result.user.uid),
      {
        email: result.user.email,
        adSoyad: result.user.displayName || '',
        avatarUrl: result.user.photoURL || '',
        lastLoginAt: serverTimestamp(),
      },
      { merge: true }
    );
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setKullanici(null);
  };

  return (
    <AuthContext.Provider value={{ user, kullanici, loading, signInWithEmail, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
