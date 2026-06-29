import type { CevapSecenegi, SoruSnapshot, Degerlendirme, SkorlamaSistemi, SoruIzlenme } from "@/types";

// ─── Yeni: Çoklu İzlenme Puanı ───────────────────────────────────────────────

export interface SoruPuanSonuc {
  evetSayisi: number;
  hayirSayisi: number;
  muafSayisi: number;
  toplamIzlenme: number; // muaf hariç
  oran: number;          // (evet / toplamIzlenme) * 100
  kazanilanPuan: number;
  gecti: boolean | null; // eşik bazlı: true/false | oran bazlı: null
}

export function soruPuanHesapla(
  soruId: string,
  soru: SoruSnapshot,
  izlenmeler: Pick<SoruIzlenme, "cevaplar">[],
  skorlamaSistemi: SkorlamaSistemi,
): SoruPuanSonuc {
  let evetSayisi = 0, hayirSayisi = 0, muafSayisi = 0;

  for (const iz of izlenmeler) {
    const c = iz.cevaplar[soruId];
    if (c === "evet") evetSayisi++;
    else if (c === "hayir") hayirSayisi++;
    else if (c === "muaf") muafSayisi++;
    // undefined = henüz cevap verilmemiş, sayma
  }

  const toplamIzlenme = evetSayisi + hayirSayisi;
  const oran = toplamIzlenme > 0 ? Math.round((evetSayisi / toplamIzlenme) * 100) : 0;

  let kazanilanPuan = 0;
  let gecti: boolean | null = null;

  if (toplamIzlenme > 0) {
    const hedef = soru.hedefYuzde ?? 100;
    gecti = oran >= hedef;
    kazanilanPuan = gecti ? soru.puan : 0;
  }

  return { evetSayisi, hayirSayisi, muafSayisi, toplamIzlenme, oran, kazanilanPuan, gecti };
}

export function hesaplaPuanFromIzlenmeler(
  izlenmeler: Pick<SoruIzlenme, "cevaplar">[],
  soruSnapshot: Record<string, SoruSnapshot>,
  skorlamaSistemi: SkorlamaSistemi,
): { toplamPuan: number; maxPuan: number } {
  let toplamPuan = 0;
  let maxPuan = 0;

  for (const [soruId, soru] of Object.entries(soruSnapshot)) {
    const sonuc = soruPuanHesapla(soruId, soru, izlenmeler, skorlamaSistemi);
    if (sonuc.toplamIzlenme > 0) {
      maxPuan += soru.puan;
      toplamPuan += sonuc.kazanilanPuan;
    }
  }

  return { toplamPuan, maxPuan };
}

// ─── Eski: Tek Değerlendirme Puanı (Legacy) ──────────────────────────────────

export function hesaplaPuan(
  cevaplar: Record<string, CevapSecenegi>,
  soruSnapshot: Record<string, SoruSnapshot>,
): { toplamPuan: number; maxPuan: number } {
  let toplamPuan = 0;
  let maxPuan = 0;

  for (const [soruId, soru] of Object.entries(soruSnapshot)) {
    const cevap = cevaplar[soruId];
    if (cevap === "muaf") continue;
    maxPuan += soru.puan;
    if (cevap === "evet") toplamPuan += soru.puan;
  }

  return { toplamPuan, maxPuan };
}

// ─── Aylık Soru İstatistikleri ────────────────────────────────────────────────

export interface SoruAylikIstatistik {
  soruId: string;
  metin: string;
  puan: number;
  hedefYuzde?: number;
  evetSayisi: number;
  hayirSayisi: number;
  muafSayisi: number;
  toplamIzlenme: number; // muaf hariç
  gerceklesenYuzde: number; // (evet / toplamIzlenme) * 100
}

export interface BolumAylikSonuc {
  bolumId: string;
  bolumAd: string;
  sorular: SoruAylikIstatistik[];
  bolumPuani: number;
}

export interface AylikRaporSonuc {
  personelId: string;
  personelAd: string;
  magazaId: string;
  magazaAd: string;
  ay: number;
  yil: number;
  toplamDegerlendirme: number;
  bolumler: BolumAylikSonuc[];
  genelPuan: number;
}

function soruIstatistikleriniHesapla(
  degerlendirmeler: Degerlendirme[]
): Map<string, SoruAylikIstatistik> {
  const soruMap = new Map<string, SoruAylikIstatistik>();

  for (const deg of degerlendirmeler) {
    for (const [soruId, snapshot] of Object.entries(deg.soruSnapshot)) {
      if (!soruMap.has(soruId)) {
        soruMap.set(soruId, {
          soruId,
          metin: snapshot.metin,
          puan: snapshot.puan,
          hedefYuzde: snapshot.hedefYuzde,
          evetSayisi: 0,
          hayirSayisi: 0,
          muafSayisi: 0,
          toplamIzlenme: 0,
          gerceklesenYuzde: 0,
        });
      }

      const istat = soruMap.get(soruId)!;
      const cevap = deg.cevaplar?.[soruId];

      if (cevap === "evet") istat.evetSayisi++;
      else if (cevap === "hayir") istat.hayirSayisi++;
      else if (cevap === "muaf") istat.muafSayisi++;
    }
  }

  for (const istat of soruMap.values()) {
    istat.toplamIzlenme = istat.evetSayisi + istat.hayirSayisi;
    istat.gerceklesenYuzde =
      istat.toplamIzlenme > 0
        ? Math.round((istat.evetSayisi / istat.toplamIzlenme) * 100)
        : 0;
  }

  return soruMap;
}

// ─── Eşik Bazlı Sistem ────────────────────────────────────────────────────────
// Her sorunun hedefYuzde'si var.
// gerçekleşen >= hedef → tam puan | gerçekleşen < hedef → 0 puan
// Bölüm puanı = soruların puan toplamı

export function hesaplaEsikPuani(
  degerlendirmeler: Degerlendirme[],
  bolumSnapshot: Degerlendirme["bolumSnapshot"]
): BolumAylikSonuc[] {
  const soruMap = soruIstatistikleriniHesapla(degerlendirmeler);

  return Object.entries(bolumSnapshot).map(([bolumId, bolum]) => {
    const sorular: SoruAylikIstatistik[] = bolum.soruIdleri
      .map((id) => soruMap.get(id))
      .filter(Boolean) as SoruAylikIstatistik[];

    const bolumPuani = sorular.reduce((toplam, soru) => {
      if (soru.toplamIzlenme === 0) return toplam;
      const hedef = soru.hedefYuzde ?? 100;
      const gecti = soru.gerceklesenYuzde >= hedef;
      return toplam + (gecti ? soru.puan : 0);
    }, 0);

    return { bolumId, bolumAd: bolum.ad, sorular, bolumPuani };
  });
}

// ─── Oran Bazlı Sistem ────────────────────────────────────────────────────────
// hedefYuzde yok — gerçekleşen yüzde direkt puan olur
// Bölüm puanı = soruların ortalaması

export function hesaplaOranPuani(
  degerlendirmeler: Degerlendirme[],
  bolumSnapshot: Degerlendirme["bolumSnapshot"]
): BolumAylikSonuc[] {
  const soruMap = soruIstatistikleriniHesapla(degerlendirmeler);

  return Object.entries(bolumSnapshot).map(([bolumId, bolum]) => {
    const sorular: SoruAylikIstatistik[] = bolum.soruIdleri
      .map((id) => soruMap.get(id))
      .filter(Boolean) as SoruAylikIstatistik[];

    const aktifSorular = sorular.filter((s) => s.toplamIzlenme > 0);
    const bolumPuani =
      aktifSorular.length > 0
        ? Math.round(
            aktifSorular.reduce((t, s) => t + s.gerceklesenYuzde, 0) /
              aktifSorular.length
          )
        : 0;

    return { bolumId, bolumAd: bolum.ad, sorular, bolumPuani };
  });
}

// ─── Sistem Seçimine Göre Hesapla ─────────────────────────────────────────────

export function hesaplaAylikPuan(
  degerlendirmeler: Degerlendirme[],
  skorlamaSistemi: SkorlamaSistemi
): BolumAylikSonuc[] {
  if (degerlendirmeler.length === 0) return [];
  const bolumSnapshot = degerlendirmeler[0].bolumSnapshot;

  return hesaplaEsikPuani(degerlendirmeler, bolumSnapshot);
}
