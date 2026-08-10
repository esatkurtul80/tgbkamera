"use client";

import { Search, Check } from "lucide-react";
import Badge from "@/components/ui/Badge";
import { soruSinifi, bolumSinifi, soruSinifiEtiketi } from "@/lib/homojenlik";
import type { Soru } from "@/types";

interface SoruSecimListesiProps {
  /** Zaten üst bileşende arama filtresi uygulanmış soru listesi. */
  sorular: Soru[];
  /** Bölümün henüz "kilitlenmemiş" durumunu belirlemek için tüm seçili soruların (filtrelenmemiş) id listesi. */
  seciliIds: string[];
  onToggle: (id: string) => void;
  araVal?: string;
  onAraChange?: (v: string) => void;
  /** true: kutulu/kaydırmalı liste (modal içinde). false: sade divide-y liste (tam sayfa formlar). */
  boxed?: boolean;
}

export default function SoruSecimListesi({
  sorular,
  seciliIds,
  onToggle,
  araVal,
  onAraChange,
  boxed = true,
}: SoruSecimListesiProps) {
  // Bölüm zaten bir tür soru içeriyorsa (en az bir seçili soru varsa), o türle uyuşmayan sorular devre dışı bırakılır.
  const sorularById: Record<string, Soru> = {};
  sorular.forEach((s) => { sorularById[s.id] = s; });
  const kilitliSinif = bolumSinifi(seciliIds, sorularById);

  const filtreli = araVal !== undefined
    ? sorular.filter((s) => s.metin.toLowerCase().includes(araVal.toLowerCase()))
    : sorular;

  const liste = (
    <div className={boxed ? "divide-y divide-slate-100" : "divide-y divide-slate-50"}>
      {filtreli.map((soru) => {
        const secili = seciliIds.includes(soru.id);
        const uyumsuz = !secili && kilitliSinif !== null && soruSinifi(soru) !== kilitliSinif;
        return (
          <button
            key={soru.id}
            type="button"
            disabled={uyumsuz}
            onClick={() => onToggle(soru.id)}
            title={uyumsuz ? `Bu bölüm zaten ${kilitliSinif ? soruSinifiEtiketi(kilitliSinif) : ""} sorulardan oluşuyor` : undefined}
            className={`flex items-center gap-3 w-full text-left transition-colors ${
              boxed ? "px-3 py-2.5" : "py-3"
            } ${uyumsuz ? "opacity-40 cursor-not-allowed" : secili ? (boxed ? "bg-indigo-50" : "") : "hover:bg-slate-50"}`}
          >
            <div
              className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                secili ? "bg-indigo-600 border-indigo-600" : "border-slate-300"
              }`}
            >
              {secili && <Check size={10} className="text-white" />}
            </div>
            <span className={`flex-1 text-sm ${secili ? "text-indigo-700 font-medium" : "text-slate-700"}`}>{soru.metin}</span>
            <span className="shrink-0">
              {soru.tip ? <Badge variant={soru.tip} /> : <span className="text-xs font-semibold text-slate-400">{soru.puan} p</span>}
            </span>
          </button>
        );
      })}
    </div>
  );

  if (!boxed) {
    return sorular.length === 0 ? (
      <p className="text-sm text-slate-400 py-4 text-center">Henüz soru yok. Önce soru oluşturun.</p>
    ) : liste;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-slate-700">
          Soru Ata <span className="text-slate-400 font-normal">({seciliIds.length} seçili)</span>
        </p>
        {onAraChange && sorular.length > 5 && (
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Filtrele..."
              value={araVal ?? ""}
              onChange={(e) => onAraChange(e.target.value)}
              className="pl-7 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 w-36"
            />
          </div>
        )}
      </div>
      {sorular.length === 0 ? (
        <p className="text-sm text-slate-400 py-4 text-center border border-slate-100 rounded-lg">Henüz soru yok. Önce soru oluşturun.</p>
      ) : (
        <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100 max-h-56 overflow-y-auto">
          {liste}
        </div>
      )}
    </div>
  );
}
