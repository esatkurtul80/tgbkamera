import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC_jpZrWJJlRBcIR3dbp_LWijn8p3L9WO0",
  authDomain: "tgbkamera.firebaseapp.com",
  projectId: "tgbkamera",
  storageBucket: "tgbkamera.firebasestorage.app",
  messagingSenderId: "14088134036",
  appId: "1:14088134036:web:45403940ad48abf4434381",
  measurementId: "G-NHRC8CM3VQ",
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
