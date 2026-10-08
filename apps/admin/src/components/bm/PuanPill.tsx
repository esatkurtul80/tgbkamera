import { puanRenkSinifi } from "./tema";

/** Puan rozeti: yüzde/puan; null ise tire. */
export default function PuanPill({ puan, buyuk = false }: { puan: number | null; buyuk?: boolean }) {
  const boyut = buyuk ? "min-w-12 px-3 py-1.5 text-sm" : "min-w-10 px-2.5 py-1 text-[11.5px]";
  if (puan === null) {
    return (
      <span className={`inline-flex items-center justify-center rounded-xl font-extrabold bg-[#eef2ef] text-[#a4b1aa] shrink-0 ${boyut}`}>
        —
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center justify-center rounded-xl font-extrabold shrink-0 tabular-nums ${boyut} ${puanRenkSinifi(puan)}`}>
      {puan}
    </span>
  );
}
