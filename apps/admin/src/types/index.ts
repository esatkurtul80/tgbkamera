import { Timestamp } from "firebase/firestore";

export type CevapSecenegi = "evet" | "hayir" | "muaf";

export interface Soru {
  id: string;
  metin: string;
  puan: number;
  olusturmaTarihi: Timestamp;
  guncellemeTarihi: Timestamp;
}

export interface Bolum {
  id: string;
  ad: string;
  aciklama: string;
  soruIdleri: string[];
  olusturmaTarihi: Timestamp;
  guncellemeTarihi: Timestamp;
}

export interface Form {
  id: string;
  ad: string;
  aciklama: string;
  puanli: boolean;
  bolumIdleri: string[];
  olusturmaTarihi: Timestamp;
  guncellemeTarihi: Timestamp;
}

export interface Personel {
  id: string;
  ad: string;
  unvan: string;
  departman: string;
  aktif: boolean;
  olusturmaTarihi: Timestamp;
  guncellemeTarihi: Timestamp;
}

export interface BolumSnapshot {
  ad: string;
  soruIdleri: string[];
}

export interface SoruSnapshot {
  metin: string;
  puan: number;
}

export interface Degerlendirme {
  id: string;
  formId: string;
  formAd: string;
  personelId: string;
  personelAd: string;
  degerlendiren: string;
  tarih: Timestamp;
  puanli: boolean;
  toplamPuan: number | null;
  maxPuan: number | null;
  cevaplar: Record<string, CevapSecenegi>;
  bolumSnapshot: Record<string, BolumSnapshot>;
  soruSnapshot: Record<string, SoruSnapshot>;
  olusturmaTarihi: Timestamp;
}
