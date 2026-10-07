import type { Degerlendirme, Kullanici, Magaza, Personel } from "@/types";
import { raporPuanTipi, raporPuanYuzde } from "@/lib/puan";

/**
 * Puan Raporlamaları sayfası için saf agregasyon (puanPaneli.ts / bolgeOzet.ts deseni).
 * Kurallar:
 *  - Puan kaynağı puanlı matris (otomatik) VE yorumlu puanlı (elle puan girilen) raporlardır;
 *    ikisi birlikte tek ortalamaya girer.
 *  - Mağaza raporları, puansız raporlar, açık raporlar ve puanı girilmemiş raporlar atlanır.
 *  - Takip (tekrarIzleme) raporları ortalamaya ve rapor sayısına KATILMAZ; yalnız personel
 *    geçmişinde "Tekrar İzleme" rozetiyle listelenir.
 *  - Mağaza ve bölge müdürü, raporun yapıldığı mağazadan türetilir (personelin kayıtlı
 *    mağazaları değil): magazaId → Magaza.bolgeMuduruId → users.displayName.
 *  - Kameraman adı hiçbir çıktıya girmez.
 */

export interface PuanRaporKaydi {
  degerlendirmeId: string;
  tarih: Date;
  formAd: string;
  magazaId: string;
  magazaAd: string;
  puan: number;
  tip: "matris" | "yorumlu";
  /** Zayıf personel takip raporu — ortalamaya girmez. */
  takip: boolean;
}

export interface PuanRaporlamaSatiri {
  personelId: string;
  personelAd: string;
  magazaIdleri: string[];
  magazaAdlari: string[];
  bolgeMudurAdlari: string[];
  /** Ortalamaya giren (takip hariç) rapor sayısı. */
  raporSayisi: number;
  matrisSayisi: number;
  yorumluSayisi: number;
  ortalamaPuan: number;
  /** Ortalamaya giren kayıtlar (takip hariç), tarih azalan. */
  puanlar: PuanRaporKaydi[];
}

export interface PuanRaporlamaOzet {
  personel: number;
  rapor: number;
  genelOrtalama: number | null;
}

export interface PuanRaporlamaGirdi {
  /** getDegerlendirmelerByOlusturmaAraligi(baslangic, bitis) */
  raporlar: Degerlendirme[];
  personeller: Personel[];
  magazalar: Magaza[];
  /** Okuma izni yoksa boş dizi verilebilir; bölge müdürü sütunu boş kalır. */
  kullanicilar: Kullanici[];
}

function raporTarihi(d: Degerlendirme): Date {
  return d.olusturmaTarihi?.toDate?.() ?? new Date(0);
}

function ortalama(sayilar: number[]): number | null {
  if (sayilar.length === 0) return null;
  return Math.round(sayilar.reduce((a, b) => a + b, 0) / sayilar.length);
}

/** Raporu puan kaydına çevirir; puan üretmeyen raporlar (mağaza, puansız, açık, puansız girilmiş) null. */
export function raporuPuanKaydinaCevir(d: Degerlendirme, magazaAd: Map<string, string>): PuanRaporKaydi | null {
  if (d.magazaRaporu) return null;
  const tip = raporPuanTipi(d);
  if (!tip) return null;
  const puan = raporPuanYuzde(d);
  if (puan === null) return null;
  return {
    degerlendirmeId: d.id,
    tarih: raporTarihi(d),
    formAd: d.formAd || "—",
    magazaId: d.magazaId,
    magazaAd: magazaAd.get(d.magazaId) ?? d.magazaAd ?? "—",
    puan,
    tip,
    takip: !!d.tekrarIzleme,
  };
}

/** Mağaza → bölge müdürü adı eşlemesi (ad yoksa null). */
export function magazaBolgeMuduruHaritasi(
  magazalar: Magaza[],
  kullanicilar: Kullanici[]
): Map<string, string | null> {
  const kullaniciAd = new Map(kullanicilar.map((k) => [k.id, k.displayName]));
  const sonuc = new Map<string, string | null>();
  for (const m of magazalar) {
    sonuc.set(m.id, m.bolgeMuduruId ? kullaniciAd.get(m.bolgeMuduruId) ?? null : null);
  }
  return sonuc;
}

export function puanRaporlamaHesapla(girdi: PuanRaporlamaGirdi): { satirlar: PuanRaporlamaSatiri[]; ozet: PuanRaporlamaOzet } {
  const magazaAd = new Map(girdi.magazalar.map((m) => [m.id, m.ad]));
  const personelMap = new Map(girdi.personeller.map((p) => [p.id, p]));
  const mudurHaritasi = magazaBolgeMuduruHaritasi(girdi.magazalar, girdi.kullanicilar);

  const gruplar = new Map<string, { personelAd: string; kayitlar: PuanRaporKaydi[] }>();
  for (const d of girdi.raporlar) {
    if (!d.personelId) continue;
    const kayit = raporuPuanKaydinaCevir(d, magazaAd);
    if (!kayit || kayit.takip) continue;
    let grup = gruplar.get(d.personelId);
    if (!grup) {
      grup = { personelAd: personelMap.get(d.personelId)?.ad || d.personelAd || "—", kayitlar: [] };
      gruplar.set(d.personelId, grup);
    }
    grup.kayitlar.push(kayit);
  }

  const satirlar: PuanRaporlamaSatiri[] = [];
  const tumPuanlar: number[] = [];
  for (const [personelId, grup] of gruplar) {
    const kayitlar = [...grup.kayitlar].sort((a, b) => b.tarih.getTime() - a.tarih.getTime());
    const magazaIdleri = [...new Set(kayitlar.map((k) => k.magazaId))];
    const magazaAdlari = [...new Set(kayitlar.map((k) => k.magazaAd))];
    const bolgeMudurAdlari = [...new Set(
      magazaIdleri.map((id) => mudurHaritasi.get(id) ?? null).filter((ad): ad is string => !!ad)
    )];
    const puanlar = kayitlar.map((k) => k.puan);
    tumPuanlar.push(...puanlar);
    satirlar.push({
      personelId,
      personelAd: grup.personelAd,
      magazaIdleri,
      magazaAdlari,
      bolgeMudurAdlari,
      raporSayisi: kayitlar.length,
      matrisSayisi: kayitlar.filter((k) => k.tip === "matris").length,
      yorumluSayisi: kayitlar.filter((k) => k.tip === "yorumlu").length,
      ortalamaPuan: ortalama(puanlar) ?? 0,
      puanlar: kayitlar,
    });
  }

  satirlar.sort((a, b) => a.personelAd.localeCompare(b.personelAd, "tr"));

  return {
    satirlar,
    ozet: {
      personel: satirlar.length,
      rapor: tumPuanlar.length,
      genelOrtalama: ortalama(tumPuanlar),
    },
  };
}

export interface PuanGecmisAyGrubu {
  ay: number;
  yil: number;
  kayitlar: PuanRaporKaydi[];
  /** Takip hariç ortalama; o ay yalnız takip raporu varsa null. */
  ortalama: number | null;
}

export interface PuanGecmisi {
  kayitlar: PuanRaporKaydi[];
  aylar: PuanGecmisAyGrubu[];
  /** Takip hariç tüm zamanlar ortalaması. */
  ortalama: number | null;
  raporSayisi: number;
  matrisSayisi: number;
  yorumluSayisi: number;
  takipSayisi: number;
}

/** Personelin tüm puan geçmişi (getDegerlendirmeler({ personelId })): tarih azalan, aya göre gruplu. */
export function gecmisHesapla(raporlar: Degerlendirme[], magazaAd: Map<string, string>): PuanGecmisi {
  const kayitlar = raporlar
    .map((d) => raporuPuanKaydinaCevir(d, magazaAd))
    .filter((k): k is PuanRaporKaydi => k !== null)
    .sort((a, b) => b.tarih.getTime() - a.tarih.getTime());

  const aylar: PuanGecmisAyGrubu[] = [];
  for (const k of kayitlar) {
    const ay = k.tarih.getMonth();
    const yil = k.tarih.getFullYear();
    let grup = aylar[aylar.length - 1];
    if (!grup || grup.ay !== ay || grup.yil !== yil) {
      grup = { ay, yil, kayitlar: [], ortalama: null };
      aylar.push(grup);
    }
    grup.kayitlar.push(k);
  }
  for (const g of aylar) g.ortalama = ortalama(g.kayitlar.filter((k) => !k.takip).map((k) => k.puan));

  const sayilan = kayitlar.filter((k) => !k.takip);
  return {
    kayitlar,
    aylar,
    ortalama: ortalama(sayilan.map((k) => k.puan)),
    raporSayisi: sayilan.length,
    matrisSayisi: sayilan.filter((k) => k.tip === "matris").length,
    yorumluSayisi: sayilan.filter((k) => k.tip === "yorumlu").length,
    takipSayisi: kayitlar.length - sayilan.length,
  };
}
