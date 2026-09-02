import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  DocumentData,
  QueryDocumentSnapshot,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from './firebase';
import { generateCustomId } from './idUtils';
import type {
  Form,
  Bolum,
  Soru,
  SoruTipi,
  Personel,
  Magaza,
  Bolge,
  Kullanici,
  KullaniciRol,
  Degerlendirme,
  CopKutusuKaydi,
  SkorlamaSistemi,
  CevapSecenegi,
  BolumSnapshot,
  SoruSnapshot,
  PuansizCevapDegeri,
  SoruIzlenme,
  DegerlendirmeDurum,
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
    query(collection(db, 'personel'), orderBy('ad', 'asc'))
  );
  // Firestore'da 'aktif' alanı olmayan (eski/legacy) kayıtlar da aktif sayılır —
  // sadece açıkça aktif:false işaretlenmiş personel dışlanır.
  return snap.docs.map((d) => toDoc<Personel>(d)).filter((p) => p.aktif !== false);
}

export async function getPersonellerByMagaza(magazaId: string): Promise<Personel[]> {
  const snap = await getDocs(
    query(
      collection(db, 'personel'),
      where('magazaIdleri', 'array-contains', magazaId),
      orderBy('ad', 'asc')
    )
  );
  return snap.docs.map((d) => toDoc<Personel>(d)).filter((p) => p.aktif !== false);
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

/** Belirli bir ay/yıl için tüm raporlar (aylık izlenme raporu için). */
export async function getDegerlendirmelerByAyYil(ay: number, yil: number): Promise<Degerlendirme[]> {
  const snap = await getDocs(
    query(collection(db, 'degerlendirmeler'), where('ay', '==', ay), where('yil', '==', yil))
  );
  return snap.docs.map((d) => toDoc<Degerlendirme>(d));
}

/** Tüm raporlar (en yeni önce). `adet` ile sınırlanır; `oncesi` verilirse o tarihten
 *  eskilerini getirir (sayfalama imleci — "Daha Fazla Yükle"). */
export async function getTumDegerlendirmeler(adet?: number, oncesi?: Timestamp): Promise<Degerlendirme[]> {
  const kisitlar = [
    orderBy('olusturmaTarihi', 'desc'),
    ...(oncesi ? [where('olusturmaTarihi', '<', oncesi)] : []),
    ...(adet ? [limit(adet)] : []),
  ];
  const snap = await getDocs(query(collection(db, 'degerlendirmeler'), ...kisitlar));
  return snap.docs.map((d) => toDoc<Degerlendirme>(d));
}

export interface DegerlendirmeFiltre {
  personelId?: string;
  magazaId?: string;
  kameramanId?: string;
  formId?: string;
  ay?: number;
  yil?: number;
  durum?: DegerlendirmeDurum;
  tip?: 'matris' | 'yorumlu' | 'puansiz';
  puan?: 'yuksek' | 'orta' | 'dusuk';
  /** Bölge kapsamı: sonuçlar her koşulda bu mağazalarla sınırlanır (bölge müdürü). */
  magazaIdleri?: string[];
}

export interface DegerlendirmeSayfasi {
  liste: Degerlendirme[];
  /** Taranan son kaydın tarihi — bir sonraki sayfa çağrısına `oncesi` olarak verilir. */
  imlec: Timestamp | null;
  dahaVar: boolean;
}

const FILTRE_TARAMA_SAYFASI = 150;
const FILTRE_TARAMA_LIMITI = 600;

/** Filtreli rapor listesi — yalnızca yüklü sayfada değil, veritabanının tamamında arar.
 *  En seçici alan sunucuda sorgulanır (kompozit indeks), kalan kriterler bellekte elenir;
 *  istenen adede ulaşana dek eski kayıtlara doğru taranır (tek çağrıda tarama sınırı var,
 *  devamı aynı imleçle tekrar çağrılarak getirilir). */
export async function getDegerlendirmelerFiltreli(
  f: DegerlendirmeFiltre,
  adet = 100,
  oncesi?: Timestamp
): Promise<DegerlendirmeSayfasi> {
  // Sunucu tarafı birincil kısıt — seçicilik sırasına göre tek alan (indeks gerektirir)
  const sunucu: QueryConstraint[] = [];
  if (f.personelId) sunucu.push(where('personelId', '==', f.personelId));
  else if (f.magazaId) sunucu.push(where('magazaId', '==', f.magazaId));
  else if (f.magazaIdleri && f.magazaIdleri.length > 0 && f.magazaIdleri.length <= 10)
    // Bölge kapsamı sunucuda ('in' ≤10 mağaza); >10 mağaza bellekteki uyuyor() eler
    sunucu.push(where('magazaId', 'in', f.magazaIdleri));
  else if (f.kameramanId) sunucu.push(where('kameramanId', '==', f.kameramanId));
  else if (f.formId) sunucu.push(where('formId', '==', f.formId));
  else if (f.ay !== undefined && f.yil !== undefined)
    sunucu.push(where('ay', '==', f.ay), where('yil', '==', f.yil));

  const uyuyor = (d: Degerlendirme): boolean => {
    // Bölge kapsamı her kod yolunda garanti: birincil kısıt başka alana gittiyse de eler
    if (f.magazaIdleri && !f.magazaIdleri.includes(d.magazaId)) return false;
    if (f.personelId && d.personelId !== f.personelId) return false;
    if (f.magazaId && d.magazaId !== f.magazaId) return false;
    if (f.kameramanId && d.kameramanId !== f.kameramanId) return false;
    if (f.formId && d.formId !== f.formId) return false;
    if (f.ay !== undefined && d.ay !== f.ay) return false;
    if (f.yil !== undefined && d.yil !== f.yil) return false;
    // Eski kayıtlarda durum alanı yok = kapalı sayılır
    if (f.durum === 'acik' && d.durum !== 'acik') return false;
    if (f.durum === 'kapali' && d.durum === 'acik') return false;
    if (f.tip === 'matris' && !(d.puanli && d.puanGirisTipi !== 'manuel')) return false;
    if (f.tip === 'yorumlu' && !(d.puanli && d.puanGirisTipi === 'manuel')) return false;
    if (f.tip === 'puansiz' && d.puanli) return false;
    if (f.puan) {
      if (!d.puanli || d.toplamPuan === null) return false;
      const y = d.maxPuan && d.maxPuan > 0 ? Math.round((d.toplamPuan / d.maxPuan) * 100) : d.toplamPuan;
      if (f.puan === 'yuksek' && y < 80) return false;
      if (f.puan === 'orta' && (y < 50 || y >= 80)) return false;
      if (f.puan === 'dusuk' && y >= 50) return false;
    }
    return true;
  };

  const liste: Degerlendirme[] = [];
  let imlec: Timestamp | null = oncesi ?? null;
  let taranan = 0;
  let sunucuKisitAktif = sunucu.length > 0;

  while (taranan < FILTRE_TARAMA_LIMITI) {
    const kisitlar: QueryConstraint[] = [
      ...(sunucuKisitAktif ? sunucu : []),
      orderBy('olusturmaTarihi', 'desc'),
      ...(imlec ? [where('olusturmaTarihi', '<', imlec)] : []),
      limit(FILTRE_TARAMA_SAYFASI),
    ];
    let snap;
    try {
      snap = await getDocs(query(collection(db, 'degerlendirmeler'), ...kisitlar));
    } catch (e: any) {
      // Kompozit indeks henüz oluşmadıysa sunucu kısıtı olmadan tarayıp bellekte ele
      if (sunucuKisitAktif && String(e?.code ?? e?.message ?? e).includes('failed-precondition')) {
        sunucuKisitAktif = false;
        continue;
      }
      throw e;
    }
    const sayfa = snap.docs.map((d) => toDoc<Degerlendirme>(d));
    taranan += sayfa.length;
    for (const d of sayfa) {
      if (uyuyor(d)) {
        liste.push(d);
        // Adet dolunca imleci tam bu kayıtta bırak — sayfanın kalanı bir sonraki çağrıda taranır
        if (liste.length >= adet) return { liste, imlec: d.olusturmaTarihi, dahaVar: true };
      }
    }
    if (sayfa.length > 0) imlec = sayfa[sayfa.length - 1].olusturmaTarihi;
    if (sayfa.length < FILTRE_TARAMA_SAYFASI) return { liste, imlec, dahaVar: false };
  }
  return { liste, imlec, dahaVar: true };
}

export async function getBolgeler(): Promise<Bolge[]> {
  const snap = await getDocs(query(collection(db, 'bolgeler'), orderBy('ad', 'asc')));
  return snap.docs.map((d) => toDoc<Bolge>(d)).filter((b) => b.aktif !== false);
}

/** Bölgenin aktif mağazaları. Bilerek sunucu orderBy yok (bolgeId+ad kompozit
 *  indeksi gerektirmemek için) — sıralama ve aktif filtresi bellekte. */
export async function getMagazalarByBolge(bolgeId: string): Promise<Magaza[]> {
  const snap = await getDocs(
    query(collection(db, 'magazalar'), where('bolgeId', '==', bolgeId))
  );
  return snap.docs
    .map((d) => toDoc<Magaza>(d))
    .filter((m) => m.aktif !== false)
    .sort((a, b) => a.ad.localeCompare(b.ad, 'tr'));
}

/** Verilen mağazaların raporları — bölge müdürü kapsamı. 'in' sorgusu 10'luk
 *  parçalara bölünür (firebase 9.23 sınırı); birleşim tarihe göre yeniden sıralanır. */
export async function getDegerlendirmelerByMagazaIds(
  magazaIdleri: string[],
  chunkLimit = 400
): Promise<Degerlendirme[]> {
  if (magazaIdleri.length === 0) return [];
  const parcalar: string[][] = [];
  for (let i = 0; i < magazaIdleri.length; i += 10) parcalar.push(magazaIdleri.slice(i, i + 10));
  const snaplar = await Promise.all(
    parcalar.map((ids) =>
      getDocs(
        query(
          collection(db, 'degerlendirmeler'),
          where('magazaId', 'in', ids),
          orderBy('olusturmaTarihi', 'desc'),
          limit(chunkLimit)
        )
      )
    )
  );
  const hepsi = snaplar.flatMap((s) => s.docs.map((d) => toDoc<Degerlendirme>(d)));
  hepsi.sort((a, b) => (b.olusturmaTarihi?.seconds ?? 0) - (a.olusturmaTarihi?.seconds ?? 0));
  return hepsi;
}

/** Bölge müdürü rolündeki kullanıcılar — mağaza filtresinde kullanılır. */
export async function getBolgeMudurleri(): Promise<Kullanici[]> {
  const snap = await getDocs(query(collection(db, 'users'), where('rol', '==', 'bolge_muduru')));
  return snap.docs.map((d) => toDoc<Kullanici>(d)).filter((k) => k.aktif !== false);
}

/** Bu ay/yıl içinde personel+mağaza için TÜM raporları döner (durum fark etmez).
 *  Puanlı matris raporları baştan 'kapali' oluşturulduğu için aylık rapora devam
 *  etme (dedupe) araması durumdan bağımsız yapılmalı (weble aynı davranış). */
export async function getAylikDegerlendirmeler(
  personelId: string,
  magazaId: string,
  ay: number,
  yil: number
): Promise<Degerlendirme[]> {
  const snap = await getDocs(
    query(
      collection(db, 'degerlendirmeler'),
      where('personelId', '==', personelId),
      orderBy('olusturmaTarihi', 'desc')
    )
  );
  const docs = snap.docs.map((d) => toDoc<Degerlendirme>(d));
  return docs.filter((d) => d.magazaId === magazaId && d.ay === ay && d.yil === yil);
}

/** Bu ay/yıl içinde personel+mağaza için tüm açık (durum='acik') raporları döner. */
export async function getAcikDegerlendirmeler(
  personelId: string,
  magazaId: string,
  ay: number,
  yil: number
): Promise<Degerlendirme[]> {
  const docs = await getAylikDegerlendirmeler(personelId, magazaId, ay, yil);
  return docs.filter((d) => d.durum === 'acik');
}

/** Raporun durumunu günceller — eskiden 'acik' kalmış puanlı matris raporlarını kapatmak için. */
export async function setDegerlendirmeDurum(id: string, durum: 'acik' | 'kapali'): Promise<void> {
  await updateDoc(doc(db, 'degerlendirmeler', id), { durum, guncellemeTarihi: serverTimestamp() });
}

/** Personelin tüm açık raporları (mağaza/ay kısıtı olmadan) — "devam eden rapor" listesi için. */
export async function getPersonelAcikRaporlari(personelId: string): Promise<Degerlendirme[]> {
  const snap = await getDocs(
    query(
      collection(db, 'degerlendirmeler'),
      where('personelId', '==', personelId),
      orderBy('olusturmaTarihi', 'desc')
    )
  );
  return snap.docs.map((d) => toDoc<Degerlendirme>(d)).filter((d) => d.durum === 'acik');
}

/**
 * Bir raporun izlenmelerini ve puanını günceller. Rapor sahibi (kameramanId/Ad)
 * ilk oluşturan kişide sabit kalır — günü kimin işaretlediği izlenme bazında
 * kaydedenId/kaydedenAd alanlarında tutulur (weble aynı davranış).
 */
export async function updateDegerlendirmeIzlenmeler(
  id: string,
  izlenmeler: SoruIzlenme[],
  toplamPuan: number | null,
  maxPuan: number | null
): Promise<void> {
  await updateDoc(doc(db, 'degerlendirmeler', id), {
    ...cleanData({ izlenmeler, toplamPuan, maxPuan }),
    guncellemeTarihi: serverTimestamp(),
  });
}

/** Açık bir puansız/yorumlu-puanlı raporu günceller veya kapatır. */
export async function updatePuansizDegerlendirme(
  id: string,
  data: {
    puansizCevaplar?: Record<string, PuansizCevapDegeri>;
    izlenmeTarihi?: import('firebase/firestore').Timestamp;
    toplamPuan?: number | null;
    maxPuan?: number | null;
    durum?: DegerlendirmeDurum;
    kameramanId?: string;
    kameramanAd?: string;
  }
): Promise<void> {
  await updateDoc(doc(db, 'degerlendirmeler', id), {
    ...cleanData(data),
    guncellemeTarihi: serverTimestamp(),
  });
}

/** Personel kaydını günceller (mağaza atama/çıkarma için magazaIdleri). */
export async function updatePersonel(id: string, data: Partial<Personel>): Promise<void> {
  await updateDoc(doc(db, 'personel', id), cleanData(data) as DocumentData);
}

/** Kameramanın favori mağaza listesini kaydeder. */
export async function updateKullaniciFavoriMagazalar(uid: string, magazaIdleri: string[]): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { favoriMagazaIdleri: magazaIdleri });
}

// ─── Yönetim: Kullanıcılar ───────────────────────────────────────────────────

export async function getKullanicilar(): Promise<Kullanici[]> {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs
    .map((d) => toDoc<Kullanici>(d))
    .sort((a, b) => (a.displayName || '').localeCompare(b.displayName || '', 'tr'));
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
  await updateDoc(doc(db, 'users', id), {
    ...cleanData(data),
    guncellemeTarihi: serverTimestamp(),
  });
}

// ─── Yönetim: Bölgeler ───────────────────────────────────────────────────────

export async function createBolge(data: { ad: string; aciklama?: string; bolgeMuduruId?: string }): Promise<string> {
  const customId = generateCustomId(data.ad);
  await setDoc(doc(db, 'bolgeler', customId), {
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
  await updateDoc(doc(db, 'bolgeler', id), { ...cleanData(data), guncellemeTarihi: serverTimestamp() });
}

export async function deleteBolge(id: string): Promise<void> {
  await deleteDoc(doc(db, 'bolgeler', id));
}

// ─── Yönetim: Mağazalar ──────────────────────────────────────────────────────

/** Pasifler dahil tüm mağazalar (yönetim ekranı için). */
export async function getTumMagazalar(): Promise<Magaza[]> {
  const snap = await getDocs(query(collection(db, 'magazalar'), orderBy('ad', 'asc')));
  return snap.docs.map((d) => toDoc<Magaza>(d));
}

export async function createMagaza(data: { ad: string; adres?: string; bolgeId?: string }): Promise<string> {
  const customId = generateCustomId(data.ad);
  await setDoc(doc(db, 'magazalar', customId), {
    ...cleanData(data),
    aktif: true,
    olusturmaTarihi: serverTimestamp(),
    guncellemeTarihi: serverTimestamp(),
  });
  return customId;
}

export async function updateMagaza(
  id: string,
  data: { ad: string; adres?: string; bolgeId?: string; aktif: boolean }
): Promise<void> {
  await updateDoc(doc(db, 'magazalar', id), { ...cleanData(data), guncellemeTarihi: serverTimestamp() });
}

// ─── Yönetim: Sorular ────────────────────────────────────────────────────────

export async function getSorular(): Promise<Soru[]> {
  const snap = await getDocs(query(collection(db, 'sorular'), orderBy('olusturmaTarihi', 'desc')));
  return snap.docs.map((d) => toDoc<Soru>(d));
}

export async function createSoru(data: { metin: string; puan: number; hedefYuzde?: number; tip?: SoruTipi }): Promise<string> {
  const customId = generateCustomId(data.metin);
  await setDoc(doc(db, 'sorular', customId), {
    ...cleanData(data),
    olusturmaTarihi: serverTimestamp(),
    guncellemeTarihi: serverTimestamp(),
  });
  return customId;
}

export async function updateSoru(
  id: string,
  data: { metin: string; puan: number; hedefYuzde?: number; tip?: SoruTipi }
): Promise<void> {
  await updateDoc(doc(db, 'sorular', id), { ...cleanData(data), guncellemeTarihi: serverTimestamp() });
}

export async function deleteSoru(id: string): Promise<void> {
  await deleteDoc(doc(db, 'sorular', id));
}

// ─── Yönetim: Bölümler / Formlar (webdeki homojenlik kuralının aynısı) ───────

/** Soru sınıfı: evet/hayır/muaf tipli (veya tipsiz) sorular puanlı, diğerleri puansızdır. */
function soruSinifi(s: Soru): 'puanli' | 'puansiz' {
  return !s.tip || s.tip === 'evet_hayir_muaf' ? 'puanli' : 'puansiz';
}

async function sorulariGetir(ids: string[]): Promise<Soru[]> {
  const bulunan = await Promise.all(ids.map((id) => getSoru(id)));
  return bulunan.filter(Boolean) as Soru[];
}

async function bolumHomojenMi(soruIdleri: string[]): Promise<void> {
  if (soruIdleri.length === 0) return;
  const sorular = await sorulariGetir(soruIdleri);
  const siniflar = new Set(sorular.map(soruSinifi));
  if (siniflar.size > 1) {
    throw new Error('Bölüm karışık soru tiplerinden oluşamaz (puanlı ve puansız sorular aynı bölümde olamaz).');
  }
}

export async function getBolumler(): Promise<Bolum[]> {
  const snap = await getDocs(query(collection(db, 'bolumler'), orderBy('olusturmaTarihi', 'desc')));
  return snap.docs.map((d) => toDoc<Bolum>(d));
}

export async function createBolum(data: { ad: string; aciklama: string; soruIdleri: string[] }): Promise<string> {
  await bolumHomojenMi(data.soruIdleri);
  const customId = generateCustomId(data.ad);
  await setDoc(doc(db, 'bolumler', customId), {
    ...cleanData(data),
    olusturmaTarihi: serverTimestamp(),
    guncellemeTarihi: serverTimestamp(),
  });
  return customId;
}

export async function updateBolum(id: string, data: { ad: string; aciklama: string; soruIdleri: string[] }): Promise<void> {
  await bolumHomojenMi(data.soruIdleri);
  await updateDoc(doc(db, 'bolumler', id), { ...cleanData(data), guncellemeTarihi: serverTimestamp() });
}

export async function deleteBolum(id: string): Promise<void> {
  await deleteDoc(doc(db, 'bolumler', id));
}

async function formBolumleriniDogrula(
  bolumIdleri: string[],
  puanli: boolean,
  puanGirisTipi?: 'otomatik' | 'manuel'
): Promise<void> {
  const gerekli: 'puanli' | 'puansiz' = puanli && puanGirisTipi !== 'manuel' ? 'puanli' : 'puansiz';
  for (const bolumId of bolumIdleri) {
    const bolum = await getBolum(bolumId);
    if (!bolum || bolum.soruIdleri.length === 0) continue;
    const sorular = await sorulariGetir(bolum.soruIdleri);
    const siniflar = new Set(sorular.map(soruSinifi));
    if (siniflar.size > 1) throw new Error(`"${bolum.ad}" bölümü karışık soru tiplerinden oluşuyor, forma atanamaz.`);
    const sinif = sorular.length > 0 ? soruSinifi(sorular[0]) : null;
    if (sinif && sinif !== gerekli) {
      throw new Error(
        `"${bolum.ad}" bölümü ${sinif === 'puanli' ? 'puanlı' : 'puansız'} sorulardan oluşuyor, ${gerekli === 'puanli' ? 'puanlı' : 'puansız'} forma atanamaz.`
      );
    }
  }
}

export async function createForm(data: {
  ad: string;
  aciklama: string;
  puanli: boolean;
  puanGirisTipi?: 'otomatik' | 'manuel';
  skorlamaSistemi?: SkorlamaSistemi;
  bolumIdleri: string[];
}): Promise<string> {
  await formBolumleriniDogrula(data.bolumIdleri, data.puanli, data.puanGirisTipi);
  const customId = generateCustomId(data.ad);
  await setDoc(doc(db, 'formlar', customId), {
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
    puanGirisTipi?: 'otomatik' | 'manuel';
    skorlamaSistemi?: SkorlamaSistemi;
    bolumIdleri: string[];
  }
): Promise<void> {
  await formBolumleriniDogrula(data.bolumIdleri, data.puanli, data.puanGirisTipi);
  await updateDoc(doc(db, 'formlar', id), { ...cleanData(data), guncellemeTarihi: serverTimestamp() });
}

export async function deleteForm(id: string): Promise<void> {
  await deleteDoc(doc(db, 'formlar', id));
}

// ─── Yönetim: Personel ───────────────────────────────────────────────────────

/** Pasifler dahil tüm personel (yönetim ekranı için). */
export async function getPersoneller(): Promise<Personel[]> {
  const snap = await getDocs(query(collection(db, 'personel'), orderBy('ad', 'asc')));
  return snap.docs.map((d) => toDoc<Personel>(d));
}

export async function createPersonel(data: { ad: string; tc: string; magazaIdleri?: string[] }): Promise<string> {
  const customId = generateCustomId(data.ad);
  await setDoc(doc(db, 'personel', customId), {
    ...cleanData(data),
    magazaIdleri: data.magazaIdleri ?? [],
    aktif: true,
    olusturmaTarihi: serverTimestamp(),
    guncellemeTarihi: serverTimestamp(),
  });
  return customId;
}

// ─── Çöp Kutusu ──────────────────────────────────────────────────────────────

const COP_KUTUSU_SAKLAMA_GUN = 30;

export async function getCopKutusu(): Promise<CopKutusuKaydi[]> {
  const snap = await getDocs(query(collection(db, 'cop_kutusu'), orderBy('silinmeTarihi', 'desc')));
  return snap.docs.map((d) => toDoc<CopKutusuKaydi>(d));
}

/** Raporu çöp kutusuna taşır (webdeki soft delete ile birebir aynı). */
export async function softDeleteDegerlendirme(deg: Degerlendirme, silen: { id: string; ad: string }): Promise<void> {
  const simdi = Timestamp.now();
  const otomatikSilinmeTarihi = Timestamp.fromMillis(simdi.toMillis() + COP_KUTUSU_SAKLAMA_GUN * 24 * 60 * 60 * 1000);
  const { id, ...veri } = deg;
  const batch = writeBatch(db);
  batch.set(doc(db, 'cop_kutusu', id), {
    ...cleanData(veri),
    orijinalId: id,
    silinmeTarihi: simdi,
    silenKullaniciId: silen.id,
    silenKullaniciAd: silen.ad,
    otomatikSilinmeTarihi,
  });
  batch.delete(doc(db, 'degerlendirmeler', id));
  await batch.commit();
}

/** Çöp kutusundaki kaydı aynı ID ile değerlendirmelere geri taşır. */
export async function restoreDegerlendirmeFromCopKutusu(id: string): Promise<void> {
  const snap = await getDoc(doc(db, 'cop_kutusu', id));
  if (!snap.exists()) return;
  const {
    orijinalId: _o,
    silinmeTarihi: _s,
    silenKullaniciId: _sk,
    silenKullaniciAd: _sa,
    otomatikSilinmeTarihi: _ot,
    ...degData
  } = snap.data() as Record<string, unknown>;
  const batch = writeBatch(db);
  batch.set(doc(db, 'degerlendirmeler', id), degData);
  batch.delete(doc(db, 'cop_kutusu', id));
  await batch.commit();
}

/**
 * Bir personelin, verilen rapordan önce oluşturulmuş son `adet` puanlı kapalı raporu —
 * rapor detayındaki "Son Rapor Puanları" alanı için (weble aynı mantık).
 */
export async function getOncekiRaporPuanlari(d: Degerlendirme, adet = 3): Promise<Degerlendirme[]> {
  const snap = await getDocs(
    query(
      collection(db, 'degerlendirmeler'),
      where('personelId', '==', d.personelId),
      orderBy('olusturmaTarihi', 'desc'),
      limit(30)
    )
  );
  const suAn = d.olusturmaTarihi?.toMillis() ?? Infinity;
  return snap.docs
    .map((x) => toDoc<Degerlendirme>(x))
    .filter(
      (r) =>
        r.id !== d.id &&
        r.durum !== 'acik' &&
        r.toplamPuan !== null &&
        (r.olusturmaTarihi?.toMillis() ?? 0) < suAn
    )
    .slice(0, adet);
}

export async function getDegerlendirme(id: string): Promise<Degerlendirme | null> {
  const snap = await getDoc(doc(db, 'degerlendirmeler', id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Degerlendirme) : null;
}

export async function createDegerlendirme(
  data: {
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
    ay: number;
    yil: number;
    durum: DegerlendirmeDurum;
    izlenmeler: SoruIzlenme[];
    puanli: boolean;
    puanGirisTipi?: 'otomatik' | 'manuel';
    skorlamaSistemi?: SkorlamaSistemi;
    toplamPuan: number | null;
    maxPuan: number | null;
    cevaplar: Record<string, CevapSecenegi>;
    puansizCevaplar?: Record<string, PuansizCevapDegeri>;
    bolumSnapshot: Record<string, BolumSnapshot>;
    soruSnapshot: Record<string, SoruSnapshot>;
  },
  id?: string
): Promise<string> {
  const customId = id ?? generateCustomId(data.personelAd);
  await setDoc(doc(db, 'degerlendirmeler', customId), {
    ...cleanData(data),
    olusturmaTarihi: serverTimestamp(),
  });
  return customId;
}
