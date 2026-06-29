"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Camera, CheckCircle2, XCircle, MinusCircle, Target } from "lucide-react";
import Badge from "@/components/ui/Badge";
import { getDegerlendirme } from "@/lib/firestore";
import { soruPuanHesapla } from "@/lib/skorlama";
import type { Degerlendirme } from "@/types";

const AYLAR = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];

const CEVAP_CONFIG = {
  evet:  { label: "EVET",  bg: "bg-emerald-500", text: "text-white" },
  hayir: { label: "HAYIR", bg: "bg-red-500",     text: "text-white" },
  muaf:  { label: "MUAF",  bg: "bg-slate-300",   text: "text-slate-700" },
} as const;

export default function DegerlendirmeRaporPage() {
  const { id } = useParams<{ id: string }>();
  const [d, setD] = useState<Degerlendirme | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDegerlendirme(id).then(data => { setD(data); setLoading(false); });
  }, [id]);

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!d) return <p className="text-sm text-slate-500">Değerlendirme bulunamadı.</p>;

  // Eski format desteği
  const isLegacy = !d.izlenmeler || d.izlenmeler.length === 0;
  const bolumSirasi = Object.keys(d.bolumSnapshot);
  const sistem = d.skorlamaSistemi ?? "oran";

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

  return (
    <div className="w-full print:max-w-full">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 mb-5 print:hidden">
        <Link href="/degerlendirmeler" className="text-sm text-slate-500 hover:text-slate-700">Değerlendirmeler</Link>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-semibold text-slate-800">Rapor</span>
        <button onClick={() => window.print()}
          className="ml-auto px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
          Yazdır
        </button>
      </div>

      {/* Özet kart */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 mb-4">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-slate-900">{d.formAd}</h1>
              <Badge variant={d.puanli ? "puanli" : "puansiz"} />
            </div>
            <p className="text-sm text-slate-600"><span className="font-medium">Personel:</span> {d.personelAd}</p>
            {d.magazaAd && <p className="text-sm text-slate-600"><span className="font-medium">Mağaza:</span> {d.magazaAd}</p>}
            <p className="text-sm text-slate-600">
              <span className="font-medium">Dönem:</span>{" "}
              {d.ay !== undefined ? `${AYLAR[d.ay]} ${d.yil}` : d.izlenmeTarihi?.toDate().toLocaleDateString("tr-TR") ?? "—"}
            </p>
            {d.kameramanAd && (
              <p className="text-sm text-slate-600 inline-flex items-center gap-1">
                <span className="font-medium">Kameraman:</span>
                <span className="inline-flex items-center gap-1 text-violet-700">
                  <Camera size={12} /> {d.kameramanAd}
                </span>
              </p>
            )}
            <p className="text-xs text-slate-400">{siralanmis.length} izlenme kaydı</p>
          </div>
          {d.puanli && d.toplamPuan !== null && (
            <div className="text-right shrink-0">
              <p className={`text-4xl font-bold ${(d.toplamPuan / (d.maxPuan ?? 1)) >= 0.8 ? "text-emerald-600" : (d.toplamPuan / (d.maxPuan ?? 1)) >= 0.6 ? "text-amber-500" : "text-red-500"}`}>
                {d.toplamPuan}
              </p>
              <p className="text-xs text-slate-400">/ {d.maxPuan} puan</p>
              {d.maxPuan && d.maxPuan > 0 && (
                <p className="text-sm font-semibold text-slate-600 mt-0.5">
                  %{Math.round((d.toplamPuan / d.maxPuan) * 100)}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Yeni format: Matris tablosu ──────────────────────────────────── */}
      {!isLegacy && (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm" style={{ minWidth: `${300 + siralanmis.length * 90}px` }}>
              <thead>
                <tr>
                  <th className="sticky left-0 z-20 bg-indigo-900 text-white px-4 py-3 text-left font-bold min-w-[280px] border-r border-indigo-800" rowSpan={2}>
                    <div className="text-base">{d.personelAd.toUpperCase()}</div>
                    <div className="text-xs font-normal opacity-70 mt-0.5">{d.magazaAd}</div>
                  </th>
                  {gunluk.map(([dateStr, izs]) => (
                    <th key={dateStr} colSpan={izs.length}
                      className="bg-indigo-700 text-white text-center text-xs font-bold py-2 px-2 border-l border-indigo-600 whitespace-nowrap">
                      {dateStr}
                    </th>
                  ))}
                </tr>
                <tr>
                  {siralanmis.map(iz => (
                    <th key={iz.id} className="bg-amber-100 border-l border-amber-200 px-2 py-2 text-center min-w-[80px]">
                      <span className="text-xs font-bold text-indigo-900">
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
                      <tr className="bg-slate-100">
                        <td className="sticky left-0 z-10 bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600 uppercase tracking-wider border-r border-slate-200">
                          {bolum.ad}
                        </td>
                        {siralanmis.map(iz => <td key={iz.id} className="border-l border-slate-200 bg-slate-100" />)}
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

                        return (
                          <tr key={soruId} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                            <td className={`sticky left-0 z-10 px-4 py-2.5 border-r border-slate-200 ${idx % 2 === 0 ? "bg-white" : "bg-slate-50"}`}>
                              <div className="flex items-start gap-2">
                                <span className="text-[10px] text-slate-400 mt-0.5 shrink-0">{idx + 1}.</span>
                                <div className="flex-1">
                                  <p className="text-xs text-slate-700 leading-relaxed">{soru?.metin}</p>
                                  {sonuc && sonuc.toplamIzlenme > 0 && (
                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                      {sistem === "esik" && soru?.hedefYuzde !== undefined && (
                                        <span className="inline-flex items-center gap-0.5 text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded font-medium">
                                          <Target size={9} /> %{soru.hedefYuzde}
                                        </span>
                                      )}
                                      <span className={`text-[10px] font-bold ${sonuc.oran >= 80 ? "text-emerald-600" : sonuc.oran >= 60 ? "text-amber-600" : "text-red-500"}`}>
                                        %{sonuc.oran}
                                      </span>
                                      {sonuc.gecti !== null && (sonuc.gecti
                                        ? <CheckCircle2 size={11} className="text-emerald-500" />
                                        : <XCircle size={11} className="text-red-400" />
                                      )}
                                      {d.puanli && (
                                        <span className="text-[10px] font-semibold text-indigo-600">
                                          {sonuc.kazanilanPuan}/{soru?.puan}p
                                        </span>
                                      )}
                                      <span className="flex items-center gap-1 text-[10px] text-slate-400">
                                        <CheckCircle2 size={9} className="text-emerald-500" />{sonuc.evetSayisi}
                                        <XCircle size={9} className="text-red-400 ml-1" />{sonuc.hayirSayisi}
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
                                <td key={iz.id} className={`border-l border-slate-200 text-center ${cfg ? cfg.bg : ""}`} style={{ minWidth: "80px" }}>
                                  {cfg ? (
                                    <p className={`py-2 px-1 text-[11px] font-bold ${cfg.text}`}>{cfg.label}</p>
                                  ) : (
                                    <p className="py-2 text-slate-200 text-xs">—</p>
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
      {isLegacy && (
        <div className="space-y-4">
          {bolumSirasi.map(bolumId => {
            const bolum = d.bolumSnapshot[bolumId];
            return (
              <div key={bolumId} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
                  <p className="text-sm font-semibold text-slate-800">{bolum.ad}</p>
                </div>
                <div className="divide-y divide-slate-50">
                  {bolum.soruIdleri.map((soruId, i) => {
                    const soru = d.soruSnapshot[soruId];
                    const cevap = d.cevaplar?.[soruId];
                    const cfg = cevap ? CEVAP_CONFIG[cevap] : null;
                    return (
                      <div key={soruId} className="flex items-center gap-3 px-5 py-3.5">
                        <span className="text-xs text-slate-400 w-5 shrink-0">{i + 1}.</span>
                        <p className="flex-1 text-sm text-slate-700">{soru?.metin}</p>
                        {d.puanli && soru && <span className="text-xs text-slate-400 shrink-0">{soru.puan} p.</span>}
                        {cfg && (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${cfg.bg} ${cfg.text}`}>
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
