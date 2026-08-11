"use client";

import { useState } from "react";
import { GripVertical, X } from "lucide-react";
import Badge from "@/components/ui/Badge";
import type { Soru } from "@/types";

interface SeciliSoruSiralamaProps {
  sorular: Soru[];
  seciliIds: string[];
  onReorder: (yeniSiraliIds: string[]) => void;
  onRemove: (id: string) => void;
}

export default function SeciliSoruSiralama({
  sorular,
  seciliIds,
  onReorder,
  onRemove,
}: SeciliSoruSiralamaProps) {
  const [surukleneIndex, setSurukleneIndex] = useState<number | null>(null);
  const [uzerindeIndex, setUzerindeIndex] = useState<number | null>(null);

  const sorularById: Record<string, Soru> = {};
  sorular.forEach((s) => { sorularById[s.id] = s; });

  function handleDrop(hedefIndex: number) {
    if (surukleneIndex === null || surukleneIndex === hedefIndex) {
      setSurukleneIndex(null);
      setUzerindeIndex(null);
      return;
    }
    const yeni = [...seciliIds];
    const [tasinan] = yeni.splice(surukleneIndex, 1);
    yeni.splice(hedefIndex, 0, tasinan);
    onReorder(yeni);
    setSurukleneIndex(null);
    setUzerindeIndex(null);
  }

  if (seciliIds.length === 0) return null;

  return (
    <div>
      <h2 className="text-sm font-semibold text-slate-800 mb-1">
        Soru Sırası <span className="text-slate-400 font-normal">(sürükleyerek değiştirin)</span>
      </h2>
      <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100">
        {seciliIds.map((id, index) => {
          const soru = sorularById[id];
          return (
            <div
              key={id}
              draggable
              onDragStart={() => setSurukleneIndex(index)}
              onDragEnter={() => setUzerindeIndex(index)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(index)}
              onDragEnd={() => { setSurukleneIndex(null); setUzerindeIndex(null); }}
              className={`flex items-center gap-3 px-3 py-2.5 bg-white transition-colors ${
                surukleneIndex === index ? "opacity-40" : ""
              } ${uzerindeIndex === index && surukleneIndex !== index ? "bg-indigo-50" : ""}`}
            >
              <GripVertical size={14} className="text-slate-300 cursor-grab shrink-0" />
              <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-500 shrink-0">
                {index + 1}
              </span>
              <span className="flex-1 text-sm text-slate-700 truncate">
                {soru?.metin ?? <span className="text-slate-400 italic">Soru bulunamadı</span>}
              </span>
              {soru && (soru.tip ? <Badge variant={soru.tip} /> : <span className="text-xs font-semibold text-slate-400 shrink-0">{soru.puan} p</span>)}
              <button
                type="button"
                onClick={() => onRemove(id)}
                className="text-slate-300 hover:text-red-500 transition-colors shrink-0"
                title="Kaldır"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
