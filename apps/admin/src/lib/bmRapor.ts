import type { Degerlendirme, Magaza } from "@/types";
import { raporYuzde } from "@/lib/bolgeOzet";

/**
 * Bölge müdürü ekranları için tarih aralığı ve gruplama yardımcıları.
 * (Mobil ikizi: apps/mobile/src/lib/bmRapor.ts — kurallar birlikte güncellenir.)
 *  - Ortalama yalnız kapalı puanlı matris raporlardan hesaplanır (bolgeOzet ile aynı kural);
 *    yorumlu puanlı raporların puanı satırda gösterilir ama ortalamaya girmez.
 *  - Açık (devam eden) raporlar listede rozetle görünür, puan üretmez.
 */

export type AralikTuru = "buAy" | "gecenAy" | "son3Ay" | "tumu" | "ozel";

export interface TarihAraligi {
  tur: AralikTuru;
  /** null = sınırsız (yalnız 'tumu') */
  baslangic: Date | null;
  bitis: Date | null;
}

export const ARALIK_SECENEKLERI: { tur: AralikTuru; ad: string }[] = [
  { tur: "buAy", ad: "Bu Ay" },
  { tur: "gecenAy", ad: "Geçen Ay" },
  { tur: "son3Ay", ad: "Son 3 Ay" },
  { tur: "tumu", ad: "Tümü" },
  { tur: "ozel", ad: "Özel" },
];

function gunSonu(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
function gunBasi(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function onAyarAraligi(tur: AralikTuru, simdi: Date = new Date()): TarihAraligi {
  const y = simdi.getFullYear();
  const m = simdi.getMonth();
  switch (tur) {
    case "buAy":
      return { tur, baslangic: new Date(y, m, 1), bitis: gunSonu(new Date(y, m + 1, 0)) };
    case "gecenAy":
      return { tur, baslangic: new Date(y, m - 1, 1), bitis: gunSonu(new Date(y, m, 0)) };
    case "son3Ay":
      return { tur, baslangic: new Date(y, m - 2, 1), bitis: gunSonu(new Date(y, m + 1, 0)) };
    case "tumu":
      return { tur, baslangic: null, bitis: null };
    case "ozel":
      return { tur, baslangic: new Date(y, m, 1), bitis: gunSonu(simdi) };
  }
}

/** Özel aralıkta başlangıç/bitiş güncellemesi; ters sıra verilirse takas edilir. */
export function ozelAralik(baslangic: Date, bitis: Date): TarihAraligi {
  let b = gunBasi(baslangic);
  let s = gunSonu(bitis);
  if (b > s) [b, s] = [gunBasi(bitis), gunSonu(baslangic)];
  return { tur: "ozel", baslangic: b, bitis: s };
}

export function tarihKisa(d: Date | null): string {
  return d ? d.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";
}

/** <input type="date"> değeri (yerel saat, YYYY-MM-DD). */
export function tarihInputDegeri(d: Date | null): string {
  if (!d) return "";
  const ay = String(d.getMonth() + 1).padStart(2, "0");
  const gun = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${ay}-${gun}`;
}

/** YYYY-MM-DD → yerel Date; boş/geçersizse null. */
export function tarihInputCoz(v: string): Date | null {
  const [y, m, g] = v.split("-").map(Number);
  if (!y || !m || !g) return null;
  return new Date(y, m - 1, g);
}

export function aralikEtiketi(a: TarihAraligi): string {
  if (a.tur === "tumu") return "Tüm zamanlar";
  if (a.tur !== "ozel") return ARALIK_SECENEKLERI.find((s) => s.tur === a.tur)?.ad ?? "";
  return `${tarihKisa(a.baslangic)} – ${tarihKisa(a.bitis)}`;
}

export type RaporTipi = "matris" | "yorumlu" | "puansiz";

export function raporTipi(d: Degerlendirme): RaporTipi {
  if (!d.puanli) return "puansiz";
  return d.puanGirisTipi === "manuel" ? "yorumlu" : "matris";
}

/** Satırda gösterilecek puan: matris → yüzde, yorumlu → elle girilen 0-100, puansız/açık → null. */
export function raporPuan(d: Degerlendirme): number | null {
  if (d.durum === "acik" || !d.puanli || d.toplamPuan === null) return null;
  const y = raporYuzde(d);
  if (y !== null) return y;
  return Math.round(d.toplamPuan);
}

/** Ortalamaya giren puan: yalnız kapalı matris rapor. */
function ortalamaPuani(d: Degerlendirme): number | null {
  if (d.durum === "acik" || raporTipi(d) !== "matris") return null;
  return raporYuzde(d);
}

export function ortalama(sayilar: number[]): number | null {
  if (sayilar.length === 0) return null;
  return Math.round(sayilar.reduce((a, b) => a + b, 0) / sayilar.length);
}

export interface PersonelGrubu {
  personelId: string;
  personelAd: string;
  raporlar: Degerlendirme[];
  ortalama: number | null;
  acikSayi: number;
}

/** Raporları personele göre gruplar (mağaza raporları atlanır); ada göre sıralı, en yeni rapor üstte. */
export function personelGruplari(raporlar: Degerlendirme[]): PersonelGrubu[] {
  const map = new Map<string, PersonelGrubu & { puanlar: number[] }>();
  for (const d of raporlar) {
    if (d.magazaRaporu || !d.personelId) continue;
    let g = map.get(d.personelId);
    if (!g) {
      g = { personelId: d.personelId, personelAd: d.personelAd || "—", raporlar: [], ortalama: null, acikSayi: 0, puanlar: [] };
      map.set(d.personelId, g);
    }
    g.raporlar.push(d);
    if (d.durum === "acik") g.acikSayi++;
    const p = ortalamaPuani(d);
    if (p !== null) g.puanlar.push(p);
  }
  return [...map.values()]
    .map(({ puanlar, ...g }) => ({
      ...g,
      ortalama: ortalama(puanlar),
      raporlar: [...g.raporlar].sort((a, b) => (b.olusturmaTarihi?.seconds ?? 0) - (a.olusturmaTarihi?.seconds ?? 0)),
    }))
    .sort((a, b) => a.personelAd.localeCompare(b.personelAd, "tr"));
}

export interface MagazaGrubu {
  magaza: Magaza;
  raporlar: Degerlendirme[];
  ortalama: number | null;
  personelSayisi: number;
  acikSayi: number;
}

/** Raporları mağazaya göre gruplar; tüm atanmış mağazalar (raporu olmayanlar dahil) listelenir. */
export function magazaGruplari(magazalar: Magaza[], raporlar: Degerlendirme[]): MagazaGrubu[] {
  const map = new Map<string, Degerlendirme[]>();
  for (const m of magazalar) map.set(m.id, []);
  for (const d of raporlar) {
    const l = map.get(d.magazaId);
    if (l) l.push(d);
  }
  return magazalar
    .map((magaza) => {
      const liste = map.get(magaza.id) ?? [];
      const puanlar = liste.map(ortalamaPuani).filter((p): p is number => p !== null);
      return {
        magaza,
        raporlar: liste,
        ortalama: ortalama(puanlar),
        personelSayisi: new Set(liste.filter((d) => !d.magazaRaporu && d.personelId).map((d) => d.personelId)).size,
        acikSayi: liste.filter((d) => d.durum === "acik").length,
      };
    })
    .sort((a, b) => a.magaza.ad.localeCompare(b.magaza.ad, "tr"));
}

/** Bölge geneli ortalama (kapalı matris raporlar). */
export function genelOrtalama(raporlar: Degerlendirme[]): number | null {
  return ortalama(raporlar.map(ortalamaPuani).filter((p): p is number => p !== null));
}
