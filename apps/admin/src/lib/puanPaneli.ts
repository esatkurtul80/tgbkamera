import type { Degerlendirme, Magaza, Personel, TekrarIzleme } from "@/types";
import { raporPuanTipi, raporPuanYuzde } from "@/lib/puan";

/**
 * Personel Seç sayfası için saf agregasyon (bolgeOzet.ts deseni).
 * Kurallar:
 *  - O dönemde puanlı matris raporu olan TÜM personel listelenir; eşik yoktur, kameraman
 *    kimi tekrar izlemeye alacağına kendisi karar verir.
 *  - Puan kaynağı YALNIZ puanlı matris (otomatik) raporlarıdır; yorumlu puanlı (elle puan
 *    girilen) raporlar ortalamaya girmez.
 *  - Mağaza raporları, puansız raporlar, açık raporlar ve puanı girilmemiş raporlar atlanır.
 *  - Takip (tekrarIzleme) raporları varsayılan olarak ana ortalamaya KATILMAZ; sonuçları
 *    yalnız bağlı oldukları işaretin "takip sonucu" sütununda gösterilir (geri besleme önlenir).
 *  - Aynı personelin o ayda birden fazla puanlı raporu varsa ortalaması alınır.
 *  - "Kamera Gözlem": personelin o dönemdeki tüm raporları (matris olmayanlar dahil) arasında
 *    en geç tarihli gözlemi yapan kişi — gün işaretleyeni (kaydedenAd), yoksa rapor sahibi.
 *  - Sıralama: puan artan, sonra ada göre (tr).
 */

export type TakipDurumu = "yok" | "bekliyor" | "devam" | "tamamlandi";

export interface PersonelPuanKaydi {
  degerlendirmeId: string;
  formAd: string;
  magazaId: string;
  magazaAd: string;
  puan: number;
  tip: "matris" | "yorumlu";
}

export interface PersonelPuanSatiri {
  personelId: string;
  personelAd: string;
  magazaIdleri: string[];
  magazaAdlari: string[];
  raporSayisi: number;
  ortalamaPuan: number;
  puanlar: PersonelPuanKaydi[];
  raporTipleri: Array<"matris" | "yorumlu">;
  /** En düşük puanlı raporun mağazası — işaretlerken varsayılan mağaza. */
  enDusukMagazaId: string;
  enDusukMagazaAd: string;
  /** Bu dönemde personeli en son gözlemleyen kişi ve gözlem tarihi (yalnız ekranda; rapor çıktısına girmez). */
  sonGozlemciAd: string | null;
  sonGozlemTarihi: Date | null;
  /** Bu dönem için işaret (varsa en eskisi). */
  takip: TekrarIzleme | null;
  /** Aynı personel/dönem için birden fazla işaret varsa (eşzamanlı işaretleme) uyarı için. */
  takipSayisi: number;
  takipRaporu: Degerlendirme | null;
  takipPuan: number | null;
  takipDurumu: TakipDurumu;
}

export interface PuanPaneliOzet {
  puanlananPersonel: number;
  takibeAlinan: number;
  tamamlananTakip: number;
}

export interface PuanPaneliGirdi {
  /** getDegerlendirmelerByAyYil(ay, yil) */
  raporlar: Degerlendirme[];
  /** getTekrarIzlemelerByAyYil(ay, yil) */
  takipler: TekrarIzleme[];
  /** Takip raporları (farklı ayda yapılmış olabilir) — id ile çözülmüş */
  takipRaporlari: Degerlendirme[];
  personeller: Personel[];
  magazalar: Magaza[];
  /** Varsayılan true. */
  tekrarIzlemeRaporlariniHaricTut?: boolean;
}

interface Gozlem {
  ad: string;
  tarih: Date;
}

/** Raporun en geç gözlemi: kaydedenAd dolu izlenmeler arasında en yeni tarih; yoksa rapor sahibi. */
function raporSonGozlemi(d: Degerlendirme): Gozlem | null {
  let enYeni: Gozlem | null = null;
  for (const iz of d.izlenmeler ?? []) {
    if (!iz.kaydedenAd || !iz.tarih?.toDate) continue;
    const t = iz.tarih.toDate();
    if (!enYeni || t > enYeni.tarih) enYeni = { ad: iz.kaydedenAd, tarih: t };
  }
  if (enYeni) return enYeni;
  if (!d.kameramanAd) return null;
  const t = (d.izlenmeTarihi ?? d.olusturmaTarihi)?.toDate?.();
  return t ? { ad: d.kameramanAd, tarih: t } : null;
}

function takipDurumuBul(takip: TekrarIzleme | null, takipRaporu: Degerlendirme | null, takipPuan: number | null): TakipDurumu {
  if (!takip) return "yok";
  if (takip.durum === "bekliyor") return "bekliyor";
  // tamamlandi: rapor açıksa ya da puanlı olup puanı henüz oluşmadıysa "devam"
  if (!takipRaporu) return "tamamlandi";
  if (takipRaporu.durum === "acik") return "devam";
  if (takipRaporu.puanli && takipPuan === null) return "devam";
  return "tamamlandi";
}

export function puanPaneliHesapla(girdi: PuanPaneliGirdi): { satirlar: PersonelPuanSatiri[]; ozet: PuanPaneliOzet } {
  const haricTut = girdi.tekrarIzlemeRaporlariniHaricTut ?? true;
  const magazaAd = new Map(girdi.magazalar.map((m) => [m.id, m.ad]));
  const personelMap = new Map(girdi.personeller.map((p) => [p.id, p]));
  const takipRaporMap = new Map(girdi.takipRaporlari.map((d) => [d.id, d]));
  // Takip raporları ay listesinde de olabilir (aynı ay içinde yapıldıysa)
  for (const d of girdi.raporlar) if (d.tekrarIzleme && !takipRaporMap.has(d.id)) takipRaporMap.set(d.id, d);

  // Personel → takipler (en eski önce); çöpe atılmış kayıtlar yok sayılır
  const aktifTakipler = girdi.takipler.filter((t) => t.durum !== "silindi");
  const takipMap = new Map<string, TekrarIzleme[]>();
  for (const t of aktifTakipler) {
    const liste = takipMap.get(t.personelId) ?? [];
    liste.push(t);
    takipMap.set(t.personelId, liste);
  }
  for (const liste of takipMap.values()) {
    liste.sort((a, b) => (a.olusturmaTarihi?.seconds ?? 0) - (b.olusturmaTarihi?.seconds ?? 0));
  }

  // Personel → en geç gözlem (tüm rapor tipleri; takip raporları hariç)
  const sonGozlemMap = new Map<string, Gozlem>();
  for (const d of girdi.raporlar) {
    if (!d.personelId || d.magazaRaporu) continue;
    if (haricTut && d.tekrarIzleme) continue;
    const g = raporSonGozlemi(d);
    if (!g) continue;
    const mevcut = sonGozlemMap.get(d.personelId);
    if (!mevcut || g.tarih > mevcut.tarih) sonGozlemMap.set(d.personelId, g);
  }

  // Personel → puan kayıtları
  const birikim = new Map<string, { personelAd: string; puanlar: PersonelPuanKaydi[] }>();
  for (const d of girdi.raporlar) {
    if (!d.personelId) continue;
    if (haricTut && d.tekrarIzleme) continue;
    const tip = raporPuanTipi(d);
    if (tip !== "matris") continue; // yorumlu puanlı ve puansız raporlar ortalamaya girmez
    const puan = raporPuanYuzde(d);
    if (puan === null) continue;
    const kayit = birikim.get(d.personelId) ?? { personelAd: d.personelAd, puanlar: [] };
    if (!kayit.personelAd && d.personelAd) kayit.personelAd = d.personelAd;
    kayit.puanlar.push({
      degerlendirmeId: d.id,
      formAd: d.formAd,
      magazaId: d.magazaId,
      magazaAd: d.magazaAd || magazaAd.get(d.magazaId) || "—",
      puan,
      tip,
    });
    birikim.set(d.personelId, kayit);
  }

  const satirlar: PersonelPuanSatiri[] = [];
  for (const [personelId, kayit] of birikim) {
    const puanlar = kayit.puanlar;
    const ortalama = Math.round(puanlar.reduce((a, p) => a + p.puan, 0) / puanlar.length);
    const enDusuk = puanlar.reduce((min, p) => (p.puan < min.puan ? p : min), puanlar[0]);
    const magazaIdleri = [...new Set(puanlar.map((p) => p.magazaId).filter(Boolean))];
    const raporTipleri = [...new Set(puanlar.map((p) => p.tip))];
    const takipler = takipMap.get(personelId) ?? [];
    const takip = takipler[0] ?? null;
    const takipRaporu = takip?.takipDegerlendirmeId ? takipRaporMap.get(takip.takipDegerlendirmeId) ?? null : null;
    const takipPuan = takipRaporu ? raporPuanYuzde(takipRaporu) : null;
    const personel = personelMap.get(personelId);
    const sonGozlem = sonGozlemMap.get(personelId) ?? null;

    satirlar.push({
      personelId,
      personelAd: personel?.ad || kayit.personelAd || "—",
      magazaIdleri,
      magazaAdlari: magazaIdleri.map((id) => magazaAd.get(id) ?? puanlar.find((p) => p.magazaId === id)?.magazaAd ?? "—"),
      raporSayisi: puanlar.length,
      ortalamaPuan: ortalama,
      puanlar: [...puanlar].sort((a, b) => a.puan - b.puan),
      raporTipleri,
      enDusukMagazaId: enDusuk.magazaId,
      enDusukMagazaAd: enDusuk.magazaAd,
      sonGozlemciAd: sonGozlem?.ad ?? null,
      sonGozlemTarihi: sonGozlem?.tarih ?? null,
      takip,
      takipSayisi: takipler.length,
      takipRaporu,
      takipPuan,
      takipDurumu: takipDurumuBul(takip, takipRaporu, takipPuan),
    });
  }

  satirlar.sort((a, b) => {
    if (a.ortalamaPuan !== b.ortalamaPuan) return a.ortalamaPuan - b.ortalamaPuan;
    return a.personelAd.localeCompare(b.personelAd, "tr");
  });

  const ozet: PuanPaneliOzet = {
    puanlananPersonel: satirlar.length,
    takibeAlinan: aktifTakipler.length,
    tamamlananTakip: aktifTakipler.filter((t) => t.durum === "tamamlandi").length,
  };

  return { satirlar, ozet };
}
