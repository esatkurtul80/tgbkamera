import type { CevapSecenegi, SoruSnapshot, SkorlamaSistemi, SoruIzlenme } from './types';

// ─── Çoklu İzlenme Puanı (webdeki apps/admin/src/lib/skorlama.ts ile birebir) ──

export interface SoruPuanSonuc {
  evetSayisi: number;
  hayirSayisi: number;
  muafSayisi: number;
  toplamIzlenme: number; // muaf hariç
  oran: number;          // (evet / toplamIzlenme) * 100
  kazanilanPuan: number;
  gecti: boolean | null;
}

export function soruPuanHesapla(
  soruId: string,
  soru: SoruSnapshot,
  izlenmeler: Pick<SoruIzlenme, 'cevaplar'>[],
  _skorlamaSistemi: SkorlamaSistemi
): SoruPuanSonuc {
  let evetSayisi = 0, hayirSayisi = 0, muafSayisi = 0;

  for (const iz of izlenmeler) {
    const c = iz.cevaplar[soruId];
    if (c === 'evet') evetSayisi++;
    else if (c === 'hayir') hayirSayisi++;
    else if (c === 'muaf') muafSayisi++;
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
  izlenmeler: Pick<SoruIzlenme, 'cevaplar'>[],
  soruSnapshot: Record<string, SoruSnapshot>,
  skorlamaSistemi: SkorlamaSistemi
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
  soruSnapshot: Record<string, SoruSnapshot>
): { toplamPuan: number; maxPuan: number } {
  let toplamPuan = 0;
  let maxPuan = 0;
  for (const [soruId, snap] of Object.entries(soruSnapshot)) {
    maxPuan += snap.puan;
    if (cevaplar[soruId] === 'evet') toplamPuan += snap.puan;
  }
  return { toplamPuan, maxPuan };
}
