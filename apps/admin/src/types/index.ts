import { Timestamp } from "firebase/firestore";

export type CevapSecenegi = "evet" | "hayir" | "muaf";
export type SkorlamaSistemi = "esik" | "oran";
export type SoruTipi =
  | "evet_hayir_muaf"
  | "sayi"
  | "tarih"
  | "saat"
  | "kisa_metin"
  | "yorum";
/** puanli: matris/skorlu (tip yok) | puansiz: serbest tipli, form puansız | yorumlu_puanli: serbest tipli, form manuel toplam puanlı */
export type SoruKategori = "puanli" | "puansiz" | "yorumlu_puanli";
export type KullaniciRol =
  | "admin"
  | "sirketsahibi"
  | "ust_yonetici"
  | "bolge_muduru"
  | "magaza_sorumlusu"
  | "kameraman";

export const ROL_ETIKETLERI: Record<KullaniciRol, string> = {
  admin: "Admin",
  sirketsahibi: "Şirket Sahibi",
  ust_yonetici: "Üst Yönetici",
  bolge_muduru: "Bölge Müdürü",
  magaza_sorumlusu: "Mağaza",
  kameraman: "Kameraman",
};

export interface Kullanici {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  rol: KullaniciRol;
  magazaId?: string;
  magazaIdleri?: string[];
  bolgeId?: string;
  favoriMagazaIdleri?: string[];
  aktif: boolean;
  olusturmaTarihi: Timestamp;
  guncellemeTarihi: Timestamp;
  lastLoginAt?: Timestamp;
}

export interface Bolge {
  id: string;
  ad: string;
  aciklama?: string;
  bolgeMuduruId?: string;
  aktif: boolean;
  olusturmaTarihi: Timestamp;
  guncellemeTarihi: Timestamp;
}

export interface Magaza {
  id: string;
  ad: string;
  adres?: string;
  bolgeId?: string;
  magazaSorumlusuId?: string;
  aktif: boolean;
  olusturmaTarihi: Timestamp;
  guncellemeTarihi: Timestamp;
}

export interface Soru {
  id: string;
  metin: string;
  puan: number;
  hedefYuzde?: number;
  tip?: SoruTipi;
  /** yoksa eski kayıtlar için tip varlığına göre türetilir (bkz. lib/homojenlik soruSinifi) */
  kategori?: SoruKategori;
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
  /** puanli=true iken: "otomatik" (matris/izlenme bazlı, varsayılan) | "manuel" (yorumlu puanlı — puansız gibi cevaplanır, puan elle girilir) */
  puanGirisTipi?: "otomatik" | "manuel";
  skorlamaSistemi?: SkorlamaSistemi;
  bolumIdleri: string[];
  olusturmaTarihi: Timestamp;
  guncellemeTarihi: Timestamp;
}

export interface Personel {
  id: string;
  ad: string;
  tc: string;
  magazaIdleri: string[];
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

/** Tek bir izlenme anı: tarih/saat + o ana ait tüm cevaplar */
export interface SoruIzlenme {
  id: string;
  tarih: Timestamp;
  cevaplar: Record<string, CevapSecenegi>;
  /** Hücre bazlı notlar: soruId → not metni (matris hücresine sağ tık → "Hücreye Not Ekle") */
  notlar?: Record<string, string>;
  /** Bu günün işaretlemesini yapan kullanıcı — yalnızca canlı ekranda gösterilir, export/PDF'e taşınmaz. */
  kaydedenId?: string;
  kaydedenAd?: string;
}

export type DegerlendirmeDurum = 'acik' | 'kapali';

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

  /** Hangi ay (0-11) */
  ay: number;
  /** Hangi yıl */
  yil: number;

  /** 'acik': devam eden, 'kapali': tamamlanmış. Eski kayıtlarda undefined = kapali. */
  durum?: DegerlendirmeDurum;

  puanli: boolean;
  /** puanli=true iken: "otomatik" (matris/izlenme bazlı, varsayılan) | "manuel" (yorumlu puanlı — puansız gibi cevaplanır, puan elle girilir). Formdan snapshot alınır. */
  puanGirisTipi?: "otomatik" | "manuel";
  skorlamaSistemi?: SkorlamaSistemi;

  /** Çoklu izlenme anları (yeni format) */
  izlenmeler: SoruIzlenme[];

  toplamPuan: number | null;
  maxPuan: number | null;
  bolumSnapshot: Record<string, BolumSnapshot>;
  soruSnapshot: Record<string, SoruSnapshot>;
  olusturmaTarihi: Timestamp;

  /** @deprecated Eski tek-cevap formatı — geriye uyumluluk için */
  cevaplar?: Record<string, CevapSecenegi>;
  /** @deprecated Eski tek-tarih formatı */
  izlenmeTarihi?: Timestamp;
  raporlamaTarihi?: Timestamp;

  /** Puansız veya yorumlu puanlı formlar için soru başına tip'e göre cevap */
  puansizCevaplar?: Record<string, PuansizCevapDegeri>;
}

/** Silinen bir değerlendirmenin çöp kutusundaki hâli — 30 gün saklanır, sonra otomatik (Firestore TTL) silinir. */
export interface CopKutusuKaydi extends Omit<Degerlendirme, "id"> {
  id: string;
  /** Orijinal değerlendirme dokümanının ID'si — geri getirilince aynı ID ile eski hâline döner. */
  orijinalId: string;
  silinmeTarihi: Timestamp;
  silenKullaniciId: string;
  silenKullaniciAd: string;
  /** Firestore TTL politikası bu alana göre çalışır — silinmeTarihi + 30 gün. */
  otomatikSilinmeTarihi: Timestamp;
}

