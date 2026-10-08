"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Store, X } from "lucide-react";
import { useBmMagazalar } from "@/hooks/useBmMagazalar";
import { useBmRaporlar } from "@/hooks/useBmRaporlar";
import { aralikEtiketi, magazaGruplari, onAyarAraligi, raporTipi, type RaporTipi, type TarihAraligi } from "@/lib/bmRapor";
import TarihAraligiSecici from "@/components/bm/TarihAraligiSecici";
import PuanPill from "@/components/bm/PuanPill";
import RaporSatiri from "@/components/bm/RaporSatiri";
import { AramaKutusu, BmBaslik, BmKart, BosDurum, MagazaAtanmamis, Yukleniyor } from "@/components/bm/BmParcalar";
import { BM } from "@/components/bm/tema";

const TIP_SECENEK: { id?: RaporTipi; ad: string }[] = [
  { id: undefined, ad: "Tümü" },
  { id: "matris", ad: "Puanlı" },
  { id: "yorumlu", ad: "Yorumlu" },
  { id: "puansiz", ad: "Puansız" },
];

/**
 * Bölge müdürü "Raporlar" (web): kendi mağazalarının tüm raporları mağaza mağaza gruplanmış,
 * tarih aralığı + mağaza çipi + tip + personel/form araması ile süzülür.
 * Panelden ?personelId / ?magazaId ile gelindiğinde o filtre hazır açılır.
 */
export default function BmRaporlarPage() {
  return (
    <Suspense fallback={<Yukleniyor />}>
      <BmRaporlar />
    </Suspense>
  );
}

function BmRaporlar() {
  const params = useSearchParams();
  const { magazalar, loading: magazaLoading, magazaYok } = useBmMagazalar();
  const [aralik, setAralik] = useState<TarihAraligi>(() => onAyarAraligi("buAy"));
  const [magazaId, setMagazaId] = useState<string | undefined>(() => params.get("magazaId") ?? undefined);
  const [personelId, setPersonelId] = useState<string | undefined>(() => params.get("personelId") ?? undefined);
  const [tip, setTip] = useState<RaporTipi | undefined>(undefined);
  const [arama, setArama] = useState("");
  const { raporlar, loading } = useBmRaporlar(magazalar, aralik, !magazaLoading && !magazaYok);

  // Aynı sayfadayken panelden yeni bir personel/mağaza seçilirse filtreyi güncelle
  const pPersonel = params.get("personelId");
  const pMagaza = params.get("magazaId");
  useEffect(() => {
    if (pPersonel) setPersonelId(pPersonel);
    if (pMagaza) setMagazaId(pMagaza);
  }, [pPersonel, pMagaza]);

  const personelAd = useMemo(
    () => (personelId ? raporlar.find((d) => d.personelId === personelId)?.personelAd ?? "Personel" : null),
    [personelId, raporlar]
  );

  const suzulmus = useMemo(() => {
    const q = arama.trim().toLowerCase();
    return raporlar.filter((d) => {
      if (magazaId && d.magazaId !== magazaId) return false;
      if (personelId && d.personelId !== personelId) return false;
      if (tip && raporTipi(d) !== tip) return false;
      if (q && !d.personelAd.toLowerCase().includes(q) && !d.formAd.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [raporlar, magazaId, personelId, tip, arama]);

  const bolumler = useMemo(
    () => magazaGruplari(magazalar, suzulmus).filter((g) => g.raporlar.length > 0),
    [magazalar, suzulmus]
  );

  const cipSinif = (aktif: boolean) =>
    `shrink-0 px-3.5 py-2 rounded-2xl text-[12.5px] font-bold border-[1.5px] transition-colors cursor-pointer ${
      aktif ? "border-[#e85a43] bg-[#fff3f0] text-[#e85a43]" : `border-transparent ${BM.kart} ${BM.gri} hover:bg-[#f7faf8]`
    }`;

  return (
    <div>
      <BmBaslik baslik="Raporlar" alt={`${suzulmus.length} rapor · ${aralikEtiketi(aralik)}`} />
      <TarihAraligiSecici deger={aralik} onChange={setAralik} />

      {/* Mağaza çipleri */}
      <div className="flex flex-wrap gap-2 mt-2">
        <button type="button" className={cipSinif(!magazaId)} onClick={() => setMagazaId(undefined)}>Tüm Mağazalar</button>
        {magazalar.map((m) => {
          const aktif = magazaId === m.id;
          return (
            <button key={m.id} type="button" className={cipSinif(aktif)} onClick={() => setMagazaId(aktif ? undefined : m.id)}>
              {m.ad}
            </button>
          );
        })}
      </div>

      {/* Tip segmenti */}
      <div className="flex bg-[#e2e8e4] rounded-xl p-[3px] gap-[3px] mt-2.5">
        {TIP_SECENEK.map((s) => {
          const aktif = tip === s.id;
          return (
            <button
              key={s.ad}
              type="button"
              onClick={() => setTip(s.id)}
              className={`flex-1 rounded-[9px] py-1.5 text-xs transition-colors cursor-pointer ${
                aktif ? `bg-white font-extrabold ${BM.murekkep}` : `font-semibold ${BM.gri}`
              }`}
            >
              {s.ad}
            </button>
          );
        })}
      </div>

      <div className="mt-2">
        <AramaKutusu deger={arama} onChange={setArama} placeholder="Personel veya form ara..." />
      </div>

      {personelAd && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setPersonelId(undefined)}
            className={`inline-flex items-center gap-1.5 ${BM.murekkepBg} text-white rounded-xl px-3 py-1.5 text-xs font-bold cursor-pointer`}
          >
            Personel: {personelAd} <X size={12} />
          </button>
        </div>
      )}

      {magazaYok ? (
        <MagazaAtanmamis />
      ) : loading || magazaLoading ? (
        <Yukleniyor />
      ) : bolumler.length === 0 ? (
        <BosDurum ikon="🔍" baslik="Bu aralıkta filtreye uyan rapor yok" />
      ) : (
        <div className="flex flex-col gap-4 mt-3">
          {bolumler.map((g) => (
            <section key={g.magaza.id}>
              <div className="flex items-center gap-2 px-1 pb-1.5">
                <Store size={14} className={BM.murekkep} />
                <h2 className={`flex-1 text-sm font-extrabold truncate ${BM.murekkep}`}>{g.magaza.ad}</h2>
                <span className={`text-[11.5px] font-semibold ${BM.soluk}`}>{g.raporlar.length} rapor</span>
                <PuanPill puan={g.ortalama} />
              </div>
              <BmKart className="rounded-[18px]">
                {g.raporlar.map((d, i) => <RaporSatiri key={d.id} rapor={d} personelGoster ayrac={i > 0} />)}
              </BmKart>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
