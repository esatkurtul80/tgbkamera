"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import { getDegerlendirme } from "@/lib/firestore";
import type { Degerlendirme } from "@/types";

const cevapLabel: Record<string, { label: string; className: string }> = {
  evet: { label: "Evet", className: "bg-emerald-50 text-emerald-700" },
  hayir: { label: "Hayır", className: "bg-red-50 text-red-600" },
  muaf: { label: "Muaf", className: "bg-slate-100 text-slate-500" },
};

export default function DegerlendirmeRaporPage() {
  const { id } = useParams<{ id: string }>();
  const [d, setD] = useState<Degerlendirme | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDegerlendirme(id).then((data) => { setD(data); setLoading(false); });
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!d) return <p className="text-sm text-slate-500">Değerlendirme bulunamadı.</p>;

  const tarih = d.tarih?.toDate?.() ?? new Date();
  const bolumSirasi = Object.keys(d.bolumSnapshot);

  return (
    <div className="max-w-2xl print:max-w-full">
      <div className="flex items-center gap-3 mb-6 print:hidden">
        <Link href="/degerlendirmeler" className="text-sm text-slate-500 hover:text-slate-700">Değerlendirmeler</Link>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-semibold text-slate-800">Rapor</span>
        <button
          onClick={() => window.print()}
          className="ml-auto px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          Yazdır
        </button>
      </div>

      {/* Özet */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 mb-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-lg font-bold text-slate-900">{d.formAd}</h1>
              <Badge variant={d.puanli ? "puanli" : "puansiz"} />
            </div>
            <p className="text-sm text-slate-600"><span className="font-medium">Personel:</span> {d.personelAd}</p>
            <p className="text-sm text-slate-600 mt-0.5"><span className="font-medium">Tarih:</span> {tarih.toLocaleDateString("tr-TR")}</p>
          </div>
          {d.puanli && d.toplamPuan !== null && (
            <div className="text-right">
              <p className="text-3xl font-bold text-indigo-600">{d.toplamPuan}</p>
              <p className="text-xs text-slate-400">/ {d.maxPuan} puan</p>
              {d.maxPuan && d.maxPuan > 0 && (
                <p className="text-sm font-semibold text-slate-600 mt-1">
                  %{Math.round((d.toplamPuan / d.maxPuan) * 100)}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bölümler */}
      <div className="space-y-4">
        {bolumSirasi.map((bolumId) => {
          const bolum = d.bolumSnapshot[bolumId];
          const bolumPuan = bolum.soruIdleri.reduce((toplam, soruId) => {
            const cevap = d.cevaplar[soruId];
            const soru = d.soruSnapshot[soruId];
            if (cevap === "evet" && soru) return toplam + soru.puan;
            return toplam;
          }, 0);
          const bolumMax = bolum.soruIdleri.reduce((toplam, soruId) => {
            const cevap = d.cevaplar[soruId];
            const soru = d.soruSnapshot[soruId];
            if (cevap !== "muaf" && soru) return toplam + soru.puan;
            return toplam;
          }, 0);

          return (
            <div key={bolumId} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-800">{bolum.ad}</p>
                {d.puanli && (
                  <p className="text-xs font-semibold text-indigo-600">{bolumPuan} / {bolumMax} puan</p>
                )}
              </div>
              <div className="divide-y divide-slate-50">
                {bolum.soruIdleri.map((soruId, i) => {
                  const soru = d.soruSnapshot[soruId];
                  const cevap = d.cevaplar[soruId];
                  const style = cevapLabel[cevap] ?? { label: "—", className: "bg-slate-100 text-slate-400" };
                  return (
                    <div key={soruId} className="flex items-center gap-3 px-5 py-3.5">
                      <span className="text-xs text-slate-400 w-5 shrink-0">{i + 1}.</span>
                      <p className="flex-1 text-sm text-slate-700">{soru?.metin}</p>
                      {d.puanli && soru && (
                        <span className="text-xs text-slate-400 shrink-0">{soru.puan} p.</span>
                      )}
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${style.className}`}>
                        {style.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
