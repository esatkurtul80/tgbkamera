"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Store } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useBmMagazalar } from "@/hooks/useBmMagazalar";
import { useBmRaporlar } from "@/hooks/useBmRaporlar";
import { aralikEtiketi, genelOrtalama, magazaGruplari, personelGruplari } from "@/lib/bmRapor";
import TarihAraligiSecici from "@/components/bm/TarihAraligiSecici";
import { useBmAralik } from "@/components/bm/BmAralikContext";
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
  const { aralik, setAralik } = useBmAralik();
  const { raporlar, loading } = useBmRaporlar(magazalar, aralik, !magazaLoading && !magazaYok);
  const [tumPersonel, setTumPersonel] = useState(false);

  const magazaOzet = useMemo(() => magazaGruplari(magazalar, raporlar), [magazalar, raporlar]);
  const personeller = useMemo(() => personelGruplari(raporlar), [raporlar]);
  const ort = useMemo(() => genelOrtalama(raporlar), [raporlar]);
  const gorunenPersonel = tumPersonel ? personeller : personeller.slice(0, 8);
  const ad = kullanici?.displayName ?? "Bölge Müdürü";
  const yukleniyor = loading || magazaLoading;

  if (magazaYok) return <MagazaAtanmamis />;

  const satirSinif = `flex items-center gap-3 px-4 py-3 hover:bg-[#f7faf8] active:bg-[#f7faf8] transition-colors`;

  return (
    <div>
      {/* Üstte başlık yok: profil, mağaza/aralık bilgisi ve tarih seçici tek siyah kartta.
          Kart yüklenirken de durur ki aralık değiştirilirken çipler kaybolmasın. */}
      <HeroKart
        etiket="Bölge Ortalaması"
        deger={yukleniyor ? "…" : ort !== null ? String(ort) : "—"}
        sag={<TarihAraligiSecici deger={aralik} onChange={setAralik} koyu />}
        ust={
          <div className="flex items-center gap-2.5">
            <Link
              href={BM_YOL.menu}
              className="flex items-center gap-2 min-w-0 flex-1 rounded-full hover:opacity-80 transition-opacity"
              aria-label={`${ad} · Bölge Müdürü`}
            >
              <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                <span className="text-[13px] font-extrabold text-white">{ad.charAt(0).toUpperCase()}</span>
              </div>
              <div className="min-w-0">
                <p className="text-[9.5px] font-semibold text-white/50 leading-tight">Bölge Müdürü</p>
                <p className="text-[12.5px] font-extrabold text-white truncate leading-tight">{ad}</p>
              </div>
            </Link>
            <span className="shrink-0 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold text-white/80">
              {magazaLoading ? "…" : `${magazalar.length} mağaza`} · {aralikEtiketi(aralik)}
            </span>
          </div>
        }
      />

      {yukleniyor ? (
        <Yukleniyor />
      ) : (
        <>
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
