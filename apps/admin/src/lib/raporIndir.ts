import type { Degerlendirme } from "@/types";

function isPuansizYeniFormat(d: Degerlendirme): boolean {
  // Matris/otomatik-puanlı raporlarda da puansizCevaplar taslak aşamasında {} olarak set edilir,
  // bu yüzden tek başına yeterli değil — form gerçekten puansız-şekilli mi diye de bakılmalı.
  return d.puansizCevaplar !== undefined && (d.puanli === false || d.puanGirisTipi === "manuel");
}

/**
 * Bir değerlendirmeyi formatına göre doğru dosya türünde indirir:
 * puansız (tek seferlik) raporlar PDF, diğerleri (puanlı/matris) Excel olarak iner.
 */
export async function tekilRaporIndir(d: Degerlendirme): Promise<void> {
  if (isPuansizYeniFormat(d)) {
    const { degerlendirmePdfIndir } = await import("@/lib/pdfExport");
    await degerlendirmePdfIndir(d);
  } else {
    const { degerlendirmeExcelIndir } = await import("@/lib/excelExport");
    await degerlendirmeExcelIndir(d);
  }
}

/** Seçilen birden fazla değerlendirmeyi, her birini kendi formatına uygun dosya
 *  olarak, art arda ayrı dosyalar halinde indirir. */
export async function secilenleriAyriAyriIndir(
  liste: Degerlendirme[],
  onIlerleme?: (tamamlanan: number, toplam: number) => void
): Promise<void> {
  for (let i = 0; i < liste.length; i++) {
    await tekilRaporIndir(liste[i]);
    onIlerleme?.(i + 1, liste.length);
    if (i < liste.length - 1) await new Promise((r) => setTimeout(r, 350));
  }
}
