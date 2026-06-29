import { Timestamp } from 'firebase/firestore';

export type CevapSecenegi = 'evet' | 'hayir' | 'muaf';
export type SkorlamaSistemi = 'esik' | 'oran';
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
}

export interface SoruIzlenme {
  id: string;
  tarih: Timestamp;
  cevaplar: Record<string, CevapSecenegi>;
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
  puanli: boolean;
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
}

