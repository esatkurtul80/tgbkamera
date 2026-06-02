import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  DocumentData,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Soru, Bolum, Form, Personel, Degerlendirme } from "@/types";

// ─── Helpers ────────────────────────────────────────────────────────────────

function toDoc<T>(snap: QueryDocumentSnapshot<DocumentData>): T {
  return { id: snap.id, ...snap.data() } as T;
}

// ─── Sorular ────────────────────────────────────────────────────────────────

export async function getSorular(): Promise<Soru[]> {
  const snap = await getDocs(query(collection(db, "sorular"), orderBy("olusturmaTarihi", "desc")));
  return snap.docs.map((d) => toDoc<Soru>(d));
}

export async function getSoru(id: string): Promise<Soru | null> {
  const snap = await getDoc(doc(db, "sorular", id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Soru) : null;
}

export async function createSoru(data: { metin: string; puan: number }): Promise<string> {
  const ref = await addDoc(collection(db, "sorular"), {
    ...data,
    olusturmaTarihi: serverTimestamp(),
    guncellemeTarihi: serverTimestamp(),
  });
  return ref.id;
}

export async function updateSoru(id: string, data: { metin: string; puan: number }): Promise<void> {
  await updateDoc(doc(db, "sorular", id), { ...data, guncellemeTarihi: serverTimestamp() });
}

export async function deleteSoru(id: string): Promise<void> {
  await deleteDoc(doc(db, "sorular", id));
}

// ─── Bölümler ───────────────────────────────────────────────────────────────

export async function getBolumler(): Promise<Bolum[]> {
  const snap = await getDocs(query(collection(db, "bolumler"), orderBy("olusturmaTarihi", "desc")));
  return snap.docs.map((d) => toDoc<Bolum>(d));
}

export async function getBolum(id: string): Promise<Bolum | null> {
  const snap = await getDoc(doc(db, "bolumler", id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Bolum) : null;
}

export async function createBolum(data: { ad: string; aciklama: string; soruIdleri: string[] }): Promise<string> {
  const ref = await addDoc(collection(db, "bolumler"), {
    ...data,
    olusturmaTarihi: serverTimestamp(),
    guncellemeTarihi: serverTimestamp(),
  });
  return ref.id;
}

export async function updateBolum(id: string, data: { ad: string; aciklama: string; soruIdleri: string[] }): Promise<void> {
  await updateDoc(doc(db, "bolumler", id), { ...data, guncellemeTarihi: serverTimestamp() });
}

export async function deleteBolum(id: string): Promise<void> {
  await deleteDoc(doc(db, "bolumler", id));
}

// ─── Formlar ─────────────────────────────────────────────────────────────────

export async function getFormlar(): Promise<Form[]> {
  const snap = await getDocs(query(collection(db, "formlar"), orderBy("olusturmaTarihi", "desc")));
  return snap.docs.map((d) => toDoc<Form>(d));
}

export async function getForm(id: string): Promise<Form | null> {
  const snap = await getDoc(doc(db, "formlar", id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Form) : null;
}

export async function createForm(data: { ad: string; aciklama: string; puanli: boolean; bolumIdleri: string[] }): Promise<string> {
  const ref = await addDoc(collection(db, "formlar"), {
    ...data,
    olusturmaTarihi: serverTimestamp(),
    guncellemeTarihi: serverTimestamp(),
  });
  return ref.id;
}

export async function updateForm(id: string, data: { ad: string; aciklama: string; puanli: boolean; bolumIdleri: string[] }): Promise<void> {
  await updateDoc(doc(db, "formlar", id), { ...data, guncellemeTarihi: serverTimestamp() });
}

export async function deleteForm(id: string): Promise<void> {
  await deleteDoc(doc(db, "formlar", id));
}

// ─── Personel ────────────────────────────────────────────────────────────────

export async function getPersoneller(): Promise<Personel[]> {
  const snap = await getDocs(query(collection(db, "personel"), orderBy("ad", "asc")));
  return snap.docs.map((d) => toDoc<Personel>(d));
}

export async function getAktifPersoneller(): Promise<Personel[]> {
  const snap = await getDocs(
    query(collection(db, "personel"), where("aktif", "==", true), orderBy("ad", "asc")),
  );
  return snap.docs.map((d) => toDoc<Personel>(d));
}

export async function getPersonel(id: string): Promise<Personel | null> {
  const snap = await getDoc(doc(db, "personel", id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Personel) : null;
}

export async function createPersonel(data: { ad: string; unvan: string; departman: string }): Promise<string> {
  const ref = await addDoc(collection(db, "personel"), {
    ...data,
    aktif: true,
    olusturmaTarihi: serverTimestamp(),
    guncellemeTarihi: serverTimestamp(),
  });
  return ref.id;
}

export async function updatePersonel(id: string, data: { ad: string; unvan: string; departman: string; aktif: boolean }): Promise<void> {
  await updateDoc(doc(db, "personel", id), { ...data, guncellemeTarihi: serverTimestamp() });
}

// ─── Değerlendirmeler ────────────────────────────────────────────────────────

export async function getDegerlendirmeler(filters?: { personelId?: string; formId?: string }): Promise<Degerlendirme[]> {
  let q = query(collection(db, "degerlendirmeler"), orderBy("tarih", "desc"));
  if (filters?.personelId) {
    q = query(collection(db, "degerlendirmeler"), where("personelId", "==", filters.personelId), orderBy("tarih", "desc"));
  } else if (filters?.formId) {
    q = query(collection(db, "degerlendirmeler"), where("formId", "==", filters.formId), orderBy("tarih", "desc"));
  }
  const snap = await getDocs(q);
  return snap.docs.map((d) => toDoc<Degerlendirme>(d));
}

export async function getDegerlendirme(id: string): Promise<Degerlendirme | null> {
  const snap = await getDoc(doc(db, "degerlendirmeler", id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Degerlendirme) : null;
}

export async function createDegerlendirme(data: Omit<Degerlendirme, "id" | "olusturmaTarihi">): Promise<string> {
  const ref = await addDoc(collection(db, "degerlendirmeler"), {
    ...data,
    olusturmaTarihi: serverTimestamp(),
  });
  return ref.id;
}
