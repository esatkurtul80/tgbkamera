export type CevapSecenegi = "evet" | "hayir" | "muaf";
export type SkorlamaSistemi = "esik" | "oran";
export type SoruTipi =
  | "evet_hayir_muaf"
  | "sayi"
  | "tarih"
  | "saat"
  | "kisa_metin"
  | "yorum";
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
  kameraman: "Kamera Gözlem",
};

export interface TimestampLike {
  toDate(): Date;
  seconds: number;
  nanoseconds: number;
}

export interface Kullanici<T = TimestampLike> {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  rol: KullaniciRol;
  magazaId?: string;
  bolgeId?: string;
  aktif: boolean;
  olusturmaTarihi: T;
  guncellemeTarihi: T;
  lastLoginAt?: T;
}

export interface Bolge<T = TimestampLike> {
  id: string;
  ad: string;
  aciklama?: string;
  bolgeMuduruId?: string;
  aktif: boolean;
  olusturmaTarihi: T;
  guncellemeTarihi: T;
}

export interface Magaza<T = TimestampLike> {
  id: string;
  ad: string;
  adres?: string;
  bolgeId?: string;
  magazaSorumlusuId?: string;
  aktif: boolean;
  olusturmaTarihi: T;
  guncellemeTarihi: T;
}

export interface Soru<T = TimestampLike> {
  id: string;
  metin: string;
  puan: number;
  hedefYuzde?: number;
  tip?: SoruTipi;
  olusturmaTarihi: T;
  guncellemeTarihi: T;
}

export interface Bolum<T = TimestampLike> {
  id: string;
  ad: string;
  aciklama: string;
  soruIdleri: string[];
  olusturmaTarihi: T;
  guncellemeTarihi: T;
}

export interface Form<T = TimestampLike> {
  id: string;
  ad: string;
  aciklama: string;
  puanli: boolean;
  skorlamaSistemi?: SkorlamaSistemi;
  /** true ise form mağaza raporlaması içindir; personel raporlama listelerinde görünmez. */
  magazaFormu?: boolean;
  bolumIdleri: string[];
  olusturmaTarihi: T;
  guncellemeTarihi: T;
}

export interface Personel<T = TimestampLike> {
  id: string;
  ad: string;
  unvan: string;
  departman: string;
  magazaIdleri: string[];
  aktif: boolean;
  olusturmaTarihi: T;
  guncellemeTarihi: T;
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

export interface Degerlendirme<T = TimestampLike> {
  id: string;
  formId: string;
  formAd: string;
  personelId: string;
  personelAd: string;
  magazaId: string;
  magazaAd: string;
  kameramanId: string;
  kameramanAd: string;
  izlenmeTarihi: T;
  raporlamaTarihi: T;
  /** true ise rapor personele değil mağazanın kendisine aittir (personelId/Ad boş). */
  magazaRaporu?: boolean;
  puanli: boolean;
  skorlamaSistemi?: SkorlamaSistemi;
  toplamPuan: number | null;
  maxPuan: number | null;
  cevaplar: Record<string, CevapSecenegi>;
  puansizCevaplar?: Record<string, PuansizCevapDegeri>;
  bolumSnapshot: Record<string, BolumSnapshot>;
  soruSnapshot: Record<string, SoruSnapshot>;
  olusturmaTarihi: T;
}
