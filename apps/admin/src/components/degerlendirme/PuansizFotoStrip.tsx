"use client";

import { useRef, useState } from "react";
import { X, Plus, RotateCw } from "lucide-react";
import Modal from "@/components/ui/Modal";

export interface PuansizFoto {
  /** Zaten yüklenmiş bir fotoğraf için Storage URL'i, henüz yüklenmemiş bir seçim için objectURL önizlemesi. */
  url: string;
  onSil?: () => void;
  /** Yükleme başarısız oldu mu (ör. bağlantı kopukluğu) — kırmızı çerçeve + tekrar dene ile gösterilir. */
  hata?: boolean;
  onTekrarDene?: () => void;
}

interface PuansizFotoStripProps {
  fotograflar: PuansizFoto[];
  onEkle?: (files: File[]) => void;
  readOnly?: boolean;
}

export default function PuansizFotoStrip({ fotograflar, onEkle, readOnly = false }: PuansizFotoStripProps) {
  const [buyukGoster, setBuyukGoster] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  if (fotograflar.length === 0 && readOnly) return null;

  return (
    <>
      <div className="flex flex-wrap gap-2.5">
        {fotograflar.map((f, i) => (
          <div key={f.url + i} className="relative group/foto">
            <button
              type="button"
              onClick={() => (f.hata && f.onTekrarDene ? f.onTekrarDene() : setBuyukGoster(f.url))}
              className={`w-16 h-16 rounded-xl overflow-hidden border bg-slate-50 shadow-sm hover:shadow-md transition-all ${
                f.hata ? "border-2 border-rose-400" : "border-slate-200 hover:border-slate-300"
              }`}
              title={f.hata ? "Yüklenemedi — tekrar denemek için tıklayın" : undefined}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.url} alt="" className={`w-full h-full object-cover transition-transform group-hover/foto:scale-105 ${f.hata ? "opacity-60" : ""}`} />
              {f.hata && (
                <span className="absolute inset-0 flex items-center justify-center bg-rose-900/20">
                  <RotateCw size={16} className="text-white drop-shadow" />
                </span>
              )}
            </button>
            {!readOnly && f.onSil && (
              <button
                type="button"
                onClick={f.onSil}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 flex items-center justify-center bg-rose-600 text-white rounded-full shadow-sm opacity-0 group-hover/foto:opacity-100 transition-opacity"
                title="Fotoğrafı kaldır"
              >
                <X size={11} />
              </button>
            )}
          </div>
        ))}

        {!readOnly && onEkle && (
          <>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 flex flex-col items-center justify-center text-slate-400 hover:text-indigo-500 transition-colors"
            >
              <Plus size={16} />
              <span className="text-[9px] font-medium mt-0.5">Foto</span>
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                if (files.length > 0) onEkle(files);
                e.target.value = "";
              }}
            />
          </>
        )}
      </div>

      <Modal open={!!buyukGoster} onClose={() => setBuyukGoster(null)} title="Fotoğraf" size="lg">
        {buyukGoster && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={buyukGoster} alt="" className="w-full h-auto rounded-lg" />
        )}
      </Modal>
    </>
  );
}
