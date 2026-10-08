/**
 * Bölge müdürü web ekranlarının ortak tasarım tokenları — mobildeki
 * apps/mobile/src/components/bm/tema.ts ile aynı renk paleti (Tailwind sınıfı olarak).
 */
export const BM = {
  zemin: "bg-[#edf2ee]",
  kart: "bg-white",
  murekkep: "text-[#15201b]",
  murekkepBg: "bg-[#15201b]",
  gri: "text-[#77857e]",
  soluk: "text-[#a4b1aa]",
  vurgu: "text-[#e85a43]",
  vurguBg: "bg-[#e85a43]",
  griBg: "bg-[#eef2ef]",
  ayrac: "border-[#eef2ef]",
  morBg: "bg-[#ebe7fb]",
  mor: "text-[#5b4bb7]",
  amberBg: "bg-[#fbeed3]",
  amber: "text-[#a8721c]",
} as const;

/** Puan rozeti renk sınıfı (arka plan + metin); mobildeki puanRenk ile aynı eşikler. */
export function puanRenkSinifi(yuzde: number): string {
  if (yuzde >= 80) return "bg-[#ddf2e2] text-[#1e7f4a]";
  if (yuzde >= 50) return "bg-[#fbeed3] text-[#a8721c]";
  return "bg-[#fadfd8] text-[#b23c28]";
}
