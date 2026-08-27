import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
// RN kalıcı oturum: firebase 9.x'te React Native persistence bu alt yoldan gelir
import { initializeAuth, getReactNativePersistence } from 'firebase/auth/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Hermes (React Native) does not provide DOMException; Firebase Auth uses it internally.
if (typeof globalThis.DOMException === 'undefined') {
  (globalThis as any).DOMException = class DOMException extends Error {
    code: number;
    constructor(message?: string, name?: string) {
      super(message);
      this.name = name || 'DOMException';
      this.code = 0;
    }
  };
}

const firebaseConfig = {
  apiKey: 'AIzaSyC_jpZrWJJlRBcIR3dbp_LWijn8p3L9WO0',
  authDomain: 'tgbkamera.firebaseapp.com',
  projectId: 'tgbkamera',
  storageBucket: 'tgbkamera.firebasestorage.app',
  messagingSenderId: '14088134036',
  appId: '1:14088134036:web:45403940ad48abf4434381',
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

let auth: Auth;
try {
  // Oturum AsyncStorage'da saklanır — uygulama yeniden başlatılınca giriş korunur.
  auth = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
} catch (e) {
  // Buraya düşersek oturum kalıcılığı ÇALIŞMIYOR demektir (hot reload'da normal,
  // soğuk başlangıçta sorun) — nedeni Metro konsolunda görünsün.
  console.warn('initializeAuth başarısız, bellek-içi oturuma düşüldü:', (e as Error)?.message);
  auth = getAuth(app);
}

export { auth };
export const db = getFirestore(app);
export const storage = getStorage(app);
