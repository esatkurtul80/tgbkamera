import type { Soru } from "@/types";

export type SoruSinifi = "puanli" | "puansiz";

/** Bir sorunun puanlı mı puansız mı olduğunu döner (sorular/page.tsx'deki !soru.tip kuralı ile aynı). */
export function soruSinifi(soru: Pick<Soru, "tip">): SoruSinifi {
  return soru.tip ? "puansiz" : "puanli";
}

/** Bir bölümdeki soruların baskın sınıfı; hiç tanınan soru yoksa null (henüz kısıtlama yok). */
export function bolumSinifi(soruIdleri: string[], sorularById: Record<string, Soru>): SoruSinifi | null {
  for (const id of soruIdleri) {
    const s = sorularById[id];
    if (s) return soruSinifi(s);
  }
  return null;
}

/** Bir bölümde hem puanlı hem puansız soru karışmış mı? */
export function bolumKarisikMi(soruIdleri: string[], sorularById: Record<string, Soru>): boolean {
  const set = new Set(
    soruIdleri
      .map((id) => sorularById[id])
      .filter((s): s is Soru => !!s)
      .map(soruSinifi)
  );
  return set.size > 1;
}

/** Bir bölüm, verilen form.puanli değeriyle uyumlu mu? (Karışıksa veya boşsa true döner — ayrı kontrol edilir.) */
export function bolumFormaUygunMu(
  soruIdleri: string[],
  sorularById: Record<string, Soru>,
  formPuanli: boolean
): boolean {
  const sinif = bolumSinifi(soruIdleri, sorularById);
  return sinif === null || (sinif === "puanli") === formPuanli;
}
