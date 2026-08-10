"use client";

import { Search, Check, AlertTriangle } from "lucide-react";
import { bolumSinifi, bolumKarisikMi, soruSinifiEtiketi, type SoruSinifi } from "@/lib/homojenlik";
import type { Bolum, Soru } from "@/types";

interface BolumSecimListesiProps {
  /** Zaten üst bileşende arama filtresi uygulanmış bölüm listesi. */
  bolumler: Bolum[];
  /** id → Soru haritası (bölümlerin soru türünü belirlemek için). */
  sorularById: Record<string, Soru>;
  seciliIds: string[];
  onToggle: (id: string) => void;
  /** Formun gerektirdiği soru sınıfı (bkz. lib/homojenlik formGerekliSinif) — bölüm bununla uyuşmuyorsa devre dışı bırakılır. */
  formGerekliSinif: SoruSinifi;
  araVal?: string;
  onAraChange?: (v: string) => void;
  boxed?: boolean;
}

export default function BolumSecimListesi({
  bolumler,
  sorularById,
  seciliIds,
  onToggle,
  formGerekliSinif,
  araVal,
  onAraChange,
  boxed = true,
}: BolumSecimListesiProps) {
  const filtreli = araVal !== undefined
    ? bolumler.filter((b) => b.ad.toLowerCase().includes(araVal.toLowerCase()))
    : bolumler;

  const liste = (
    <div className={boxed ? "divide-y divide-slate-100" : "divide-y divide-slate-50"}>
      {filtreli.map((bolum) => {
        const secili = seciliIds.includes(bolum.id);
        const sinif = bolumSinifi(bolum.soruIdleri, sorularById);
        const karisik = bolumKarisikMi(bolum.soruIdleri, sorularById);
        const uyumsuz = !secili && (karisik || (sinif !== null && sinif !== formGerekliSinif));
        const uyariMetni = karisik
          ? "Bu bölümde farklı türde sorular karışık — önce bölümü düzenleyin."
          : uyumsuz
          ? `Bu bölüm ${sinif ? soruSinifiEtiketi(sinif) : ""} sorulardan oluşuyor, form tipiyle uyuşmuyor.`
          : undefined;
        return (
          <button
            key={bolum.id}
            type="button"
            disabled={uyumsuz}
            onClick={() => onToggle(bolum.id)}
            title={uyariMetni}
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
            <span className={`flex-1 text-sm ${secili ? "text-indigo-700 font-medium" : "text-slate-700"}`}>{bolum.ad}</span>
            {karisik && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full shrink-0">
                <AlertTriangle size={10} /> Karışık
              </span>
            )}
            <span className="text-xs text-slate-400 shrink-0">{bolum.soruIdleri.length} soru</span>
          </button>
        );
      })}
    </div>
  );

  if (!boxed) {
    return bolumler.length === 0 ? (
      <p className="text-sm text-slate-400 py-4 text-center">Henüz bölüm yok. Önce bölüm oluşturun.</p>
    ) : liste;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-slate-700">
          Bölüm Ata <span className="text-slate-400 font-normal">({seciliIds.length} seçili)</span>
        </p>
        {onAraChange && bolumler.length > 4 && (
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
      {bolumler.length === 0 ? (
        <p className="text-sm text-slate-400 py-4 text-center border border-slate-100 rounded-lg">Henüz bölüm yok. Önce bölüm oluşturun.</p>
      ) : (
        <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100 max-h-52 overflow-y-auto">
          {liste}
        </div>
      )}
    </div>
  );
}
