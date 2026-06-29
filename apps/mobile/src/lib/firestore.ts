import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  DocumentData,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import { generateCustomId } from './idUtils';
import type {
  Form,
  Bolum,
  Soru,
  Personel,
  Magaza,
  Degerlendirme,
  SkorlamaSistemi,
  CevapSecenegi,
  BolumSnapshot,
  SoruSnapshot,
} from './types';

function toDoc<T>(snap: QueryDocumentSnapshot<DocumentData>): T {
  return { id: snap.id, ...snap.data() } as T;
}

function cleanData<T>(val: T): T {
  if (val === undefined) {
    return undefined as any;
  }
  if (val === null) {
    return null as any;
  }
  if (Array.isArray(val)) {
    return val.map(cleanData).filter((x) => x !== undefined) as any;
  }
  if (typeof val === "object") {
    const proto = Object.getPrototypeOf(val);
    if (proto !== null && proto !== Object.prototype) {
      return val;
    }
    const cleaned: any = {};
    for (const key in val) {
      const cleanedVal = cleanData((val as any)[key]);
      if (cleanedVal !== undefined) {
        cleaned[key] = cleanedVal;
      }
    }
    return cleaned;
  }
  return val;
}

export async function getFormlar(): Promise<Form[]> {
  const snap = await getDocs(query(collection(db, 'formlar'), orderBy('olusturmaTarihi', 'desc')));
  return snap.docs.map((d) => toDoc<Form>(d));
}

export async function getForm(id: string): Promise<Form | null> {
  const snap = await getDoc(doc(db, 'formlar', id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Form) : null;
}

export async function getBolum(id: string): Promise<Bolum | null> {
  const snap = await getDoc(doc(db, 'bolumler', id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Bolum) : null;
}

export async function getSoru(id: string): Promise<Soru | null> {
  const snap = await getDoc(doc(db, 'sorular', id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Soru) : null;
}

export async function getMagazalar(): Promise<Magaza[]> {
  const snap = await getDocs(
    query(collection(db, 'magazalar'), where('aktif', '==', true), orderBy('ad', 'asc'))
  );
  return snap.docs.map((d) => toDoc<Magaza>(d));
}

export async function getAktifPersoneller(): Promise<Personel[]> {
  const snap = await getDocs(
    query(collection(db, 'personel'), where('aktif', '==', true), orderBy('ad', 'asc'))
  );
  return snap.docs.map((d) => toDoc<Personel>(d));
}

export async function getPersonellerByMagaza(magazaId: string): Promise<Personel[]> {
  const snap = await getDocs(
    query(
      collection(db, 'personel'),
      where('magazaIdleri', 'array-contains', magazaId),
      where('aktif', '==', true),
      orderBy('ad', 'asc')
    )
  );
  return snap.docs.map((d) => toDoc<Personel>(d));
}

export async function getDegerlendirmelerByKameraman(kameramanId: string): Promise<Degerlendirme[]> {
  const snap = await getDocs(
    query(
      collection(db, 'degerlendirmeler'),
      where('kameramanId', '==', kameramanId),
      orderBy('izlenmeTarihi', 'desc')
    )
  );
  return snap.docs.map((d) => toDoc<Degerlendirme>(d));
}

export async function getDegerlendirme(id: string): Promise<Degerlendirme | null> {
  const snap = await getDoc(doc(db, 'degerlendirmeler', id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Degerlendirme) : null;
}

export async function createDegerlendirme(data: {
  formId: string;
  formAd: string;
  personelId: string;
  personelAd: string;
  magazaId: string;
  magazaAd: string;
  kameramanId: string;
  kameramanAd: string;
  izlenmeTarihi: import('firebase/firestore').Timestamp;
  raporlamaTarihi: import('firebase/firestore').Timestamp;
  puanli: boolean;
  skorlamaSistemi?: SkorlamaSistemi;
  toplamPuan: number | null;
  maxPuan: number | null;
  cevaplar: Record<string, CevapSecenegi>;
  bolumSnapshot: Record<string, BolumSnapshot>;
  soruSnapshot: Record<string, SoruSnapshot>;
}): Promise<string> {
  const customId = generateCustomId(data.personelAd);
  await setDoc(doc(db, 'degerlendirmeler', customId), {
    ...cleanData(data),
    olusturmaTarihi: serverTimestamp(),
  });
  return customId;
}
