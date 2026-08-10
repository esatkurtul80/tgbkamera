import type { Soru } from "@/types";

export type SoruSinifi = "puanli" | "puansiz" | "yorumlu_puanli";

/** Bir sorunun sınıfını döner. kategori alanı varsa ona göre, yoksa (eski kayıtlar) tip varlığına göre türetilir. */
export function soruSinifi(soru: Pick<Soru, "tip" | "kategori">): SoruSinifi {
  if (soru.kategori) return soru.kategori;
  return soru.tip ? "puansiz" : "puanli";
}

export function soruSinifiEtiketi(sinif: SoruSinifi): string {
  return sinif === "puanli" ? "puanlı" : sinif === "yorumlu_puanli" ? "yorumlu puanlı" : "puansız";
}

/** Bir bölümdeki soruların baskın sınıfı; hiç tanınan soru yoksa null (henüz kısıtlama yok). */
export function bolumSinifi(soruIdleri: string[], sorularById: Record<string, Soru>): SoruSinifi | null {
  for (const id of soruIdleri) {
    const s = sorularById[id];
    if (s) return soruSinifi(s);
  }
  return null;
}

/** Bir bölümde birden fazla sınıftan soru karışmış mı? */
export function bolumKarisikMi(soruIdleri: string[], sorularById: Record<string, Soru>): boolean {
  const set = new Set(
    soruIdleri
      .map((id) => sorularById[id])
      .filter((s): s is Soru => !!s)
      .map(soruSinifi)
  );
  return set.size > 1;
}

/**
 * Bir form ne tür sorulara ihtiyaç duyar? "Yorumlu puanlı" (puanli=true, puanGirisTipi="manuel")
 * formlar, kendine ait ayrı bir soru sınıfı ("yorumlu_puanli") kullanır — puansız sorularla karışmaz.
 */
export function formGerekliSinif(
  puanli: boolean,
  puanGirisTipi?: "otomatik" | "manuel"
): SoruSinifi {
  if (!puanli) return "puansiz";
  return puanGirisTipi === "manuel" ? "yorumlu_puanli" : "puanli";
}

/** Bir bölüm, formun gerektirdiği soru sınıfıyla uyumlu mu? (Karışıksa veya boşsa true döner — ayrı kontrol edilir.) */
export function bolumFormaUygunMu(
  soruIdleri: string[],
  sorularById: Record<string, Soru>,
  formGerekliSinif: SoruSinifi
): boolean {
  const sinif = bolumSinifi(soruIdleri, sorularById);
  return sinif === null || sinif === formGerekliSinif;
}
