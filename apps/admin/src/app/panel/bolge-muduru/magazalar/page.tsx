"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Store } from "lucide-react";
import { useBmMagazalar } from "@/hooks/useBmMagazalar";
import { useBmRaporlar } from "@/hooks/useBmRaporlar";
import { aralikEtiketi, magazaGruplari, onAyarAraligi, type TarihAraligi } from "@/lib/bmRapor";
import TarihAraligiSecici from "@/components/bm/TarihAraligiSecici";
import PuanPill from "@/components/bm/PuanPill";
import { BM_YOL } from "@/components/bm/BmShell";
import { AramaKutusu, BmBaslik, BosDurum, MagazaAtanmamis, Yukleniyor } from "@/components/bm/BmParcalar";
import { BM } from "@/components/bm/tema";

/** Bölge müdürü "Mağazalarım" (web): atanmış mağazalar, seçili aralıkta rapor sayısı ve ortalama. */
export default function BmMagazalarPage() {
  const { magazalar, loading: magazaLoading, magazaYok } = useBmMagazalar();
  const [aralik, setAralik] = useState<TarihAraligi>(() => onAyarAraligi("buAy"));
  const [arama, setArama] = useState("");
  const { raporlar, loading } = useBmRaporlar(magazalar, aralik, !magazaLoading && !magazaYok);

  const gruplar = useMemo(() => {
    const hepsi = magazaGruplari(magazalar, raporlar);
    const q = arama.trim().toLowerCase();
    return q ? hepsi.filter((g) => g.magaza.ad.toLowerCase().includes(q) || (g.magaza.adres ?? "").toLowerCase().includes(q)) : hepsi;
  }, [magazalar, raporlar, arama]);

  return (
    <div>
      <BmBaslik baslik="Mağazalarım" alt={`${magazalar.length} mağaza · ${aralikEtiketi(aralik)}`} />
      <TarihAraligiSecici deger={aralik} onChange={setAralik} />
      <div className="mt-2.5">
        <AramaKutusu deger={arama} onChange={setArama} placeholder="Mağaza ara..." />
      </div>

      {magazaYok ? (
        <MagazaAtanmamis />
      ) : loading || magazaLoading ? (
        <Yukleniyor />
      ) : gruplar.length === 0 ? (
        <BosDurum ikon="🔍" baslik="Eşleşen mağaza yok" />
      ) : (
        <div className="flex flex-col gap-2.5 mt-3">
          {gruplar.map((g) => (
            <Link
              key={g.magaza.id}
              href={`${BM_YOL.magaza}/${g.magaza.id}`}
              className={`${BM.kart} rounded-[22px] p-3.5 hover:bg-[#fbfdfb] transition-colors block`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full ${BM.griBg} flex items-center justify-center shrink-0`}>
                  <Store size={17} className={BM.murekkep} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[15px] font-extrabold truncate ${BM.murekkep}`}>{g.magaza.ad}</p>
                  {g.magaza.adres && <p className={`text-[11.5px] truncate ${BM.soluk}`}>{g.magaza.adres}</p>}
                </div>
                <PuanPill puan={g.ortalama} />
              </div>
              <div className={`flex items-center mt-3 pt-2.5 border-t ${BM.ayrac}`}>
                <Istat deger={g.raporlar.length} etiket="rapor" />
                <Istat deger={g.personelSayisi} etiket="personel" />
                <Istat deger={g.acikSayi} etiket="devam eden" vurgulu={g.acikSayi > 0} />
                <ChevronRight size={18} className="text-[#c4cfc8] shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Istat({ deger, etiket, vurgulu = false }: { deger: number; etiket: string; vurgulu?: boolean }) {
  return (
    <div className="flex-1 flex items-baseline gap-1">
      <span className={`text-[15px] font-extrabold tabular-nums ${vurgulu ? BM.amber : BM.murekkep}`}>{deger}</span>
      <span className={`text-[11px] font-semibold ${BM.soluk}`}>{etiket}</span>
    </div>
  );
}
