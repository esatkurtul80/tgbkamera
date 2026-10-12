import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getStorage } from "firebase/storage";

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

/**
 * Tarayıcıda kalıcı yerel önbellek (IndexedDB): aynı sorgular tekrar açılışta önce önbellekten
 * anında gelir, sunucu cevabı arkadan günceller (bkz. hooks/useBmMagazalar, useBmRaporlar).
 * Sunucu tarafı render sırasında (IndexedDB yok) düz bellek içi örnek kullanılır.
 */
function firestoreOlustur() {
  if (typeof window === "undefined") return getFirestore(app);
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  } catch {
    // Aynı app için daha önce başlatılmışsa (HMR vb.) mevcut örneğe dön
    return getFirestore(app);
  }
}

export const auth = getAuth(app);
export const db = firestoreOlustur();
export const storage = getStorage(app);
