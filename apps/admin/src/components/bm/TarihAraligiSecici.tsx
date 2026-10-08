"use client";

import { CalendarDays } from "lucide-react";
import {
  ARALIK_SECENEKLERI, onAyarAraligi, ozelAralik, tarihInputCoz, tarihInputDegeri, type TarihAraligi,
} from "@/lib/bmRapor";
import { BM } from "./tema";

/**
 * Bölge müdürü ekranlarının ortak tarih aralığı seçicisi: hızlı çipler (Bu Ay, Geçen Ay,
 * Son 3 Ay, Tümü) + Özel seçimde başlangıç/bitiş tarih alanları (tarayıcı tarih seçici).
 * (Mobil ikizi: apps/mobile/src/components/bm/TarihAraligiSecici.tsx)
 */
export default function TarihAraligiSecici({
  deger, onChange,
}: {
  deger: TarihAraligi;
  onChange: (a: TarihAraligi) => void;
}) {
  function tarihUygula(alan: "baslangic" | "bitis", v: string) {
    const tarih = tarihInputCoz(v);
    if (!tarih) return;
    const b = alan === "baslangic" ? tarih : deger.baslangic ?? tarih;
    const s = alan === "bitis" ? tarih : deger.bitis ?? tarih;
    onChange(ozelAralik(b, s));
  }

  const inputSinif = `w-full bg-transparent text-[13.5px] font-extrabold ${BM.murekkep} focus:outline-none`;

  return (
    <div className="flex flex-col gap-2">
      {/* Çipler sarılır: "Tümü" ve "Özel" telefonda da her zaman görünür (yatay kaydırma yok) */}
      <div className="flex flex-wrap gap-2">
        {ARALIK_SECENEKLERI.map((s) => {
          const aktif = deger.tur === s.tur;
          const ozel = s.tur === "ozel";
          return (
            <button
              key={s.tur}
              type="button"
              onClick={() => onChange(onAyarAraligi(s.tur))}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-[12.5px] font-bold transition-colors cursor-pointer ${
                aktif ? `${BM.murekkepBg} text-white` : `${BM.kart} ${BM.gri} hover:bg-[#f7faf8]`
              } ${ozel && !aktif ? "border border-dashed border-[#c4cfc8]" : ""}`}
            >
              {ozel && <CalendarDays size={13} />}
              {ozel ? "Tarih Aralığı Seç" : s.ad}
            </button>
          );
        })}
      </div>

      {deger.tur === "ozel" && (
        <div className="flex items-center gap-2">
          <label className={`flex-1 min-w-0 ${BM.kart} rounded-2xl px-3 py-2`}>
            <span className={`block text-[10px] font-bold tracking-wider ${BM.soluk}`}>BAŞLANGIÇ</span>
            <input
              type="date"
              value={tarihInputDegeri(deger.baslangic)}
              onChange={(e) => tarihUygula("baslangic", e.target.value)}
              className={inputSinif}
            />
          </label>
          <span className={BM.soluk}>–</span>
          <label className={`flex-1 min-w-0 ${BM.kart} rounded-2xl px-3 py-2`}>
            <span className={`block text-[10px] font-bold tracking-wider ${BM.soluk}`}>BİTİŞ</span>
            <input
              type="date"
              value={tarihInputDegeri(deger.bitis)}
              onChange={(e) => tarihUygula("bitis", e.target.value)}
              className={inputSinif}
            />
          </label>
        </div>
      )}
    </div>
  );
}
