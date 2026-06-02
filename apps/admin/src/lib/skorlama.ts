import type { CevapSecenegi, SoruSnapshot } from "@/types";

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
