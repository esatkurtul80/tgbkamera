"use client";

import { forwardRef } from "react";
import { Camera, User, Store, Calendar, StickyNote } from "lucide-react";
import Badge from "@/components/ui/Badge";
import { puansizCevapDoluMu } from "@/lib/puansiz";
import { PuansizCevapGoster } from "./PuansizCevapAlani";
import PuansizFotoStrip from "./PuansizFotoStrip";
import type { Degerlendirme } from "@/types";

interface PuansizRaporIcerikProps {
  d: Degerlendirme;
}

/**
 * Puansız (tek seferlik) bir değerlendirmenin görsel rapor içeriği.
 * Hem ekranda görüntülemede hem de PDF üretimi için html2canvas ile
 * yakalanan gizli kapsayıcıda aynen kullanılır — tek kaynak, tek görünüm.
 */
const PuansizRaporIcerik = forwardRef<HTMLDivElement, PuansizRaporIcerikProps>(
  function PuansizRaporIcerik({ d }, ref) {
    const bolumSirasi = Object.keys(d.bolumSnapshot);

    return (
      <div ref={ref} className="w-full bg-slate-50">
        {/* Özet kart */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 mb-4">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-bold text-slate-900">{d.formAd}</h1>
                <Badge variant="puansiz" />
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <User size={13} className="text-slate-400" /> {d.personelAd}
                </span>
                {d.magazaAd && (
                  <span className="inline-flex items-center gap-1.5">
                    <Store size={13} className="text-slate-400" /> {d.magazaAd}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <Calendar size={13} className="text-slate-400" />
                  {d.izlenmeTarihi?.toDate().toLocaleDateString("tr-TR") ?? "—"}
                </span>
                {d.kameramanAd && (
                  <span className="inline-flex items-center gap-1.5 text-violet-700">
                    <Camera size={13} /> {d.kameramanAd}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {bolumSirasi.map((bolumId) => {
            const bolum = d.bolumSnapshot[bolumId];
            const cevaplanan = bolum.soruIdleri.filter((sid) => {
              const soru = d.soruSnapshot[sid];
              return puansizCevapDoluMu(soru?.tip ?? "evet_hayir_muaf", d.puansizCevaplar?.[sid]);
            }).length;
            return (
              <div key={bolumId} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-800">{bolum.ad}</p>
                  <span className="text-xs font-medium text-slate-400">
                    {cevaplanan}/{bolum.soruIdleri.length}
                  </span>
                </div>
                <div className="divide-y divide-slate-50">
                  {bolum.soruIdleri.map((soruId, i) => {
                    const soru = d.soruSnapshot[soruId];
                    const tip = soru?.tip ?? "evet_hayir_muaf";
                    const cevap = d.puansizCevaplar?.[soruId];
                    return (
                      <div key={soruId} className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 bg-slate-100 text-slate-400 text-[11px] font-bold">
                            {i + 1}
                          </div>
                          <p className="flex-1 text-sm text-slate-700">{soru?.metin}</p>
                          <PuansizCevapGoster tip={tip} cevap={cevap} />
                        </div>
                        {(cevap?.fotograflar?.length ?? 0) > 0 && (
                          <div className="mt-2.5 ml-9">
                            <PuansizFotoStrip
                              fotograflar={(cevap!.fotograflar ?? []).map((url) => ({ url }))}
                              readOnly
                            />
                          </div>
                        )}
                        {tip !== "yorum" && cevap?.yorum && (
                          <div className="mt-2.5 ml-9 flex items-start gap-1.5 text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
                            <StickyNote size={13} className="mt-0.5 shrink-0 text-slate-400" />
                            <span className="whitespace-pre-wrap">{cevap.yorum}</span>
                          </div>
                        )}
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
);

export default PuansizRaporIcerik;
