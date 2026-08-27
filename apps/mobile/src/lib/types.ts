import { Timestamp } from 'firebase/firestore';

export type CevapSecenegi = 'evet' | 'hayir' | 'muaf';
export type SkorlamaSistemi = 'esik' | 'oran';
export type SoruTipi =
  | 'evet_hayir_muaf'
  | 'sayi'
  | 'tarih'
  | 'saat'
  | 'kisa_metin'
  | 'yorum';
export type KullaniciRol =
  | 'admin'
  | 'sirketsahibi'
  | 'ust_yonetici'
  | 'bolge_muduru'
  | 'magaza_sorumlusu'
  | 'kameraman';

export interface Kullanici {
  id: string;
  email: string;
  displayName: string;
  rol: KullaniciRol;
  magazaId?: string;
  magazaIdleri?: string[];
  bolgeId?: string;
  favoriMagazaIdleri?: string[];
  aktif: boolean;
}

export interface Bolge {
  id: string;
  ad: string;
  aciklama?: string;
  bolgeMuduruId?: string;
  aktif: boolean;
}

export interface Magaza {
  id: string;
  ad: string;
  adres?: string;
  bolgeId?: string;
  aktif: boolean;
}

export interface Soru {
  id: string;
  metin: string;
  puan: number;
  hedefYuzde?: number;
  tip?: SoruTipi;
}

export interface Bolum {
  id: string;
  ad: string;
  aciklama: string;
  soruIdleri: string[];
}

export interface Form {
  id: string;
  ad: string;
  aciklama: string;
  puanli: boolean;
  /** puanli=true iken: "otomatik" (matris bazlı, varsayılan) | "manuel" (yorumlu puanlı — puansız gibi cevaplanır, puan elle girilir) */
  puanGirisTipi?: 'otomatik' | 'manuel';
  skorlamaSistemi?: SkorlamaSistemi;
  bolumIdleri: string[];
}

export interface Personel {
  id: string;
  ad: string;
  tc: string;
  magazaIdleri: string[];
  aktif: boolean;
}

export interface BolumSnapshot {
  ad: string;
  soruIdleri: string[];
}

export interface SoruSnapshot {
  metin: string;
  puan: number;
  hedefYuzde?: number;
  tip?: SoruTipi;
}

export interface PuansizCevapDegeri {
  evetHayirMuaf?: CevapSecenegi;
  sayi?: number;
  tarih?: string;
  saat?: string;
  kisaMetin?: string;
  yorum?: string;
  fotograflar?: string[];
}

export interface SoruIzlenme {
  id: string;
  tarih: Timestamp;
  cevaplar: Record<string, CevapSecenegi>;
  /** Hücre bazlı notlar: soruId → not metni */
  notlar?: Record<string, string>;
  kaydedenId?: string;
  kaydedenAd?: string;
}

export type DegerlendirmeDurum = 'acik' | 'kapali';

/** Silinen değerlendirmenin çöp kutusundaki hâli — 30 gün saklanır. */
export interface CopKutusuKaydi {
  id: string;
  orijinalId: string;
  personelAd: string;
  magazaAd: string;
  formAd: string;
  puanli: boolean;
  toplamPuan: number | null;
  maxPuan: number | null;
  silinmeTarihi: Timestamp;
  silenKullaniciId: string;
  silenKullaniciAd: string;
  otomatikSilinmeTarihi: Timestamp;
}

export interface Degerlendirme {
  id: string;
  formId: string;
  formAd: string;
  personelId: string;
  personelAd: string;
  magazaId: string;
  magazaAd: string;
  kameramanId: string;
  kameramanAd: string;
  ay: number;
  yil: number;
  /** 'acik': devam eden, 'kapali': tamamlanmış. Eski kayıtlarda undefined = kapali. */
  durum?: DegerlendirmeDurum;
  puanli: boolean;
  /** puanli=true iken: "otomatik" (matris bazlı, varsayılan) | "manuel" (yorumlu puanlı — puansız gibi cevaplanır, puan elle girilir). Formdan snapshot alınır. */
  puanGirisTipi?: 'otomatik' | 'manuel';
  skorlamaSistemi?: SkorlamaSistemi;
  izlenmeler: SoruIzlenme[];
  toplamPuan: number | null;
  maxPuan: number | null;
  bolumSnapshot: Record<string, BolumSnapshot>;
  soruSnapshot: Record<string, SoruSnapshot>;
  olusturmaTarihi: Timestamp;
  cevaplar?: Record<string, CevapSecenegi>;
  izlenmeTarihi?: Timestamp;
  raporlamaTarihi?: Timestamp;
  puansizCevaplar?: Record<string, PuansizCevapDegeri>;
}

