/** PDF/rapor tasarım ayarları: firma logosu ve metin rolleri için yazı tipleri. */

export interface RaporFontlari {
  /** Üst banttaki firma adı (TUĞBA KURUYEMİŞ) */
  firma: string;
  /** Üst banttaki alt başlık (DEĞERLENDİRME RAPORU) */
  altBaslik: string;
  /** Rapor başlığı (form adı) */
  baslik: string;
  /** Künye değerleri (personel, mağaza, tarihler) */
  kunye: string;
  /** Puan panelindeki büyük sayı */
  puan: string;
  /** Bölüm başlıkları ("01 BÖLÜM ADI" satırları) */
  bolumBaslik: string;
  /** Soru metinleri (kart başlıkları) */
  soruBaslik: string;
  /** Cevap, yorum ve not metinleri */
  metin: string;
}

/** Metin rolleri için px cinsinden yazı boyutları. */
export interface RaporFontBoyutlari {
  firma: number;
  altBaslik: number;
  baslik: number;
  kunye: number;
  puan: number;
  bolumBaslik: number;
  soruBaslik: number;
  metin: number;
}

/** Üst bant yazıları için px cinsinden harf aralığı (letter-spacing). */
export interface RaporHarfAraliklari {
  firma: number;
  altBaslik: number;
}

export interface RaporTasarimAyarlari {
  logoUrl?: string;
  fontlar: RaporFontlari;
  boyutlar: RaporFontBoyutlari;
  harfAraliklar: RaporHarfAraliklari;
}

export interface FontSecenegi {
  key: string;
  etiket: string;
  css: string;
}

export const FONT_SECENEKLERI: FontSecenegi[] = [
  { key: "playfair",   etiket: "Playfair Display (Serif)", css: "var(--font-playfair), Georgia, serif" },
  { key: "archivo",    etiket: "Archivo (Sans)",           css: "var(--font-archivo), Arial, sans-serif" },
  { key: "splinemono", etiket: "Spline Sans Mono",         css: "var(--font-splinemono), monospace" },
  { key: "georgia",    etiket: "Georgia (Serif)",          css: "Georgia, 'Times New Roman', serif" },
  { key: "sistem",     etiket: "Sistem Yazı Tipi",         css: "'Segoe UI', -apple-system, Roboto, Arial, sans-serif" },
];

export const VARSAYILAN_RAPOR_FONTLARI: RaporFontlari = {
  firma: "archivo",
  altBaslik: "archivo",
  baslik: "playfair",
  kunye: "archivo",
  puan: "playfair",
  bolumBaslik: "archivo",
  soruBaslik: "archivo",
  metin: "archivo",
};

export const VARSAYILAN_RAPOR_BOYUTLARI: RaporFontBoyutlari = {
  firma: 13,
  altBaslik: 11,
  baslik: 27,
  kunye: 13,
  puan: 42,
  bolumBaslik: 13,
  soruBaslik: 13,
  metin: 12.5,
};

export const VARSAYILAN_RAPOR_HARF_ARALIKLARI: RaporHarfAraliklari = {
  firma: 1.8,
  altBaslik: 1.5,
};

export const VARSAYILAN_RAPOR_TASARIMI: RaporTasarimAyarlari = {
  fontlar: VARSAYILAN_RAPOR_FONTLARI,
  boyutlar: VARSAYILAN_RAPOR_BOYUTLARI,
  harfAraliklar: VARSAYILAN_RAPOR_HARF_ARALIKLARI,
};

/** Ayarlardaki font anahtarını CSS font-family değerine çevirir (bilinmeyen anahtar → sistem). */
export function fontCss(key: string): string {
  return FONT_SECENEKLERI.find((f) => f.key === key)?.css ?? FONT_SECENEKLERI[4].css;
}

/** Kayıtlı (kısmi) ayarı varsayılanlarla birleştirir. */
export function tasarimBirlestir(kayitli: Partial<RaporTasarimAyarlari> | null): RaporTasarimAyarlari {
  const fontlar = { ...VARSAYILAN_RAPOR_FONTLARI, ...(kayitli?.fontlar ?? {}) };
  const boyutlar = { ...VARSAYILAN_RAPOR_BOYUTLARI, ...(kayitli?.boyutlar ?? {}) };
  // Geriye uyumluluk: bölüm/soru başlıkları eskiden tek "soruBaslik" rolündeydi —
  // eski kayıtlarda bölüm başlığı, kayıtlı soru başlığı ayarını devralır.
  if (kayitli?.fontlar?.soruBaslik && !kayitli.fontlar.bolumBaslik) {
    fontlar.bolumBaslik = kayitli.fontlar.soruBaslik;
  }
  if (kayitli?.boyutlar?.soruBaslik && !kayitli.boyutlar.bolumBaslik) {
    boyutlar.bolumBaslik = kayitli.boyutlar.soruBaslik;
  }
  return {
    logoUrl: kayitli?.logoUrl,
    fontlar,
    boyutlar,
    harfAraliklar: { ...VARSAYILAN_RAPOR_HARF_ARALIKLARI, ...(kayitli?.harfAraliklar ?? {}) },
  };
}
