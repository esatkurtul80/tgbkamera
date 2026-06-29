import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getAuth, inMemoryPersistence, type Auth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Hermes (React Native) does not provide DOMException; Firebase Auth uses it internally.
if (typeof global.DOMException === 'undefined') {
  (global as any).DOMException = class DOMException extends Error {
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
  auth = initializeAuth(app, { persistence: inMemoryPersistence });
} catch {
  auth = getAuth(app);
}

export { auth };
export const db = getFirestore(app);
