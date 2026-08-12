"use client";

import { Check, X, CircleSlash2, StickyNote } from "lucide-react";
import type { CevapSecenegi, PuansizCevapDegeri, SoruTipi } from "@/types";

/* ─── Ortak cevap seçenekleri (evet/hayır/muaf) ───────────────────────────── */
const CEVAP_OPTS: { value: CevapSecenegi; label: string; icon: typeof Check }[] = [
  { value: "evet", label: "Evet", icon: Check },
  { value: "hayir", label: "Hayır", icon: X },
  { value: "muaf", label: "Muaf", icon: CircleSlash2 },
];

function cevapBtnClass(secili: boolean, deger: CevapSecenegi) {
  if (!secili) return "border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50";
  if (deger === "evet") return "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm shadow-emerald-100";
  if (deger === "hayir") return "border-rose-500 bg-rose-50 text-rose-700 shadow-sm shadow-rose-100";
  return "border-slate-400 bg-slate-100 text-slate-700";
}

const underlineClass =
  "w-full border-0 border-b-2 border-slate-200 bg-transparent px-0.5 py-2 text-sm text-slate-800 " +
  "placeholder:text-slate-300 focus:outline-none focus:border-indigo-600 transition-colors";

const boxClass =
  "w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-800 " +
  "placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none";

/* ─── Düzenlenebilir cevap girişi ──────────────────────────────────────────── */
interface PuansizCevapInputProps {
  tip: SoruTipi;
  cevap: PuansizCevapDegeri | undefined;
  onChange: (patch: Partial<PuansizCevapDegeri>) => void;
}

export function PuansizCevapInput({ tip, cevap, onChange }: PuansizCevapInputProps) {
  if (tip === "evet_hayir_muaf") {
    return (
      <div className="flex gap-2">
        {CEVAP_OPTS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange({ evetHayirMuaf: opt.value })}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg border-2 text-sm font-semibold transition-all ${cevapBtnClass(
              cevap?.evetHayirMuaf === opt.value,
              opt.value
            )}`}
          >
            <opt.icon size={15} />
            {opt.label}
          </button>
        ))}
      </div>
    );
  }

  if (tip === "sayi") {
    return (
      <input
        type="number"
        value={cevap?.sayi ?? ""}
        onChange={(e) => onChange({ sayi: e.target.value === "" ? undefined : Number(e.target.value) })}
        placeholder="Sayı girin..."
        className={underlineClass}
      />
    );
  }

  if (tip === "tarih") {
    return (
      <input
        type="date"
        value={cevap?.tarih ?? ""}
        onChange={(e) => onChange({ tarih: e.target.value })}
        className={underlineClass}
      />
    );
  }

  if (tip === "saat") {
    return (
      <input
        type="time"
        value={cevap?.saat ?? ""}
        onChange={(e) => onChange({ saat: e.target.value })}
        className={underlineClass}
      />
    );
  }

  if (tip === "kisa_metin") {
    return (
      <input
        type="text"
        value={cevap?.kisaMetin ?? ""}
        onChange={(e) => onChange({ kisaMetin: e.target.value })}
        placeholder="Kısa cevap..."
        className={underlineClass}
      />
    );
  }

  // yorum (paragraf)
  return (
    <textarea
      value={cevap?.yorum ?? ""}
      onChange={(e) => onChange({ yorum: e.target.value })}
      placeholder="Yorumunuzu yazın..."
      rows={3}
      className={boxClass}
    />
  );
}

/* ─── Soru bazlı opsiyonel not alanı (evet_hayir_muaf/sayi/tarih/saat/kisa_metin için) ── */
interface PuansizNotAlaniProps {
  deger?: string;
  onChange: (v: string) => void;
}

export function PuansizNotAlani({ deger, onChange }: PuansizNotAlaniProps) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1.5">
        <StickyNote size={13} /> Not
      </label>
      <textarea
        value={deger ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Not ekleyin (opsiyonel)..."
        rows={2}
        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50/60 text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all resize-none"
      />
    </div>
  );
}

/* ─── Salt okunur cevap gösterimi ──────────────────────────────────────────── */
interface PuansizCevapGosterProps {
  tip: SoruTipi;
  cevap: PuansizCevapDegeri | undefined;
}

const EHM_STYLE: Record<CevapSecenegi, string> = {
  evet: "bg-emerald-50 text-emerald-700",
  hayir: "bg-rose-50 text-rose-700",
  muaf: "bg-slate-100 text-slate-600",
};
const EHM_LABEL: Record<CevapSecenegi, string> = { evet: "Evet", hayir: "Hayır", muaf: "Muaf" };

export function PuansizCevapGoster({ tip, cevap }: PuansizCevapGosterProps) {
  if (tip === "evet_hayir_muaf") {
    if (!cevap?.evetHayirMuaf) return <span className="text-slate-300 text-sm">—</span>;
    return (
      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${EHM_STYLE[cevap.evetHayirMuaf]}`}>
        {EHM_LABEL[cevap.evetHayirMuaf]}
      </span>
    );
  }

  const deger =
    tip === "sayi"
      ? cevap?.sayi !== undefined
        ? String(cevap.sayi)
        : undefined
      : tip === "tarih"
      ? cevap?.tarih
      : tip === "saat"
      ? cevap?.saat
      : tip === "kisa_metin"
      ? cevap?.kisaMetin
      : cevap?.yorum;

  if (!deger) return <span className="text-slate-300 text-sm">—</span>;

  if (tip === "yorum") {
    return (
      <p className="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 rounded-lg px-3 py-2.5 leading-relaxed">
        {deger}
      </p>
    );
  }

  return <span className="text-sm text-slate-700 whitespace-pre-wrap">{deger}</span>;
}
