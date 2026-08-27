import type { Timestamp } from "firebase/firestore";
import type { Degerlendirme, Magaza } from "@/types";

/**
 * Bölge müdürü paneli için saf agregasyon.
 * Kurallar:
 *  - Yalnızca kapalı raporlar (durum !== 'acik') istatistiğe girer; açıklar ayrı sayaçta.
 *  - % = round(toplamPuan / maxPuan * 100), yalnız puanli && maxPuan > 0 raporlarda.
 *  - Yorumlu raporlar (puanli ama maxPuan yok) % ortalamalarına girmez, ayrı sayılır.
 *  - Puansız raporlar yalnız adet olarak izlenir.
 *  - "Bu ay" raporun dönem alanlarına (ay/yil) göre belirlenir.
 *  - Personel listesi bölge raporlarından türetilir: hiç raporu olmayan personel görünmez.
 * (Aynı dosyanın mobil ikizi: apps/mobile/src/lib/bolgeOzet.ts — birlikte güncelleyin.)
 */

export interface MagazaOzet {
  magaza: Magaza;
  toplamRapor: number;
  puanliOrtalama: number | null;
  puanliRapor: number;
  yorumluRapor: number;
  puansizRapor: number;
  acikRapor: number;
  sonTarih: Timestamp | null;
}

export interface PersonelOzet {
  personelId: string;
  personelAd: string;
  magazaAdlari: string[];
  puanliOrtalama: number | null;
  puanliRapor: number;
  puansizRapor: number;
  toplamRapor: number;
}

export interface FormOzet {
  formId: string;
  formAd: string;
  raporSayisi: number;
  ortalama: number | null;
}

export interface BolgeOzet {
  magazalar: MagazaOzet[];
  personeller: PersonelOzet[];
  puanliFormlar: FormOzet[];
  puansizFormlar: FormOzet[];
  toplamRapor: number;
  buAyRapor: number;
  bolgeOrtalama: number | null;
  acikRapor: number;
}

/** Puanlı raporun yüzdesi; yorumlu/puansız için null. */
export function raporYuzde(d: Degerlendirme): number | null {
  if (!d.puanli || d.toplamPuan === null || !d.maxPuan || d.maxPuan <= 0) return null;
  return Math.round((d.toplamPuan / d.maxPuan) * 100);
}

function ortalama(yuzdeler: number[]): number | null {
  if (yuzdeler.length === 0) return null;
  return Math.round(yuzdeler.reduce((a, b) => a + b, 0) / yuzdeler.length);
}

export function bolgeOzetHesapla(magazalar: Magaza[], raporlar: Degerlendirme[]): BolgeOzet {
  const now = new Date();
  const buAy = now.getMonth();
  const buYil = now.getFullYear();

  interface MagazaAra { yuzdeler: number[]; ozet: MagazaOzet }
  const magazaMap = new Map<string, MagazaAra>();
  for (const m of magazalar) {
    magazaMap.set(m.id, {
      yuzdeler: [],
      ozet: {
        magaza: m, toplamRapor: 0, puanliOrtalama: null, puanliRapor: 0,
        yorumluRapor: 0, puansizRapor: 0, acikRapor: 0, sonTarih: null,
      },
    });
  }

  interface PersonelAra { yuzdeler: number[]; magazaAdlari: Set<string>; ozet: PersonelOzet }
  const personelMap = new Map<string, PersonelAra>();

  interface FormAra { yuzdeler: number[]; ozet: FormOzet }
  const puanliFormMap = new Map<string, FormAra>();
  const puansizFormMap = new Map<string, FormAra>();

  const bolgeYuzdeler: number[] = [];
  let toplamRapor = 0;
  let buAyRapor = 0;
  let acikRapor = 0;

  for (const d of raporlar) {
    const mAra = magazaMap.get(d.magazaId);

    if (d.durum === "acik") {
      acikRapor++;
      if (mAra) mAra.ozet.acikRapor++;
      continue;
    }

    toplamRapor++;
    if (d.ay === buAy && d.yil === buYil) buAyRapor++;

    const yuzde = raporYuzde(d);

    if (mAra) {
      mAra.ozet.toplamRapor++;
      const mevcut = mAra.ozet.sonTarih;
      if (!mevcut || (d.olusturmaTarihi?.seconds ?? 0) > (mevcut.seconds ?? 0)) {
        mAra.ozet.sonTarih = d.olusturmaTarihi ?? null;
      }
    }

    let pAra = personelMap.get(d.personelId);
    if (!pAra) {
      pAra = {
        yuzdeler: [], magazaAdlari: new Set(),
        ozet: {
          personelId: d.personelId, personelAd: d.personelAd, magazaAdlari: [],
          puanliOrtalama: null, puanliRapor: 0, puansizRapor: 0, toplamRapor: 0,
        },
      };
      personelMap.set(d.personelId, pAra);
    }
    pAra.ozet.toplamRapor++;
    if (d.magazaAd) pAra.magazaAdlari.add(d.magazaAd);

    if (d.puanli) {
      const fMap = puanliFormMap;
      let fAra = fMap.get(d.formId);
      if (!fAra) {
        fAra = { yuzdeler: [], ozet: { formId: d.formId, formAd: d.formAd, raporSayisi: 0, ortalama: null } };
        fMap.set(d.formId, fAra);
      }
      fAra.ozet.raporSayisi++;

      if (yuzde !== null) {
        if (mAra) { mAra.ozet.puanliRapor++; mAra.yuzdeler.push(yuzde); }
        pAra.ozet.puanliRapor++;
        pAra.yuzdeler.push(yuzde);
        fAra.yuzdeler.push(yuzde);
        bolgeYuzdeler.push(yuzde);
      } else if (mAra) {
        mAra.ozet.yorumluRapor++;
      }
    } else {
      if (mAra) mAra.ozet.puansizRapor++;
      pAra.ozet.puansizRapor++;
      let fAra = puansizFormMap.get(d.formId);
      if (!fAra) {
        fAra = { yuzdeler: [], ozet: { formId: d.formId, formAd: d.formAd, raporSayisi: 0, ortalama: null } };
        puansizFormMap.set(d.formId, fAra);
      }
      fAra.ozet.raporSayisi++;
    }
  }

  const magazaOzetler = [...magazaMap.values()].map((a) => {
    a.ozet.puanliOrtalama = ortalama(a.yuzdeler);
    return a.ozet;
  });
  magazaOzetler.sort((a, b) => a.magaza.ad.localeCompare(b.magaza.ad, "tr"));

  const personelOzetler = [...personelMap.values()].map((a) => {
    a.ozet.puanliOrtalama = ortalama(a.yuzdeler);
    a.ozet.magazaAdlari = [...a.magazaAdlari];
    return a.ozet;
  });
  personelOzetler.sort((a, b) => {
    if (a.puanliOrtalama !== null && b.puanliOrtalama !== null) return b.puanliOrtalama - a.puanliOrtalama;
    if (a.puanliOrtalama !== null) return -1;
    if (b.puanliOrtalama !== null) return 1;
    return a.personelAd.localeCompare(b.personelAd, "tr");
  });

  const formListesi = (map: Map<string, FormAra>) =>
    [...map.values()]
      .map((a) => { a.ozet.ortalama = ortalama(a.yuzdeler); return a.ozet; })
      .sort((a, b) => b.raporSayisi - a.raporSayisi);

  return {
    magazalar: magazaOzetler,
    personeller: personelOzetler,
    puanliFormlar: formListesi(puanliFormMap),
    puansizFormlar: formListesi(puansizFormMap),
    toplamRapor,
    buAyRapor,
    bolgeOrtalama: ortalama(bolgeYuzdeler),
    acikRapor,
  };
}
