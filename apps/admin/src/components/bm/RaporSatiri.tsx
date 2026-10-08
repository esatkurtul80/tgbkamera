import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { raporPuan, raporTipi } from "@/lib/bmRapor";
import type { Degerlendirme } from "@/types";
import PuanPill from "./PuanPill";
import { BM } from "./tema";

const TIP_ETIKET = { matris: "Puanlı", yorumlu: "Yorumlu", puansiz: "Puansız" } as const;

/**
 * Bölge müdürü listelerinde tek rapor satırı: form adı, tarih, tip rozeti, puan.
 * Tıklayınca rapor detayı açılır. Kameraman adı gösterilmez.
 */
export default function RaporSatiri({
  rapor, personelGoster = false, magazaGoster = false, ayrac = false,
}: {
  rapor: Degerlendirme;
  personelGoster?: boolean;
  magazaGoster?: boolean;
  ayrac?: boolean;
}) {
  const tip = raporTipi(rapor);
  const acik = rapor.durum === "acik";
  const tarih = rapor.olusturmaTarihi?.toDate?.().toLocaleDateString("tr-TR") ?? "—";
  const baslik = personelGoster ? (rapor.magazaRaporu ? "Mağaza raporu" : rapor.personelAd) : rapor.formAd;
  const altParcalar = [
    personelGoster ? rapor.formAd : null,
    magazaGoster ? rapor.magazaAd : null,
    tarih,
  ].filter(Boolean);

  return (
    <Link
      href={`/degerlendirmeler/${rapor.id}`}
      className={`flex items-center gap-2 px-3.5 py-3 active:bg-[#f7faf8] hover:bg-[#f7faf8] transition-colors ${ayrac ? `border-t ${BM.ayrac}` : ""}`}
    >
      <div className="flex-1 min-w-0">
        <p className={`text-[13.5px] font-bold truncate ${BM.murekkep}`}>{baslik}</p>
        <p className={`text-[11.5px] truncate ${BM.soluk}`}>{altParcalar.join(" · ")}</p>
      </div>
      {acik ? (
        <span className={`text-[10px] font-extrabold px-2 py-1 rounded-lg shrink-0 ${BM.amberBg} ${BM.amber}`}>Devam ediyor</span>
      ) : (
        <span className={`text-[10px] font-extrabold px-2 py-1 rounded-lg shrink-0 ${tip === "yorumlu" ? `${BM.morBg} ${BM.mor}` : `${BM.griBg} ${BM.gri}`}`}>
          {TIP_ETIKET[tip]}
        </span>
      )}
      {!acik && tip !== "puansiz" && <PuanPill puan={raporPuan(rapor)} />}
      <ChevronRight size={16} className="text-[#c4cfc8] shrink-0" />
    </Link>
  );
}
