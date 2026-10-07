/** Bölge müdürü ekranlarının ortak tasarım tokenları (tabs/index.tsx diliyle aynı). */
export const R = {
  zemin: '#edf2ee',
  kart: '#ffffff',
  murekkep: '#15201b',
  gri: '#77857e',
  soluk: '#a4b1aa',
  vurgu: '#e85a43',
  yesilBg: '#ddf2e2',
  yesil: '#1e7f4a',
  amberBg: '#fbeed3',
  amber: '#a8721c',
  kirmiziBg: '#fadfd8',
  kirmizi: '#b23c28',
  griBg: '#eef2ef',
  morBg: '#ebe7fb',
  mor: '#5b4bb7',
};

export function puanRenk(yuzde: number): { bg: string; fg: string } {
  if (yuzde >= 80) return { bg: R.yesilBg, fg: R.yesil };
  if (yuzde >= 50) return { bg: R.amberBg, fg: R.amber };
  return { bg: R.kirmiziBg, fg: R.kirmizi };
}
