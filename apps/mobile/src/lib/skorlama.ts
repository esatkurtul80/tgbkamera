import type { CevapSecenegi, SoruSnapshot } from './types';

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
