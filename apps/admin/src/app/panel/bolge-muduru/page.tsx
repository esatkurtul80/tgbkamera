"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Store } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useBmMagazalar } from "@/hooks/useBmMagazalar";
import { useBmRaporlar } from "@/hooks/useBmRaporlar";
import { aralikEtiketi, genelOrtalama, magazaGruplari, onAyarAraligi, personelGruplari, type TarihAraligi } from "@/lib/bmRapor";
import TarihAraligiSecici from "@/components/bm/TarihAraligiSecici";
import PuanPill from "@/components/bm/PuanPill";
import { BM_YOL } from "@/components/bm/BmShell";
import { Avatar, BmKart, BolumBaslik, HeroKart, MagazaAtanmamis, Yukleniyor } from "@/components/bm/BmParcalar";
import { BM } from "@/components/bm/tema";

/**
 * Bölge müdürü ana paneli (web) — mobildeki BolgeMuduruPanel'in karşılığı:
 * yalnız kendi mağazaları, seçili tarih aralığında bölge ortalaması, mağaza mağaza özet
 * ve personel puanları. Admin verileri (formlar, kullanıcılar vb.) yok.
 */
export default function BolgeMuduruPaneliPage() {
  const { kullanici } = useAuth();
  const { magazalar, loading: magazaLoading, magazaYok } = useBmMagazalar();
  const [aralik, setAralik] = useState<TarihAraligi>(() => onAyarAraligi("buAy"));
  const { raporlar, loading } = useBmRaporlar(magazalar, aralik, !magazaLoading && !magazaYok);
  const [tumPersonel, setTumPersonel] = useState(false);

  const magazaOzet = useMemo(() => magazaGruplari(magazalar, raporlar), [magazalar, raporlar]);
  const personeller = useMemo(() => personelGruplari(raporlar), [raporlar]);
  const ort = useMemo(() => genelOrtalama(raporlar), [raporlar]);
  const kapaliSayi = raporlar.filter((d) => d.durum !== "acik").length;
  const acikSayi = raporlar.length - kapaliSayi;
  const gorunenPersonel = tumPersonel ? personeller : personeller.slice(0, 8);
  const ad = kullanici?.displayName ?? "Bölge Müdürü";

  if (magazaYok) return <MagazaAtanmamis />;

  const satirSinif = `flex items-center gap-3 px-4 py-3 hover:bg-[#f7faf8] active:bg-[#f7faf8] transition-colors`;

  return (
    <div>
      {/* Profil pili — mobildeki üst alan */}
      <div className="flex items-center pt-1 pb-4 md:hidden">
        <div className={`inline-flex items-center gap-2.5 ${BM.kart} rounded-full pl-1.5 pr-4 py-1.5`}>
          <div className={`w-[38px] h-[38px] rounded-full ${BM.murekkepBg} flex items-center justify-center`}>
            <span className="text-[15px] font-extrabold text-white">{ad.charAt(0).toUpperCase()}</span>
          </div>
          <div>
            <p className={`text-[10.5px] font-semibold ${BM.soluk}`}>Bölge Müdürü</p>
            <p className={`text-[13.5px] font-extrabold ${BM.murekkep}`}>{ad}</p>
          </div>
        </div>
      </div>

      <h1 className={`text-[26px] leading-tight font-extrabold tracking-tight ${BM.murekkep}`}>Bölgem</h1>
      <p className={`text-[13px] font-semibold mt-0.5 ${BM.gri}`}>{magazalar.length} mağaza · {aralikEtiketi(aralik)}</p>

      <div className="mt-3.5">
        <TarihAraligiSecici deger={aralik} onChange={setAralik} />
      </div>

      {loading || magazaLoading ? (
        <Yukleniyor />
      ) : (
        <>
          <HeroKart
            etiket="Bölge Ortalaması"
            deger={ort !== null ? String(ort) : "—"}
            alt={`${kapaliSayi} tamamlanan rapor${acikSayi > 0 ? ` · ${acikSayi} devam eden` : ""} · ${personeller.length} personel`}
          />

          <section className="mt-5">
            <BolumBaslik baslik="Mağazalar" link={BM_YOL.magazalar} linkAd="Tümünü Gör" />
            <BmKart>
              {magazaOzet.map((m, i) => (
                <Link
                  key={m.magaza.id}
                  href={`${BM_YOL.magaza}/${m.magaza.id}`}
                  className={`${satirSinif} ${i > 0 ? `border-t ${BM.ayrac}` : ""}`}
                >
                  <div className={`w-[38px] h-[38px] rounded-full ${BM.griBg} flex items-center justify-center shrink-0`}>
                    <Store size={16} className={BM.murekkep} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold truncate ${BM.murekkep}`}>{m.magaza.ad}</p>
                    <p className={`text-[11.5px] ${BM.soluk}`}>
                      {m.raporlar.length} rapor · {m.personelSayisi} personel{m.acikSayi > 0 ? ` · ${m.acikSayi} devam eden` : ""}
                    </p>
                  </div>
                  <PuanPill puan={m.ortalama} />
                  <ChevronRight size={18} className="text-[#c4cfc8] shrink-0" />
                </Link>
              ))}
            </BmKart>
          </section>

          <section className="mt-5">
            <BolumBaslik baslik="Personel Puanları" link={BM_YOL.raporlar} linkAd="Raporlar" />
            <BmKart>
              {personeller.length === 0 ? (
                <p className={`text-[13px] text-center py-6 ${BM.soluk}`}>Bu aralıkta raporlanmış personel yok</p>
              ) : (
                <>
                  {gorunenPersonel.map((p, i) => (
                    <Link
                      key={p.personelId}
                      href={`${BM_YOL.raporlar}?personelId=${encodeURIComponent(p.personelId)}`}
                      className={`${satirSinif} ${i > 0 ? `border-t ${BM.ayrac}` : ""}`}
                    >
                      <Avatar ad={p.personelAd} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold truncate ${BM.murekkep}`}>{p.personelAd}</p>
                        <p className={`text-[11.5px] truncate ${BM.soluk}`}>
                          {[...new Set(p.raporlar.map((d) => d.magazaAd))].join(", ")} · {p.raporlar.length} rapor
                        </p>
                      </div>
                      <PuanPill puan={p.ortalama} />
                      <ChevronRight size={18} className="text-[#c4cfc8] shrink-0" />
                    </Link>
                  ))}
                  {personeller.length > 8 && (
                    <button
                      type="button"
                      onClick={() => setTumPersonel((v) => !v)}
                      className={`w-full border-t ${BM.ayrac} py-3 text-[13px] font-bold ${BM.gri} hover:bg-[#f7faf8] cursor-pointer`}
                    >
                      {tumPersonel ? "Daha az göster" : `Tümünü göster (${personeller.length})`}
                    </button>
                  )}
                </>
              )}
            </BmKart>
            <p className={`text-[11px] leading-relaxed mt-2 px-1 ${BM.soluk}`}>
              Ortalamalar tamamlanmış puanlı raporlardan hesaplanır; yorumlu puanlar listede görünür, ortalamaya girmez.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
