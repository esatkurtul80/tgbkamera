"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, XCircle, MinusCircle, Target, FileSpreadsheet, FileDown } from "lucide-react";
import { getDegerlendirme, getRaporTasarim } from "@/lib/firestore";
import { soruPuanHesapla } from "@/lib/skorlama";
import {
  pdfRaporBloklariOlustur,
  RaporBant,
  RaporMetaAlan,
  PDF_SAYFA_GENISLIK,
  RAPOR_RENK,
  RAPOR_MONO,
} from "@/components/degerlendirme/PdfRapor";
import { fontCss, tasarimBirlestir, type RaporTasarimAyarlari } from "@/lib/raporTasarim";
import type { Degerlendirme } from "@/types";

const AYLAR = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];

const CEVAP_CONFIG = {
  evet:  { label: "EVET",  bg: "#047857", renk: "#ffffff" },
  hayir: { label: "HAYIR", bg: "#be123c", renk: "#ffffff" },
  muaf:  { label: "MUAF",  bg: "#e7e5e4", renk: "#57534e" },
} as const;

const KOYU_ACCENT = "#5a1826";

function oranRengi(oran: number): string {
  return oran >= 80 ? "#047857" : oran >= 60 ? "#b45309" : "#be123c";
}

export default function DegerlendirmeRaporPage() {
  const { id } = useParams<{ id: string }>();
  const [d, setD] = useState<Degerlendirme | null>(null);
  const [tasarim, setTasarim] = useState<RaporTasarimAyarlari>(() => tasarimBirlestir(null));
  const [loading, setLoading] = useState(true);
  const [excelIndiriliyor, setExcelIndiriliyor] = useState(false);
  const [pdfIndiriliyor, setPdfIndiriliyor] = useState(false);

  useEffect(() => {
    Promise.all([getDegerlendirme(id), getRaporTasarim().catch(() => null)]).then(([data, kayit]) => {
      setD(data);
      setTasarim(tasarimBirlestir(kayit));
      setLoading(false);
    });
  }, [id]);

  async function handleExcelIndir() {
    if (!d) return;
    setExcelIndiriliyor(true);
    try {
      const { degerlendirmeExcelIndir } = await import("@/lib/excelExport");
      await degerlendirmeExcelIndir(d);
    } finally {
      setExcelIndiriliyor(false);
    }
  }

  async function handlePdfIndir() {
    if (!d) return;
    setPdfIndiriliyor(true);
    try {
      const { degerlendirmePdfIndir } = await import("@/lib/pdfExport");
      await degerlendirmePdfIndir(d);
    } finally {
      setPdfIndiriliyor(false);
    }
  }

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!d) return <p className="text-sm text-slate-500">Değerlendirme bulunamadı.</p>;

  // Eski format desteği
  const isLegacy = !d.izlenmeler || d.izlenmeler.length === 0;
  // Yeni tek-seferlik format (puansız veya yorumlu puanlı): puansizCevaplar alanı doldurulmuş.
  // Not: matris/otomatik-puanlı raporlarda da puansizCevaplar taslak aşamasında {} olarak set edilir,
  // bu yüzden tek başına yeterli değil — form gerçekten puansız-şekilli mi diye de bakılmalı.
  const isPuansizNewFormat =
    d.puansizCevaplar !== undefined && (d.puanli === false || d.puanGirisTipi === "manuel");
  const bolumSirasi = Object.keys(d.bolumSnapshot);
  const sistem = d.skorlamaSistemi ?? "oran";
  const kunyeFont = fontCss(tasarim.fontlar.kunye);

  // Yeni format: sıralı izlenmeler ve gün gruplama
  const siralanmis = isLegacy ? [] : [...d.izlenmeler].sort(
    (a, b) => a.tarih.toMillis() - b.tarih.toMillis()
  );

  const gunluk = (() => {
    const map = new Map<string, typeof siralanmis>();
    for (const iz of siralanmis) {
      const key = iz.tarih.toDate().toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(iz);
    }
    return [...map.entries()];
  })();

  const donem = d.ay !== undefined
    ? `${AYLAR[d.ay]} ${d.yil}`
    : d.izlenmeTarihi?.toDate().toLocaleDateString("tr-TR") ?? "—";

  return (
    <div className="w-full print:max-w-full">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 mb-5 print:hidden">
        <Link href="/degerlendirmeler" className="text-sm text-slate-500 hover:text-slate-700">Değerlendirmeler</Link>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-semibold text-slate-800">Rapor</span>
        <div className="ml-auto flex items-center gap-2">
          {!isPuansizNewFormat && !isLegacy && (
            <button onClick={handleExcelIndir} disabled={excelIndiriliyor}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-60">
              <FileSpreadsheet size={13} />
              {excelIndiriliyor ? "Hazırlanıyor..." : "Excel İndir"}
            </button>
          )}
          {isPuansizNewFormat && (
            <button onClick={handlePdfIndir} disabled={pdfIndiriliyor}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors disabled:opacity-60">
              <FileDown size={13} />
              {pdfIndiriliyor ? "Hazırlanıyor..." : "PDF İndir"}
            </button>
          )}
          <button onClick={() => window.print()}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
            Yazdır
          </button>
        </div>
      </div>

      {/* ── Puansız / yorumlu puanlı: PDF ile birebir aynı görünüm ─────────── */}
      {isPuansizNewFormat && (
        <div
          className="rounded-[10px] border shadow-sm mx-auto"
          style={{
            width: PDF_SAYFA_GENISLIK,
            maxWidth: "100%",
            background: RAPOR_RENK.kagit,
            borderColor: RAPOR_RENK.line,
            padding: "40px 48px 48px",
          }}
        >
          {pdfRaporBloklariOlustur(d, tasarim).map((b, i) => (
            <div key={i}>{b.el}</div>
          ))}
        </div>
      )}

      {/* ── Puanlı matris / eski format: bordo tasarımlı önizleme ──────────── */}
      {!isPuansizNewFormat && (
        <div
          className="rounded-[10px] border shadow-sm p-6 mb-4"
          style={{ background: RAPOR_RENK.kagit, borderColor: RAPOR_RENK.line }}
        >
          <RaporBant tasarim={tasarim} rozet={d.puanli ? "PUANLI" : "PUANSIZ"} />

          <h1
            className="font-extrabold leading-tight pt-5 pb-4 m-0"
            style={{ color: RAPOR_RENK.ink, fontFamily: fontCss(tasarim.fontlar.baslik), fontSize: tasarim.boyutlar.baslik }}
          >
            {d.formAd}
          </h1>

          <div className="flex items-stretch gap-3.5">
            <div
              className="flex-1 grid grid-cols-4 gap-x-5 gap-y-4 rounded-xl px-6 py-5"
              style={{ background: RAPOR_RENK.metaBg, border: `1px solid ${RAPOR_RENK.line}` }}
            >
              <RaporMetaAlan etiket="Personel" deger={d.personelAd} kunyeFont={kunyeFont} boyut={tasarim.boyutlar.kunye} />
              <RaporMetaAlan etiket="Mağaza" deger={d.magazaAd ?? ""} kunyeFont={kunyeFont} boyut={tasarim.boyutlar.kunye} />
              <RaporMetaAlan etiket="Dönem" deger={donem} kunyeFont={kunyeFont} boyut={tasarim.boyutlar.kunye} />
              <RaporMetaAlan
                etiket={isLegacy ? "Raporlama Tarihi" : "İzlenme Sayısı"}
                deger={isLegacy ? d.olusturmaTarihi?.toDate().toLocaleDateString("tr-TR") ?? "—" : String(siralanmis.length)}
                kunyeFont={kunyeFont}
                boyut={tasarim.boyutlar.kunye}
              />
            </div>
            {d.puanli && d.toplamPuan !== null && (
              <div
                className="w-[130px] shrink-0 rounded-xl flex flex-col items-center justify-center gap-1"
                style={{ background: RAPOR_RENK.accent, color: RAPOR_RENK.onAccent }}
              >
                <b className="font-extrabold leading-none" style={{ fontFamily: fontCss(tasarim.fontlar.puan), fontSize: tasarim.boyutlar.puan }}>
                  {d.toplamPuan}
                </b>
                <span className="text-[10px]" style={{ fontFamily: RAPOR_MONO, opacity: 0.85 }}>
                  / {d.maxPuan} PUAN
                </span>
                {d.maxPuan && d.maxPuan > 0 && (
                  <span className="text-[12px] font-bold" style={{ fontFamily: RAPOR_MONO }}>
                    %{Math.round((d.toplamPuan / d.maxPuan) * 100)}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Yeni format: Matris tablosu ──────────────────────────────────── */}
      {!isPuansizNewFormat && !isLegacy && (
        <div
          className="rounded-[10px] border overflow-hidden"
          style={{ background: RAPOR_RENK.kagit, borderColor: RAPOR_RENK.line }}
        >
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm" style={{ minWidth: `${300 + siralanmis.length * 90}px` }}>
              <thead>
                <tr>
                  <th
                    className="sticky left-0 z-20 px-4 py-3 text-left font-bold min-w-[280px]"
                    style={{ background: RAPOR_RENK.accent, color: "#ffffff", borderRight: `1px solid ${KOYU_ACCENT}` }}
                    rowSpan={2}
                  >
                    <div className="text-base" style={{ fontFamily: fontCss(tasarim.fontlar.soruBaslik), letterSpacing: "0.04em" }}>
                      {d.personelAd.toUpperCase()}
                    </div>
                    <div className="text-xs font-normal opacity-70 mt-0.5">{d.magazaAd}</div>
                  </th>
                  {gunluk.map(([dateStr, izs]) => (
                    <th
                      key={dateStr}
                      colSpan={izs.length}
                      className="text-center text-[11px] font-bold py-2 px-2 whitespace-nowrap"
                      style={{
                        background: KOYU_ACCENT,
                        color: RAPOR_RENK.onAccent,
                        borderLeft: "1px solid rgba(255,255,255,.14)",
                        fontFamily: RAPOR_MONO,
                        letterSpacing: "0.06em",
                      }}
                    >
                      {dateStr}
                    </th>
                  ))}
                </tr>
                <tr>
                  {siralanmis.map(iz => (
                    <th
                      key={iz.id}
                      className="px-2 py-2 text-center min-w-[80px]"
                      style={{ background: RAPOR_RENK.accentSoft, borderLeft: `1px solid ${RAPOR_RENK.qBorder}` }}
                    >
                      <span className="text-xs font-bold" style={{ color: RAPOR_RENK.accent, fontFamily: RAPOR_MONO }}>
                        {iz.tarih.toDate().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {bolumSirasi.map(bolumId => {
                  const bolum = d.bolumSnapshot[bolumId];
                  return (
                    <React.Fragment key={bolumId}>
                      <tr style={{ background: RAPOR_RENK.metaBg }}>
                        <td
                          className="sticky left-0 z-10 px-4 py-2 text-[11px] font-bold uppercase"
                          style={{
                            background: RAPOR_RENK.metaBg,
                            color: RAPOR_RENK.accent,
                            borderRight: `1px solid ${RAPOR_RENK.line}`,
                            letterSpacing: "0.08em",
                            fontFamily: fontCss(tasarim.fontlar.soruBaslik),
                          }}
                        >
                          {bolum.ad}
                        </td>
                        {siralanmis.map(iz => (
                          <td key={iz.id} style={{ background: RAPOR_RENK.metaBg, borderLeft: `1px solid ${RAPOR_RENK.line}` }} />
                        ))}
                      </tr>

                      {bolum.soruIdleri.map((soruId, idx) => {
                        const soru = d.soruSnapshot[soruId];
                        const sonuc = soru
                          ? soruPuanHesapla(
                              soruId, soru,
                              siralanmis.map(iz => ({ cevaplar: iz.cevaplar })),
                              sistem
                            )
                          : null;
                        const zeminRengi = idx % 2 === 0 ? RAPOR_RENK.kagit : RAPOR_RENK.qBg;

                        return (
                          <tr key={soruId} style={{ background: zeminRengi }}>
                            <td
                              className="sticky left-0 z-10 px-4 py-2.5"
                              style={{ background: zeminRengi, borderRight: `1px solid ${RAPOR_RENK.line}` }}
                            >
                              <div className="flex items-start gap-2">
                                <span className="text-[10px] mt-0.5 shrink-0" style={{ color: RAPOR_RENK.faint, fontFamily: RAPOR_MONO }}>
                                  {idx + 1}.
                                </span>
                                <div className="flex-1">
                                  <p
                                    className="leading-relaxed m-0"
                                    style={{ color: RAPOR_RENK.sub, fontFamily: fontCss(tasarim.fontlar.metin), fontSize: tasarim.boyutlar.metin }}
                                  >
                                    {soru?.metin}
                                  </p>
                                  {sonuc && sonuc.toplamIzlenme > 0 && (
                                    <div className="flex items-center gap-2 mt-1 flex-wrap" style={{ fontFamily: RAPOR_MONO }}>
                                      {sistem === "esik" && soru?.hedefYuzde !== undefined && (
                                        <span
                                          className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded font-medium"
                                          style={{ background: RAPOR_RENK.accentSoft, color: RAPOR_RENK.accent }}
                                        >
                                          <Target size={9} /> %{soru.hedefYuzde}
                                        </span>
                                      )}
                                      <span className="text-[10px] font-bold" style={{ color: oranRengi(sonuc.oran) }}>
                                        %{sonuc.oran}
                                      </span>
                                      {sonuc.gecti !== null && (sonuc.gecti
                                        ? <CheckCircle2 size={11} style={{ color: "#047857" }} />
                                        : <XCircle size={11} style={{ color: "#be123c" }} />
                                      )}
                                      {d.puanli && (
                                        <span className="text-[10px] font-semibold" style={{ color: RAPOR_RENK.accent }}>
                                          {sonuc.kazanilanPuan}/{soru?.puan}p
                                        </span>
                                      )}
                                      <span className="flex items-center gap-1 text-[10px]" style={{ color: RAPOR_RENK.faint }}>
                                        <CheckCircle2 size={9} style={{ color: "#047857" }} />{sonuc.evetSayisi}
                                        <XCircle size={9} className="ml-1" style={{ color: "#be123c" }} />{sonuc.hayirSayisi}
                                        {sonuc.muafSayisi > 0 && <><MinusCircle size={9} className="ml-1" />{sonuc.muafSayisi}</>}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            {siralanmis.map(iz => {
                              const cevap = iz.cevaplar[soruId];
                              const cfg = cevap ? CEVAP_CONFIG[cevap] : null;
                              return (
                                <td
                                  key={iz.id}
                                  className="text-center"
                                  style={{ minWidth: "80px", borderLeft: `1px solid ${RAPOR_RENK.line}`, background: cfg?.bg }}
                                >
                                  {cfg ? (
                                    <p className="py-2 px-1 text-[10px] font-bold m-0" style={{ color: cfg.renk, fontFamily: RAPOR_MONO, letterSpacing: "0.06em" }}>
                                      {cfg.label}
                                    </p>
                                  ) : (
                                    <p className="py-2 text-xs m-0" style={{ color: RAPOR_RENK.line }}>—</p>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Eski format (legacy): Klasik liste görünümü ───────────────────── */}
      {!isPuansizNewFormat && isLegacy && (
        <div className="space-y-4">
          {bolumSirasi.map(bolumId => {
            const bolum = d.bolumSnapshot[bolumId];
            return (
              <div
                key={bolumId}
                className="rounded-[10px] border overflow-hidden"
                style={{ background: RAPOR_RENK.kagit, borderColor: RAPOR_RENK.line }}
              >
                <div className="px-5 py-3" style={{ background: RAPOR_RENK.metaBg, borderBottom: `1px solid ${RAPOR_RENK.line}` }}>
                  <p
                    className="text-sm font-bold uppercase m-0"
                    style={{ color: RAPOR_RENK.accent, letterSpacing: "0.06em", fontFamily: fontCss(tasarim.fontlar.soruBaslik) }}
                  >
                    {bolum.ad}
                  </p>
                </div>
                <div>
                  {bolum.soruIdleri.map((soruId, i) => {
                    const soru = d.soruSnapshot[soruId];
                    const cevap = d.cevaplar?.[soruId];
                    const cfg = cevap ? CEVAP_CONFIG[cevap] : null;
                    return (
                      <div
                        key={soruId}
                        className="flex items-center gap-3 px-5 py-3.5"
                        style={{ borderBottom: `1px solid ${RAPOR_RENK.line}` }}
                      >
                        <span className="text-xs w-5 shrink-0" style={{ color: RAPOR_RENK.faint, fontFamily: RAPOR_MONO }}>{i + 1}.</span>
                        <p className="flex-1 m-0" style={{ color: RAPOR_RENK.sub, fontFamily: fontCss(tasarim.fontlar.metin), fontSize: tasarim.boyutlar.metin }}>
                          {soru?.metin}
                        </p>
                        {d.puanli && soru && (
                          <span className="text-xs shrink-0" style={{ color: RAPOR_RENK.faint, fontFamily: RAPOR_MONO }}>{soru.puan} p.</span>
                        )}
                        {cfg && (
                          <span
                            className="text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0"
                            style={{ background: cfg.bg, color: cfg.renk, fontFamily: RAPOR_MONO, letterSpacing: "0.06em" }}
                          >
                            {cfg.label}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
