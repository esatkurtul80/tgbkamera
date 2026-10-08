"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useBmMagazalar } from "@/hooks/useBmMagazalar";
import { useBmRaporlar } from "@/hooks/useBmRaporlar";
import { aralikEtiketi, genelOrtalama, onAyarAraligi, personelGruplari, type TarihAraligi } from "@/lib/bmRapor";
import TarihAraligiSecici from "@/components/bm/TarihAraligiSecici";
import PuanPill from "@/components/bm/PuanPill";
import RaporSatiri from "@/components/bm/RaporSatiri";
import { BM_YOL } from "@/components/bm/BmShell";
import { Avatar, BmBaslik, BmKart, BolumBaslik, BosDurum, GeriButonu, HeroKart, Yukleniyor } from "@/components/bm/BmParcalar";
import { BM } from "@/components/bm/tema";

/**
 * Bölge müdürü mağaza detayı (web): seçili tarih aralığında mağaza ortalaması ve personel bazlı
 * raporlar (personel satırı açılınca o personelin raporları; rapora tıklayınca detay).
 * Salt okunur; rapor başlatma veya personel yönetimi yok. Başka müdürün mağazası açılamaz.
 */
export default function BmMagazaDetayPage() {
  const { id } = useParams<{ id: string }>();
  const { kullanici } = useAuth();
  const { magazalar, loading: magazaLoading, magazaIdSet } = useBmMagazalar();
  const [aralik, setAralik] = useState<TarihAraligi>(() => onAyarAraligi("buAy"));
  const [acikPersonel, setAcikPersonel] = useState<string | null>(null);

  const magaza = useMemo(() => magazalar.filter((m) => m.id === id), [magazalar, id]);
  const yetkili = kullanici?.rol === "bolge_muduru" && (magazaLoading || magazaIdSet.has(id));
  const { raporlar, loading } = useBmRaporlar(magaza, aralik, !magazaLoading && magaza.length > 0);

  const personeller = useMemo(() => personelGruplari(raporlar), [raporlar]);
  const magazaRaporlari = useMemo(() => raporlar.filter((d) => d.magazaRaporu), [raporlar]);
  const ort = useMemo(() => genelOrtalama(raporlar), [raporlar]);
  const kapaliSayi = raporlar.filter((d) => d.durum !== "acik").length;

  if (!yetkili) {
    return (
      <BosDurum ikon="🔒" baslik="Erişim yok" alt="Bu mağaza size atanmış mağazalar arasında değil." />
    );
  }

  const magazaAd = magaza[0]?.ad ?? "Mağaza";

  return (
    <div>
      <BmBaslik baslik={magazaAd} alt={aralikEtiketi(aralik)} sol={<GeriButonu href={BM_YOL.magazalar} />} />
      <TarihAraligiSecici deger={aralik} onChange={setAralik} />

      {loading || magazaLoading ? (
        <Yukleniyor />
      ) : (
        <>
          <HeroKart
            etiket="Mağaza Ortalaması"
            deger={ort !== null ? String(ort) : "—"}
            alt={`${kapaliSayi} tamamlanan rapor · ${personeller.length} personel`}
          />

          <section className="mt-5">
            <BolumBaslik baslik="Personel Bazlı Raporlar" />
            <BmKart>
              {personeller.length === 0 ? (
                <p className={`text-[13px] text-center py-6 ${BM.soluk}`}>Bu aralıkta personel raporu yok</p>
              ) : (
                personeller.map((p, i) => {
                  const acik = acikPersonel === p.personelId;
                  return (
                    <div key={p.personelId} className={i > 0 ? `border-t ${BM.ayrac}` : ""}>
                      <button
                        type="button"
                        onClick={() => setAcikPersonel(acik ? null : p.personelId)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#f7faf8] cursor-pointer"
                      >
                        <Avatar ad={p.personelAd} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-bold truncate ${BM.murekkep}`}>{p.personelAd}</p>
                          <p className={`text-[11.5px] ${BM.soluk}`}>
                            {p.raporlar.length} rapor{p.acikSayi > 0 ? ` · ${p.acikSayi} devam eden` : ""}
                          </p>
                        </div>
                        <PuanPill puan={p.ortalama} />
                        <ChevronRight size={18} className={`text-[#c4cfc8] shrink-0 transition-transform ${acik ? "rotate-90" : ""}`} />
                      </button>
                      {acik && (
                        <div className={`bg-[#f7faf8] border-t ${BM.ayrac} pl-2.5`}>
                          {p.raporlar.map((d, j) => <RaporSatiri key={d.id} rapor={d} ayrac={j > 0} />)}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </BmKart>
          </section>

          {magazaRaporlari.length > 0 && (
            <section className="mt-5">
              <BolumBaslik baslik="Mağaza Raporları" />
              <BmKart>
                {magazaRaporlari.map((d, j) => <RaporSatiri key={d.id} rapor={d} ayrac={j > 0} />)}
              </BmKart>
            </section>
          )}

          <div className="mt-5 text-center">
            <Link href={`${BM_YOL.raporlar}?magazaId=${encodeURIComponent(id)}`} className={`text-xs font-bold ${BM.gri} hover:underline`}>
              Bu mağazanın raporlarını listede gör →
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
