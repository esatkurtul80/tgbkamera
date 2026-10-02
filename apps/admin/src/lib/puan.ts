import type { Degerlendirme } from "@/types";

/**
 * Zayıf personel / tekrar izleme sayfaları için ortak puan yardımcıları.
 * Mevcut sayfalardaki satır içi renk eşiklerine (80/50, 80/60) dokunulmaz;
 * bu yardımcılar yalnız yeni kodda kullanılır.
 */

/** Puan renklendirmesi için sabit referans (≤70 kırmızı, ≤80 sarı, üstü yeşil).
 *  Kullanıcıya "eşik" olarak gösterilmez; tüm personel listelenir, seçim kameramanındır. */
export const PUAN_RENK_ESIGI = 70;

type PuanKaynagi = Pick<Degerlendirme, "puanli" | "toplamPuan" | "maxPuan" | "durum" | "magazaRaporu">;

/**
 * Puanlı raporun 0-100 puanı.
 *  - maxPuan > 0 → round(toplamPuan / maxPuan * 100) (puanlı matris, zaten 100 üzerinden)
 *  - maxPuan yok → toplamPuan olduğu gibi (yorumlu puanlı: puan elle 100 üzerinden girilir)
 *  - açık, mağaza raporu, puansız veya puanı girilmemiş rapor → null
 * (PdfRapor.tsx "Son 3 Ay" tablosuyla aynı yorum.)
 */
export function raporPuanYuzde(d: PuanKaynagi): number | null {
  if (!d.puanli || d.magazaRaporu || d.durum === "acik") return null;
  if (d.toplamPuan === null || d.toplamPuan === undefined) return null;
  if (d.maxPuan && d.maxPuan > 0) return Math.round((d.toplamPuan / d.maxPuan) * 100);
  return Math.round(d.toplamPuan);
}

/** Puan metni için Tailwind sınıfı. */
export function puanRenkSinifi(puan: number | null, esik: number): string {
  if (puan === null) return "text-slate-400";
  if (puan <= esik) return "text-rose-600";
  if (puan <= esik + 10) return "text-amber-500";
  return "text-emerald-600";
}

/** Puan rozeti (arka plan + kenarlık) için Tailwind sınıfı. */
export function puanRozetSinifi(puan: number | null, esik: number): string {
  if (puan === null) return "text-slate-500 bg-slate-100 border-slate-200";
  if (puan <= esik) return "text-rose-700 bg-rose-50 border-rose-200";
  if (puan <= esik + 10) return "text-amber-700 bg-amber-50 border-amber-200";
  return "text-emerald-700 bg-emerald-50 border-emerald-200";
}

/** Puanlı raporun türü: otomatik matris mi, elle puanlanan yorumlu mu. Puansız → null. */
export function raporPuanTipi(d: Pick<Degerlendirme, "puanli" | "puanGirisTipi">): "matris" | "yorumlu" | null {
  if (!d.puanli) return null;
  return d.puanGirisTipi === "manuel" ? "yorumlu" : "matris";
}

export const AYLAR = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

/** "Eylül 2026" */
export function donemEtiketi(ay: number, yil: number): string {
  return `${AYLAR[ay] ?? "?"} ${yil}`;
}

/**
 * Tamamlanan son ay (bir önceki takvim ayı). Zayıf personel seçimi ve izlenecekler havuzu
 * bu dönemle çalışır: ekim başında eylül listesi gelir, yeni aya geçince liste yenilenir.
 */
export function oncekiAyDonemi(simdi: Date = new Date()): { ay: number; yil: number } {
  const d = new Date(simdi.getFullYear(), simdi.getMonth(), 1);
  d.setMonth(d.getMonth() - 1);
  return { ay: d.getMonth(), yil: d.getFullYear() };
}

/** URL'den gelen ay/yıl parametrelerini doğrular; geçersizse null. */
export function donemParamlariniCoz(ayStr: string | null, yilStr: string | null): { ay: number; yil: number } | null {
  if (!ayStr || !yilStr) return null;
  const ay = Number(ayStr);
  const yil = Number(yilStr);
  if (!Number.isInteger(ay) || ay < 0 || ay > 11) return null;
  if (!Number.isInteger(yil) || yil < 2000 || yil > 2100) return null;
  return { ay, yil };
}
