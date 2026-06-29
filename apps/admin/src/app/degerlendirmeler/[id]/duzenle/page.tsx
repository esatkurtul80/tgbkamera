"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Camera } from "lucide-react";
import { Timestamp } from "firebase/firestore";
import {
  getDegerlendirme,
  updateDegerlendirme,
  updateDegerlendirmeIzlenmeler,
} from "@/lib/firestore";
import { hesaplaPuanFromIzlenmeler, hesaplaPuan } from "@/lib/skorlama";
import type { Degerlendirme, CevapSecenegi, SoruIzlenme } from "@/types";

const OPTS: { value: CevapSecenegi; label: string }[] = [
  { value: "evet",  label: "E" },
  { value: "hayir", label: "H" },
  { value: "muaf",  label: "M" },
];

function cevapStyle(opt: CevapSecenegi, active: boolean) {
  if (!active) return "border-slate-200 text-slate-400 hover:bg-slate-50";
  if (opt === "evet")  return "border-emerald-500 bg-emerald-50 text-emerald-700";
  if (opt === "hayir") return "border-red-400 bg-red-50 text-red-600";
  return "border-slate-400 bg-slate-100 text-slate-600";
}

export default function DegerlendirmeDuzenlePage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [data, setData] = useState<Degerlendirme | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Legacy format
  const [izlenmeTarihi, setIzlenmeTarihi] = useState("");
  const [cevaplar, setCevaplar] = useState<Record<string, CevapSecenegi>>({});

  // Matris format
  const [izlenmeler, setIzlenmeler] = useState<SoruIzlenme[]>([]);

  useEffect(() => {
    getDegerlendirme(id).then(d => {
      if (d) {
        setData(d);
        const tarih = d.izlenmeTarihi?.toDate?.();
        setIzlenmeTarihi(tarih ? tarih.toISOString().split("T")[0] : "");
        setCevaplar({ ...(d.cevaplar ?? {}) });
        setIzlenmeler(d.izlenmeler ? d.izlenmeler.map(iz => ({ ...iz, cevaplar: { ...iz.cevaplar } })) : []);
      }
      setLoading(false);
    });
  }, [id]);

  function setCevapMatris(izlenmeId: string, soruId: string, opt: CevapSecenegi) {
    setIzlenmeler(prev =>
      prev.map(iz =>
        iz.id === izlenmeId
          ? { ...iz, cevaplar: { ...iz.cevaplar, [soruId]: opt } }
          : iz
      )
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!data) return;
    setSaving(true);

    if (isLegacy) {
      let toplamPuan: number | null = null;
      let maxPuan: number | null = null;
      if (data.puanli) {
        const hesap = hesaplaPuan(cevaplar, data.soruSnapshot);
        toplamPuan = hesap.toplamPuan;
        maxPuan = hesap.maxPuan;
      }
      await updateDegerlendirme(id, {
        ...(izlenmeTarihi ? { izlenmeTarihi: Timestamp.fromDate(new Date(izlenmeTarihi)) } : {}),
        cevaplar,
        toplamPuan,
        maxPuan,
      });
    } else {
      let toplamPuan: number | null = null;
      let maxPuan: number | null = null;
      if (data.puanli) {
        const sistem = data.skorlamaSistemi ?? "oran";
        const hesap = hesaplaPuanFromIzlenmeler(izlenmeler, data.soruSnapshot, sistem);
        toplamPuan = hesap.toplamPuan;
        maxPuan = hesap.maxPuan;
      }
      await updateDegerlendirmeIzlenmeler(id, izlenmeler, toplamPuan, maxPuan);
    }

    router.push("/degerlendirmeler");
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return <p className="text-sm text-slate-500">Değerlendirme bulunamadı.</p>;

  const isLegacy = !data.izlenmeler || data.izlenmeler.length === 0;
  const bolumSirasi = Object.keys(data.bolumSnapshot);

  const siralanmis = [...izlenmeler].sort((a, b) => a.tarih.toMillis() - b.tarih.toMillis());

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
    <div className="w-full max-w-full">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/degerlendirmeler" className="text-sm text-slate-500 hover:text-slate-700">
          Değerlendirmeler
        </Link>
        <span className="text-slate-300">/</span>
        <Link href={`/degerlendirmeler/${id}`} className="text-sm text-slate-500 hover:text-slate-700">
          {data.formAd}
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-semibold text-slate-800">Düzenle</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Bilgi + eylem kartı */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-1">
              <p className="text-base font-bold text-slate-900">{data.formAd}</p>
              <p className="text-sm text-slate-600"><span className="font-medium">Personel:</span> {data.personelAd}</p>
              {data.magazaAd && (
                <p className="text-sm text-slate-600"><span className="font-medium">Mağaza:</span> {data.magazaAd}</p>
              )}
              {data.kameramanAd && (
                <p className="text-sm text-violet-700 inline-flex items-center gap-1">
                  <Camera size={12} /> {data.kameramanAd}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-60"
              >
                {saving ? "Kaydediliyor..." : "Güncelle"}
              </button>
              <Link
                href="/degerlendirmeler"
                className="px-5 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                İptal
              </Link>
            </div>
          </div>

          {isLegacy && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <label className="block text-xs font-medium text-slate-600 mb-1.5">İzlenme Tarihi</label>
              <input
                type="date"
                value={izlenmeTarihi}
                onChange={e => setIzlenmeTarihi(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full max-w-xs"
              />
            </div>
          )}
        </div>

        {/* ── Eski format: Cevap listesi ───────────────────────────────────── */}
        {isLegacy && (
          <div className="space-y-3">
            {bolumSirasi.map(bolumId => {
              const bolum = data.bolumSnapshot[bolumId];
              return (
                <div key={bolumId} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                    <p className="text-xs font-semibold text-slate-700">{bolum.ad}</p>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {bolum.soruIdleri.map((soruId, idx) => {
                      const soru = data.soruSnapshot[soruId];
                      const cevap = cevaplar[soruId];
                      return (
                        <div key={soruId} className="flex items-center gap-3 px-4 py-2.5">
                          <span className="text-xs text-slate-400 w-5 shrink-0">{idx + 1}.</span>
                          <p className="flex-1 text-xs text-slate-700">{soru?.metin}</p>
                          <div className="flex items-center gap-1 shrink-0">
                            {OPTS.map(o => (
                              <button
                                key={o.value}
                                type="button"
                                onClick={() => setCevaplar(prev => ({ ...prev, [soruId]: o.value }))}
                                className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition-colors ${cevapStyle(o.value, cevap === o.value)}`}
                              >
                                {o.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Yeni format: Düzenlenebilir matris ──────────────────────────── */}
        {!isLegacy && (
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table
                className="w-full border-collapse text-sm"
                style={{ minWidth: `${300 + siralanmis.length * 120}px` }}
              >
                <thead>
                  <tr>
                    <th
                      className="sticky left-0 z-20 bg-indigo-900 text-white px-4 py-3 text-left font-bold min-w-[280px] border-r border-indigo-800"
                      rowSpan={2}
                    >
                      <div className="text-base">{data.personelAd.toUpperCase()}</div>
                      <div className="text-xs font-normal opacity-70 mt-0.5">{data.magazaAd}</div>
                    </th>
                    {gunluk.map(([dateStr, izs]) => (
                      <th
                        key={dateStr}
                        colSpan={izs.length}
                        className="bg-indigo-700 text-white text-center text-xs font-bold py-2 px-2 border-l border-indigo-600 whitespace-nowrap"
                      >
                        {dateStr}
                      </th>
                    ))}
                  </tr>
                  <tr>
                    {siralanmis.map(iz => (
                      <th key={iz.id} className="bg-amber-100 border-l border-amber-200 px-2 py-2 text-center min-w-[110px]">
                        <span className="text-xs font-bold text-indigo-900">
                          {iz.tarih.toDate().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {bolumSirasi.map(bolumId => {
                    const bolum = data.bolumSnapshot[bolumId];
                    return (
                      <React.Fragment key={bolumId}>
                        <tr className="bg-slate-100">
                          <td className="sticky left-0 z-10 bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600 uppercase tracking-wider border-r border-slate-200">
                            {bolum.ad}
                          </td>
                          {siralanmis.map(iz => (
                            <td key={iz.id} className="border-l border-slate-200 bg-slate-100" />
                          ))}
                        </tr>

                        {bolum.soruIdleri.map((soruId, idx) => {
                          const soru = data.soruSnapshot[soruId];
                          return (
                            <tr key={soruId} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                              <td className={`sticky left-0 z-10 px-4 py-2.5 border-r border-slate-200 ${idx % 2 === 0 ? "bg-white" : "bg-slate-50"}`}>
                                <div className="flex items-start gap-2">
                                  <span className="text-[10px] text-slate-400 mt-0.5 shrink-0">{idx + 1}.</span>
                                  <p className="text-xs text-slate-700 leading-relaxed">{soru?.metin}</p>
                                </div>
                              </td>
                              {siralanmis.map(iz => {
                                const cevap = iz.cevaplar[soruId];
                                return (
                                  <td
                                    key={iz.id}
                                    className="border-l border-slate-200 text-center px-1 py-1.5"
                                    style={{ minWidth: "110px" }}
                                  >
                                    <div className="flex items-center justify-center gap-0.5">
                                      {OPTS.map(o => (
                                        <button
                                          key={o.value}
                                          type="button"
                                          onClick={() => setCevapMatris(iz.id, soruId, o.value)}
                                          className={`px-1.5 py-0.5 rounded text-[11px] font-semibold border transition-colors ${cevapStyle(o.value, cevap === o.value)}`}
                                        >
                                          {o.label}
                                        </button>
                                      ))}
                                    </div>
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
      </form>
    </div>
  );
}
