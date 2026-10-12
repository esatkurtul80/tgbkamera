"use client";

import { useMemo } from "react";
import { Check, X, Minus, FileDown, Repeat, Store, CalendarDays, ClipboardCheck } from "lucide-react";
import { puansizCevapDoluMu } from "@/lib/puansiz";
import { donemEtiketi } from "@/lib/puan";
import { sonAyPuanlariHesapla } from "@/components/degerlendirme/PdfRapor";
import { BM_YOL } from "./BmShell";
import { BmKart, GeriButonu } from "./BmParcalar";
import { BM } from "./tema";
import type { CevapSecenegi, Degerlendirme, PuansizCevapDegeri, SoruTipi, TekrarIzleme } from "@/types";

const AY_KISA = ["Oca","Şub","Mar","Nis","May","Haz","Tem","Ağu","Eyl","Eki","Kas","Ara"];

const EHM: Record<CevapSecenegi, { etiket: string; bg: string; renk: string; Ikon: typeof Check }> = {
  evet: { etiket: "EVET", bg: "bg-[#ddf2e2]", renk: "text-[#1e7f4a]", Ikon: Check },
  hayir: { etiket: "HAYIR", bg: "bg-[#fadfd8]", renk: "text-[#b23c28]", Ikon: X },
  muaf: { etiket: "MUAF", bg: "bg-[#eef2ef]", renk: "text-[#77857e]", Ikon: Minus },
};

const TIP_ETIKET: Record<SoruTipi, string> = {
  evet_hayir_muaf: "Evet / Hayır",
  sayi: "Sayı",
  tarih: "Tarih",
  saat: "Saat",
  kisa_metin: "Kısa cevap",
  yorum: "Yorum",
};

/** Kısa tipli sorunun (evet/hayır, sayı, tarih, saat) cevabı — soru metninin altında kendi satırında. */
function KisaCevap({ tip, cevap }: { tip: SoruTipi; cevap: PuansizCevapDegeri | undefined }) {
  if (tip === "evet_hayir_muaf") {
    const sec = cevap?.evetHayirMuaf;
    if (!sec) return <Cevapsiz />;
    const s = EHM[sec];
    return (
      <span className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-extrabold tracking-wide ${s.bg} ${s.renk}`}>
        <s.Ikon size={12} strokeWidth={3} />{s.etiket}
      </span>
    );
  }
  const deger =
    tip === "sayi" ? (cevap?.sayi !== undefined ? String(cevap.sayi) : undefined)
    : tip === "tarih" ? cevap?.tarih
    : tip === "saat" ? cevap?.saat
    : undefined;
  if (!deger) return <Cevapsiz />;
  return (
    <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-[13px] font-extrabold tabular-nums ${BM.griBg} ${BM.murekkep}`}>
      {deger}
    </span>
  );
}

function Cevapsiz() {
  return (
    <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-[11px] font-bold border border-dashed border-[#c4cfc8] ${BM.soluk}`}>
      Cevaplanmadı
    </span>
  );
}

/**
 * Bölge müdürü için puansız / yorumlu puanlı rapor detayı — telefon öncelikli.
 * PDF önizlemesi yerine geniş kartlar: her soru tam genişlikte, cevap soru metninin altında,
 * fotoğraflar kartın içinde tam genişlikte. Kameraman adı gösterilmez.
 */
export default function BmPuansizRaporDetay({
  d, sonRaporlar, takip, onPdf, pdfIndiriliyor,
}: {
  d: Degerlendirme;
  sonRaporlar: Degerlendirme[];
  takip: TekrarIzleme | null;
  onPdf: () => void;
  pdfIndiriliyor: boolean;
}) {
  const yorumluPuanli = d.puanli === true && d.puanGirisTipi === "manuel";
  const sonAylar = useMemo(() => sonAyPuanlariHesapla(sonRaporlar), [sonRaporlar]);
  const bolumSirasi = Object.keys(d.bolumSnapshot);
  const izlenme = d.izlenmeTarihi?.toDate().toLocaleDateString("tr-TR");
  const raporlama = d.olusturmaTarihi?.toDate().toLocaleDateString("tr-TR");
  const devamEdiyor = d.durum === "acik";

  const toplamSoru = bolumSirasi.reduce((n, b) => n + (d.bolumSnapshot[b]?.soruIdleri.length ?? 0), 0);
  const cevaplanan = bolumSirasi.reduce(
    (n, b) =>
      n +
      (d.bolumSnapshot[b]?.soruIdleri.filter((sid) =>
        puansizCevapDoluMu(d.soruSnapshot[sid]?.tip ?? "evet_hayir_muaf", d.puansizCevaplar?.[sid])
      ).length ?? 0),
    0
  );

  return (
    <div>
      {/* Üst satır: geri, başlık, PDF */}
      <div className="flex items-center gap-3 pt-1 pb-3">
        <GeriButonu href={BM_YOL.raporlar} />
        <div className="flex-1 min-w-0">
          <p className={`text-[11px] font-bold tracking-wider uppercase ${BM.soluk}`}>
            {yorumluPuanli ? "Yorumlu puanlı rapor" : "Puansız rapor"}
          </p>
          <h1 className={`text-[18px] leading-tight font-extrabold tracking-tight truncate ${BM.murekkep}`}>{d.formAd}</h1>
        </div>
        <button
          type="button"
          onClick={onPdf}
          disabled={pdfIndiriliyor}
          className={`inline-flex items-center gap-1.5 ${BM.kart} rounded-full px-3 h-9 text-[12px] font-bold ${BM.murekkep} hover:bg-[#f7faf8] disabled:opacity-60 cursor-pointer shrink-0`}
        >
          <FileDown size={14} />
          {pdfIndiriliyor ? "Hazırlanıyor…" : "PDF"}
        </button>
      </div>

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

      {/* Bordo künye kartı: ad (+ yorumlu puan) üstte, bilgiler altta tek satır */}
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
          {yorumluPuanli && (
            <div className="shrink-0 text-right">
              {d.toplamPuan !== null ? (
                <div className="flex items-baseline justify-end gap-1">
                  <span className="text-[34px] leading-none font-extrabold text-white tabular-nums tracking-tight">{d.toplamPuan}</span>
                  <span className="text-[11px] font-bold text-white/60">/ 100</span>
                </div>
              ) : (
                <p className="text-[13px] font-extrabold text-white/80">{devamEdiyor ? "Devam ediyor" : "—"}</p>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2.5 pt-2.5 border-t border-white/10 text-[11.5px] font-semibold text-white/75">
          {!d.magazaRaporu && d.magazaAd && (
            <span className="inline-flex items-center gap-1"><Store size={11} />{d.magazaAd}</span>
          )}
          {izlenme && <span className="inline-flex items-center gap-1"><CalendarDays size={11} />İzlenme {izlenme}</span>}
          {raporlama && raporlama !== izlenme && <span>Rapor {raporlama}</span>}
          <span className="inline-flex items-center gap-1"><ClipboardCheck size={11} />{cevaplanan}/{toplamSoru} cevaplandı</span>
          {devamEdiyor && (
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

      {/* Bölümler */}
      {bolumSirasi.map((bolumId) => {
        const bolum = d.bolumSnapshot[bolumId];
        if (!bolum) return null;
        const bolumCevaplanan = bolum.soruIdleri.filter((sid) =>
          puansizCevapDoluMu(d.soruSnapshot[sid]?.tip ?? "evet_hayir_muaf", d.puansizCevaplar?.[sid])
        ).length;
        return (
          <section key={bolumId} className="mt-4">
            <div className="flex items-center justify-between mb-2 px-0.5">
              <h3 className={`text-[15px] font-extrabold ${BM.murekkep}`}>{bolum.ad}</h3>
              <span className={`text-[11.5px] font-bold ${BM.soluk}`}>{bolumCevaplanan}/{bolum.soruIdleri.length}</span>
            </div>
            <BmKart>
              {bolum.soruIdleri.map((soruId, idx) => {
                const soru = d.soruSnapshot[soruId];
                if (!soru) return null;
                const tip = soru.tip ?? "evet_hayir_muaf";
                const cevap = d.puansizCevaplar?.[soruId];
                const kisaTipli = tip === "evet_hayir_muaf" || tip === "sayi" || tip === "tarih" || tip === "saat";
                const uzunDeger = tip === "kisa_metin" ? cevap?.kisaMetin : tip === "yorum" ? cevap?.yorum : undefined;
                const fotograflar = cevap?.fotograflar ?? [];
                return (
                  <div key={soruId} className={`px-4 py-3.5 ${idx > 0 ? `border-t ${BM.ayrac}` : ""}`}>
                    <div className="flex items-start gap-2.5">
                      <span className={`w-6 h-6 rounded-full ${BM.griBg} flex items-center justify-center text-[11px] font-extrabold shrink-0 mt-px ${BM.murekkep}`}>
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-[14px] leading-snug font-bold ${BM.murekkep}`}>{soru.metin}</p>
                        <p className={`text-[10.5px] font-semibold mt-0.5 ${BM.soluk}`}>{TIP_ETIKET[tip]}</p>
                      </div>
                    </div>

                    {/* Cevap: soru metninin altında, tam genişlik */}
                    <div className="mt-2.5 pl-[34px]">
                      {kisaTipli && <KisaCevap tip={tip} cevap={cevap} />}

                      {!kisaTipli && (
                        uzunDeger?.trim() ? (
                          <p className={`text-[13.5px] leading-relaxed whitespace-pre-wrap ${BM.murekkep}`}>{uzunDeger}</p>
                        ) : (
                          <Cevapsiz />
                        )
                      )}

                      {tip !== "yorum" && cevap?.yorum?.trim() && (
                        <p className={`mt-2.5 text-[13px] leading-relaxed whitespace-pre-wrap rounded-r-xl pl-3 pr-3 py-2 border-l-[3px] border-[#9b1b30] ${BM.griBg} ${BM.gri}`}>
                          <span className={`font-extrabold ${BM.murekkep}`}>Not: </span>{cevap.yorum}
                        </p>
                      )}

                      {fotograflar.length > 0 && (
                        <div className="mt-3 flex flex-col gap-2.5">
                          {fotograflar.map((url, fi) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              key={url + fi}
                              src={url}
                              alt={`${idx + 1}. soru fotoğrafı`}
                              loading="lazy"
                              className={`block w-full h-auto rounded-2xl ${BM.griBg}`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </BmKart>
          </section>
        );
      })}
    </div>
  );
}
