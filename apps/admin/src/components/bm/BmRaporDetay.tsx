"use client";

import { useMemo } from "react";
import { Check, X, Minus, Target, FileSpreadsheet, Repeat, Store, CalendarDays } from "lucide-react";
import { soruPuanHesapla } from "@/lib/skorlama";
import { donemEtiketi } from "@/lib/puan";
import { sonAyPuanlariHesapla } from "@/components/degerlendirme/PdfRapor";
import { BM_YOL } from "./BmShell";
import { BmKart, GeriButonu } from "./BmParcalar";
import { BM } from "./tema";
import type { CevapSecenegi, Degerlendirme, TekrarIzleme } from "@/types";

const AYLAR = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
const AY_KISA = ["Oca","Şub","Mar","Nis","May","Haz","Tem","Ağu","Eyl","Eki","Kas","Ara"];

/** Gözlem çipi renkleri: evet yeşil, hayır kırmızı, muaf gri, cevapsız kesik çizgili. */
const CEVAP_ETIKET: Record<CevapSecenegi, string> = { evet: "EVET", hayir: "HAYIR", muaf: "MUAF" };

const CEVAP_STIL: Record<CevapSecenegi, { bg: string; renk: string; Ikon: typeof Check }> = {
  evet: { bg: "bg-[#ddf2e2]", renk: "text-[#1e7f4a]", Ikon: Check },
  hayir: { bg: "bg-[#fadfd8]", renk: "text-[#b23c28]", Ikon: X },
  muaf: { bg: "bg-[#eef2ef]", renk: "text-[#77857e]", Ikon: Minus },
};

function oranRengi(oran: number): string {
  return oran >= 80 ? "text-[#1e7f4a]" : oran >= 60 ? "text-[#a8721c]" : "text-[#b23c28]";
}

/**
 * Bölge müdürü için puanlı (matris) rapor detayı — telefon öncelikli, tablo yok.
 * Gözlemler "1. Gözlem, 2. Gözlem…" olarak numaralanır; her sorunun altında gözlem
 * cevapları küçük çipler hâlinde, yanında oran/puan özeti bulunur. Kameraman adı gösterilmez.
 */
export default function BmRaporDetay({
  d, sonRaporlar, takip, onExcel, excelIndiriliyor,
}: {
  d: Degerlendirme;
  sonRaporlar: Degerlendirme[];
  takip: TekrarIzleme | null;
  onExcel: () => void;
  excelIndiriliyor: boolean;
}) {
  const sistem = d.skorlamaSistemi ?? "oran";
  const gozlemler = useMemo(
    () => [...d.izlenmeler].sort((a, b) => a.tarih.toMillis() - b.tarih.toMillis()),
    [d.izlenmeler]
  );
  // Güne göre gruplama: aynı gün içinde birden çok gözlem olabilir → "1. Gün / 1. Gözlem, 2. Gözlem…"
  const gunler = useMemo(() => {
    const liste: { tarih: string; gozlemler: typeof gozlemler }[] = [];
    for (const iz of gozlemler) {
      const tarih = iz.tarih.toDate().toLocaleDateString("tr-TR");
      const son = liste[liste.length - 1];
      if (son && son.tarih === tarih) son.gozlemler.push(iz);
      else liste.push({ tarih, gozlemler: [iz] });
    }
    return liste;
  }, [gozlemler]);
  const sonAylar = useMemo(() => sonAyPuanlariHesapla(sonRaporlar), [sonRaporlar]);
  const bolumSirasi = Object.keys(d.bolumSnapshot);
  const donem = d.ay !== undefined ? `${AYLAR[d.ay]} ${d.yil}` : d.olusturmaTarihi?.toDate().toLocaleDateString("tr-TR") ?? "—";
  const yuzde = d.toplamPuan !== null && d.maxPuan ? Math.round((d.toplamPuan / d.maxPuan) * 100) : null;
  const devamEdiyor = d.durum === "acik";

  return (
    <div>
      {/* Üst satır: geri, başlık, Excel */}
      <div className="flex items-center gap-3 pt-1 pb-3">
        <GeriButonu href={BM_YOL.raporlar} />
        <div className="flex-1 min-w-0">
          <p className={`text-[11px] font-bold tracking-wider uppercase ${BM.soluk}`}>Puanlı rapor</p>
          <h1 className={`text-[18px] leading-tight font-extrabold tracking-tight truncate ${BM.murekkep}`}>{d.formAd}</h1>
        </div>
        <button
          type="button"
          onClick={onExcel}
          disabled={excelIndiriliyor}
          className={`inline-flex items-center gap-1.5 ${BM.kart} rounded-full px-3 h-9 text-[12px] font-bold ${BM.murekkep} hover:bg-[#f7faf8] disabled:opacity-60 cursor-pointer shrink-0`}
        >
          <FileSpreadsheet size={14} />
          {excelIndiriliyor ? "Hazırlanıyor…" : "Excel"}
        </button>
      </div>

      {/* Tekrar izleme şeridi */}
      {d.tekrarIzleme && (
        <div className={`flex items-start gap-2.5 ${BM.amberBg} rounded-2xl px-3.5 py-3 mb-3`}>
          <Repeat size={15} className={`${BM.amber} mt-0.5 shrink-0`} />
          <p className={`text-[12.5px] leading-snug ${BM.amber}`}>
            <span className="font-extrabold">Tekrar izleme raporu.</span>{" "}
            {takip
              ? `${donemEtiketi(takip.ay, takip.yil)} döneminde ortalama puanı ${takip.ortalamaPuan} olduğu için tekrar izlemeye alındı.`
              : "Zayıf personel takibi için açılan rapor."}
          </p>
        </div>
      )}

      {/* Bordo künye kartı — kompakt: ad + puan aynı satırda, bilgiler altta tek satır */}
      <div className={`${BM.bordoBg} rounded-[22px] px-4 py-3.5`}>
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold tracking-wider uppercase text-white/55">
              {d.magazaRaporu ? "Mağaza raporu" : "Personel"}
            </p>
            <h2 className="text-[19px] leading-tight font-extrabold text-white mt-0.5 break-words">
              {d.magazaRaporu ? d.magazaAd : d.personelAd}
            </h2>
          </div>
          <div className="shrink-0 text-right">
            {d.toplamPuan !== null ? (
              <div className="flex items-baseline justify-end gap-1">
                <span className="text-[34px] leading-none font-extrabold text-white tabular-nums tracking-tight">{d.toplamPuan}</span>
                {d.maxPuan ? <span className="text-[11px] font-bold text-white/60">/ {d.maxPuan}</span> : null}
              </div>
            ) : (
              <p className="text-[13px] font-extrabold text-white/80">{devamEdiyor ? "Devam ediyor" : "—"}</p>
            )}
            {yuzde !== null && yuzde !== d.toplamPuan && (
              <p className="text-[11px] font-extrabold text-white/80 mt-0.5">%{yuzde}</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2.5 pt-2.5 border-t border-white/10 text-[11.5px] font-semibold text-white/75">
          {!d.magazaRaporu && d.magazaAd && (
            <span className="inline-flex items-center gap-1"><Store size={11} />{d.magazaAd}</span>
          )}
          <span className="inline-flex items-center gap-1"><CalendarDays size={11} />{donem}</span>
          <span>{gozlemler.length} gözlem</span>
          {devamEdiyor && d.toplamPuan !== null && (
            <span className="rounded-full bg-[#fbeed3] px-2 py-0.5 text-[10.5px] font-extrabold text-[#a8721c]">Devam ediyor</span>
          )}
          {sonAylar.map((g) => (
            <span
              key={`${g.yil}-${g.ay}`}
              title={`Önceki ay puanı · ${g.formlar.join(", ")}`}
              className="inline-flex items-center gap-1 rounded-full bg-white/10 pl-2 pr-0.5 py-0.5 text-[10.5px] font-bold text-white/80"
            >
              {AY_KISA[g.ay]} {g.yil}
              <span className="rounded-full bg-white text-[#9b1b30] px-1.5 text-[10.5px] font-extrabold tabular-nums">{g.ortalama}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Bölümler ve sorular */}
      {bolumSirasi.map((bolumId) => {
        const bolum = d.bolumSnapshot[bolumId];
        if (!bolum) return null;
        return (
          <section key={bolumId} className="mt-4">
            <h3 className={`text-[15px] font-extrabold mb-2 ${BM.murekkep}`}>{bolum.ad}</h3>
            <BmKart>
              {bolum.soruIdleri.map((soruId, idx) => {
                const soru = d.soruSnapshot[soruId];
                if (!soru) return null;
                const sonuc = soruPuanHesapla(soruId, soru, gozlemler.map((iz) => ({ cevaplar: iz.cevaplar })), sistem);
                const cevapVar = sonuc.toplamIzlenme > 0;
                const dar = gozlemler.length > 4; // çok gözlem: hücrede yalnız ikon, küçük yazı
                return (
                  <div key={soruId} className={`px-4 py-3 ${idx > 0 ? `border-t ${BM.ayrac}` : ""}`}>
                    <div className="flex items-start gap-2">
                      <span className={`text-[11px] font-bold mt-[3px] shrink-0 tabular-nums ${BM.soluk}`}>{idx + 1}.</span>
                      <p className={`flex-1 text-[13.5px] leading-snug font-semibold ${BM.murekkep}`}>{soru.metin}</p>
                    </div>

                    {/* Gözlem tablosu: üst satır tarih, orta satır saat, alt satır EVET / HAYIR / MUAF. Ekrana sığar, yatay kaymaz. */}
                    {gozlemler.length > 0 && (
                      <div className="mt-2 overflow-hidden">
                        <table className={`border-collapse w-full table-fixed rounded-xl overflow-hidden ${BM.griBg}`}>
                          <thead>
                            {/* Üst satır: tarih (aynı gündeki gözlemleri kapsar) */}
                            <tr>
                              {gunler.map((gun, gi) => (
                                <th
                                  key={gun.tarih}
                                  colSpan={gun.gozlemler.length}
                                  className={`text-center ${dar ? "text-[9px]" : "text-[10px]"} font-extrabold tabular-nums py-1 px-0.5 whitespace-nowrap overflow-hidden border-b border-white ${BM.murekkep} ${gi > 0 ? "border-l-2 border-l-white" : ""}`}
                                >
                                  {gun.tarih}
                                </th>
                              ))}
                            </tr>
                            {/* Alt satır: gözlem saati */}
                            <tr>
                              {gunler.flatMap((gun, gi) =>
                                gun.gozlemler.map((iz, i) => (
                                  <th
                                    key={iz.id}
                                    className={`text-center ${dar ? "text-[9px]" : "text-[10px]"} font-bold tabular-nums py-1 px-0 whitespace-nowrap overflow-hidden ${BM.gri} ${
                                      i > 0 ? "border-l border-white" : gi > 0 ? "border-l-2 border-l-white" : ""
                                    }`}
                                    style={{ width: `${100 / gozlemler.length}%` }}
                                  >
                                    {iz.tarih.toDate().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                                  </th>
                                ))
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              {gunler.flatMap((gun, gi) => gun.gozlemler.map((iz, i) => {
                                const cevap = iz.cevaplar[soruId];
                                const stil = cevap ? CEVAP_STIL[cevap] : null;
                                return (
                                  <td
                                    key={iz.id}
                                    className={`text-center py-1.5 px-0 ${
                                      i > 0 ? "border-l border-white" : gi > 0 ? "border-l-2 border-l-white" : ""
                                    } ${stil ? stil.bg : ""}`}
                                  >
                                    {stil ? (
                                      <span className={`inline-flex items-center justify-center gap-1 text-[11px] font-extrabold tracking-wide ${stil.renk}`}>
                                        <stil.Ikon size={dar ? 13 : 11} strokeWidth={3} />
                                        {!dar && CEVAP_ETIKET[cevap!]}
                                      </span>
                                    ) : (
                                      <span className={`text-[11px] ${BM.soluk}`}>—</span>
                                    )}
                                  </td>
                                );
                              }))}
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}

                    {cevapVar && (
                      <div className={`flex flex-wrap items-center justify-end gap-x-2.5 gap-y-0.5 mt-1.5 text-[10.5px] font-bold ${BM.gri}`}>
                        <span>
                          {sonuc.evetSayisi} evet · {sonuc.hayirSayisi} hayır{sonuc.muafSayisi > 0 ? ` · ${sonuc.muafSayisi} muaf` : ""}
                        </span>
                        {sistem === "esik" && soru.hedefYuzde !== undefined && (
                          <span className="inline-flex items-center gap-0.5"><Target size={10} />hedef %{soru.hedefYuzde}</span>
                        )}
                        <span className={`font-extrabold ${oranRengi(sonuc.oran)}`}>%{sonuc.oran}</span>
                        {d.puanli && (
                          <span className={`font-extrabold tabular-nums ${sonuc.gecti ? "text-[#1e7f4a]" : "text-[#b23c28]"}`}>
                            {sonuc.kazanilanPuan}/{soru.puan} puan
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </BmKart>
          </section>
        );
      })}

      <p className={`text-[11px] leading-relaxed mt-3 px-1 ${BM.soluk}`}>
        Her sorunun altındaki tabloda üst satır gözlem tarihi, alt satır gözlem saatidir; "—" o gözlemde işaretlenmemiş demektir.
      </p>
    </div>
  );
}
