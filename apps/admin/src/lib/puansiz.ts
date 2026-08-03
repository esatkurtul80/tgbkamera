import type { PuansizCevapDegeri, SoruTipi } from "@/types";

/** Verilen soru tipine göre puansız cevabın doldurulup doldurulmadığını kontrol eder. */
export function puansizCevapDoluMu(tip: SoruTipi, cevap: PuansizCevapDegeri | undefined): boolean {
  if (!cevap) return false;
  switch (tip) {
    case "evet_hayir_muaf":
      return !!cevap.evetHayirMuaf;
    case "sayi":
      return typeof cevap.sayi === "number";
    case "tarih":
      return !!cevap.tarih?.trim();
    case "saat":
      return !!cevap.saat?.trim();
    case "kisa_metin":
      return !!cevap.kisaMetin?.trim();
    case "yorum":
      return !!cevap.yorum?.trim();
  }
}
