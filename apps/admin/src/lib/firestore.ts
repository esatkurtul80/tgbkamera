import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  DocumentData,
  QueryDocumentSnapshot,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { generateCustomId } from "@/lib/idUtils";
import type {
  Soru,
  Bolum,
  Form,
  Personel,
  Degerlendirme,
  SoruIzlenme,
  Kullanici,
  Bolge,
  Magaza,
  KullaniciRol,
  SkorlamaSistemi,
} from "@/types";

// ─── Helpers ────────────────────────────────────────────────────────────────

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

// ─── Kullanıcılar ────────────────────────────────────────────────────────────

export async function getKullanicilar(): Promise<Kullanici[]> {
  const snap = await getDocs(collection(db, "users"));
  return snap.docs
    .map((d) => toDoc<Kullanici>(d))
    .sort((a, b) => (a.displayName || "").localeCompare(b.displayName || "", "tr"));
}

export async function getKullanici(id: string): Promise<Kullanici | null> {
  const snap = await getDoc(doc(db, "users", id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Kullanici) : null;
}

export async function updateKullanici(
  id: string,
  data: {
    displayName?: string;
    rol?: KullaniciRol;
    magazaId?: string | null;
    magazaIdleri?: string[] | null;
    bolgeId?: string | null;
    aktif?: boolean;
  }
): Promise<void> {
  await updateDoc(doc(db, "users", id), {
    ...cleanData(data),
    guncellemeTarihi: serverTimestamp(),
  });
}

export async function createKullanici(data: {
  email: string;
  displayName: string;
  rol: KullaniciRol;
  magazaId?: string;
  magazaIdleri?: string[];
  bolgeId?: string;
}): Promise<string> {
  const ref = await addDoc(collection(db, "users"), {
    ...cleanData(data),
    aktif: true,
    olusturmaTarihi: serverTimestamp(),
    guncellemeTarihi: serverTimestamp(),
  });
  return ref.id;
}

// ─── Bölgeler ─────────────────────────────────────────────────────────────────

export async function getBolgeler(): Promise<Bolge[]> {
  const snap = await getDocs(query(collection(db, "bolgeler"), orderBy("ad", "asc")));
  return snap.docs.map((d) => toDoc<Bolge>(d));
}

export async function getBolge(id: string): Promise<Bolge | null> {
  const snap = await getDoc(doc(db, "bolgeler", id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Bolge) : null;
}

export async function createBolge(data: {
  ad: string;
  aciklama?: string;
  bolgeMuduruId?: string;
}): Promise<string> {
  const customId = generateCustomId(data.ad);
  await setDoc(doc(db, "bolgeler", customId), {
    ...cleanData(data),
    aktif: true,
    olusturmaTarihi: serverTimestamp(),
    guncellemeTarihi: serverTimestamp(),
  });
  return customId;
}

export async function updateBolge(
  id: string,
  data: { ad: string; aciklama?: string; bolgeMuduruId?: string; aktif: boolean }
): Promise<void> {
  await updateDoc(doc(db, "bolgeler", id), { ...cleanData(data), guncellemeTarihi: serverTimestamp() });
}

export async function deleteBolge(id: string): Promise<void> {
  await deleteDoc(doc(db, "bolgeler", id));
}

// ─── Mağazalar ─────────────────────────────────────────────────────────────────

export async function getMagazalar(): Promise<Magaza[]> {
  const snap = await getDocs(query(collection(db, "magazalar"), orderBy("ad", "asc")));
  return snap.docs.map((d) => toDoc<Magaza>(d));
}

export async function getMagazalarByBolge(bolgeId: string): Promise<Magaza[]> {
  const snap = await getDocs(
    query(collection(db, "magazalar"), where("bolgeId", "==", bolgeId), orderBy("ad", "asc"))
  );
  return snap.docs.map((d) => toDoc<Magaza>(d));
}

export async function getMagaza(id: string): Promise<Magaza | null> {
  const snap = await getDoc(doc(db, "magazalar", id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Magaza) : null;
}

export async function createMagaza(data: {
  ad: string;
  adres?: string;
  bolgeId?: string;
  magazaSorumlusuId?: string;
}): Promise<string> {
  const customId = generateCustomId(data.ad);
  await setDoc(doc(db, "magazalar", customId), {
    ...cleanData(data),
    aktif: true,
    olusturmaTarihi: serverTimestamp(),
    guncellemeTarihi: serverTimestamp(),
  });
  return customId;
}

export async function updateMagaza(
  id: string,
  data: { ad: string; adres?: string; bolgeId?: string; magazaSorumlusuId?: string; aktif: boolean }
): Promise<void> {
  await updateDoc(doc(db, "magazalar", id), { ...cleanData(data), guncellemeTarihi: serverTimestamp() });
}

export async function deleteMagaza(id: string): Promise<void> {
  await deleteDoc(doc(db, "magazalar", id));
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

export async function createSoru(data: {
  metin: string;
  puan: number;
  hedefYuzde?: number;
}): Promise<string> {
  const customId = generateCustomId(data.metin);
  await setDoc(doc(db, "sorular", customId), {
    ...cleanData(data),
    olusturmaTarihi: serverTimestamp(),
    guncellemeTarihi: serverTimestamp(),
  });
  return customId;
}

export async function updateSoru(
  id: string,
  data: { metin: string; puan: number; hedefYuzde?: number }
): Promise<void> {
  await updateDoc(doc(db, "sorular", id), { ...cleanData(data), guncellemeTarihi: serverTimestamp() });
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

export async function createBolum(data: {
  ad: string;
  aciklama: string;
  soruIdleri: string[];
}): Promise<string> {
  const customId = generateCustomId(data.ad);
  await setDoc(doc(db, "bolumler", customId), {
    ...cleanData(data),
    olusturmaTarihi: serverTimestamp(),
    guncellemeTarihi: serverTimestamp(),
  });
  return customId;
}

export async function updateBolum(
  id: string,
  data: { ad: string; aciklama: string; soruIdleri: string[] }
): Promise<void> {
  await updateDoc(doc(db, "bolumler", id), { ...cleanData(data), guncellemeTarihi: serverTimestamp() });
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

export async function createForm(data: {
  ad: string;
  aciklama: string;
  puanli: boolean;
  skorlamaSistemi?: SkorlamaSistemi;
  bolumIdleri: string[];
}): Promise<string> {
  const customId = generateCustomId(data.ad);
  await setDoc(doc(db, "formlar", customId), {
    ...cleanData(data),
    olusturmaTarihi: serverTimestamp(),
    guncellemeTarihi: serverTimestamp(),
  });
  return customId;
}

export async function updateForm(
  id: string,
  data: {
    ad: string;
    aciklama: string;
    puanli: boolean;
    skorlamaSistemi?: SkorlamaSistemi;
    bolumIdleri: string[];
  }
): Promise<void> {
  await updateDoc(doc(db, "formlar", id), { ...cleanData(data), guncellemeTarihi: serverTimestamp() });
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
    query(collection(db, "personel"), where("aktif", "==", true), orderBy("ad", "asc"))
  );
  return snap.docs.map((d) => toDoc<Personel>(d));
}

export async function getPersonellerByMagaza(magazaId: string): Promise<Personel[]> {
  const snap = await getDocs(
    query(
      collection(db, "personel"),
      where("magazaIdleri", "array-contains", magazaId),
      orderBy("ad", "asc")
    )
  );
  return snap.docs.map((d) => toDoc<Personel>(d));
}

export async function getPersonel(id: string): Promise<Personel | null> {
  const snap = await getDoc(doc(db, "personel", id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Personel) : null;
}

export async function createPersonel(data: {
  ad: string;
  tc: string;
  magazaIdleri?: string[];
}): Promise<string> {
  const customId = generateCustomId(data.ad);
  await setDoc(doc(db, "personel", customId), {
    ...cleanData(data),
    magazaIdleri: data.magazaIdleri ?? [],
    aktif: true,
    olusturmaTarihi: serverTimestamp(),
    guncellemeTarihi: serverTimestamp(),
  });
  return customId;
}

export async function updatePersonel(
  id: string,
  data: { ad: string; tc: string; magazaIdleri: string[]; aktif: boolean }
): Promise<void> {
  await updateDoc(doc(db, "personel", id), { ...cleanData(data), guncellemeTarihi: serverTimestamp() });
}

// ─── Değerlendirmeler ────────────────────────────────────────────────────────

export async function getDegerlendirmeler(filters?: {
  personelId?: string;
  formId?: string;
  magazaId?: string;
  kameramanId?: string;
}): Promise<Degerlendirme[]> {
  let q = query(collection(db, "degerlendirmeler"), orderBy("olusturmaTarihi", "desc"));

  if (filters?.personelId) {
    q = query(
      collection(db, "degerlendirmeler"),
      where("personelId", "==", filters.personelId),
      orderBy("olusturmaTarihi", "desc")
    );
  } else if (filters?.magazaId) {
    q = query(
      collection(db, "degerlendirmeler"),
      where("magazaId", "==", filters.magazaId),
      orderBy("olusturmaTarihi", "desc")
    );
  } else if (filters?.kameramanId) {
    q = query(
      collection(db, "degerlendirmeler"),
      where("kameramanId", "==", filters.kameramanId),
      orderBy("olusturmaTarihi", "desc")
    );
  } else if (filters?.formId) {
    q = query(
      collection(db, "degerlendirmeler"),
      where("formId", "==", filters.formId),
      orderBy("olusturmaTarihi", "desc")
    );
  }

  const snap = await getDocs(q);
  return snap.docs.map((d) => toDoc<Degerlendirme>(d));
}


export async function getDegerlendirme(id: string): Promise<Degerlendirme | null> {
  const snap = await getDoc(doc(db, "degerlendirmeler", id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Degerlendirme) : null;
}

export async function createDegerlendirme(
  data: Omit<Degerlendirme, "id" | "olusturmaTarihi">
): Promise<string> {
  const customId = generateCustomId(data.personelAd);
  await setDoc(doc(db, "degerlendirmeler", customId), {
    ...cleanData(data),
    olusturmaTarihi: serverTimestamp(),
  });
  return customId;
}


export async function deleteDegerlendirme(id: string): Promise<void> {
  await deleteDoc(doc(db, "degerlendirmeler", id));
}

export async function updateDegerlendirme(
  id: string,
  data: {
    personelId?: string;
    personelAd?: string;
    magazaId?: string;
    magazaAd?: string;
    formId?: string;
    formAd?: string;
    izlenmeTarihi?: Timestamp;
    cevaplar?: Record<string, import("@/types").CevapSecenegi>;
    toplamPuan?: number | null;
    maxPuan?: number | null;
  }
): Promise<void> {
  await updateDoc(doc(db, "degerlendirmeler", id), {
    ...cleanData(data),
    guncellemeTarihi: serverTimestamp(),
  });
}

/**
 * Bu ay/yıl içinde personel+mağaza için açık (durum='acik') rapor varsa döner.
 * Aynı composite index'i kullanmak için personelId + orderBy ile query, geri kalanı client filter.
 */
export async function getAcikDegerlendirme(
  personelId: string,
  magazaId: string,
  ay: number,
  yil: number
): Promise<Degerlendirme | null> {
  const results = await getAcikDegerlendirmeler(personelId, magazaId, ay, yil);
  return results[0] ?? null;
}

/** Bu ay/yıl içinde personel+mağaza için tüm açık (durum='acik') raporları döner. */
export async function getAcikDegerlendirmeler(
  personelId: string,
  magazaId: string,
  ay: number,
  yil: number
): Promise<Degerlendirme[]> {
  const snap = await getDocs(
    query(
      collection(db, "degerlendirmeler"),
      where("personelId", "==", personelId),
      orderBy("olusturmaTarihi", "desc")
    )
  );
  const docs = snap.docs.map((d) => toDoc<Degerlendirme>(d));
  return docs.filter(
    (d) =>
      d.magazaId === magazaId &&
      d.ay === ay &&
      d.yil === yil &&
      d.durum === "acik"
  );
}

/** Açık bir raporun izlenmelerini ve puanını gerçek zamanlı günceller. */
export async function updateDegerlendirmeIzlenmeler(
  id: string,
  izlenmeler: SoruIzlenme[],
  toplamPuan: number | null,
  maxPuan: number | null
): Promise<void> {
  await updateDoc(doc(db, "degerlendirmeler", id), {
    ...cleanData({ izlenmeler, toplamPuan, maxPuan }),
    guncellemeTarihi: serverTimestamp(),
  });
}

/** Raporu kapatır: izlenmeler + puan kaydeder ve durum'u 'kapali' yapar. */
export async function finalizeDegerlendirme(
  id: string,
  izlenmeler: SoruIzlenme[],
  toplamPuan: number | null,
  maxPuan: number | null
): Promise<void> {
  await updateDoc(doc(db, "degerlendirmeler", id), {
    ...cleanData({ izlenmeler, toplamPuan, maxPuan }),
    durum: "kapali",
    guncellemeTarihi: serverTimestamp(),
  });
}
