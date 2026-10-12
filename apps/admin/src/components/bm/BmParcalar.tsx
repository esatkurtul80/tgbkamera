import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { BM } from "./tema";

/** Bölge müdürü ekranlarının küçük ortak parçaları (başlık, kart, yükleniyor, boş durum). */

export function BmBaslik({ baslik, alt, sol, sag }: {
  baslik: string; alt?: string; sol?: React.ReactNode; sag?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 pt-1 pb-2.5">
      {sol}
      <div className="flex-1 min-w-0">
        <h1 className={`text-[22px] leading-tight font-extrabold tracking-tight truncate ${BM.murekkep}`}>{baslik}</h1>
        {alt && <p className={`text-[12.5px] font-semibold mt-0.5 ${BM.gri}`}>{alt}</p>}
      </div>
      {sag}
    </div>
  );
}

export function GeriButonu({ href }: { href: string }) {
  return (
    <Link href={href} className={`w-10 h-10 rounded-full ${BM.kart} flex items-center justify-center shrink-0 hover:bg-[#f7faf8]`} aria-label="Geri">
      <ChevronRight size={22} className={`rotate-180 ${BM.murekkep}`} />
    </Link>
  );
}

export function BmKart({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`${BM.kart} rounded-[22px] overflow-hidden ${className}`}>{children}</div>;
}

export function HeroKart({ etiket, deger, alt, ust, sag }: {
  etiket: string; deger: string; alt?: string;
  /** Kartın en üstünde, ayırıcı çizgiyle ayrılan alan (ör. profil satırı). */
  ust?: React.ReactNode;
  /** Etiket + puanın sağındaki alan (ör. tarih çipleri). */
  sag?: React.ReactNode;
}) {
  return (
    <div className={`${BM.bordoBg} rounded-[22px] px-4 py-3.5 mt-3`}>
      {ust && <div className="mb-3 pb-3 border-b border-white/10">{ust}</div>}
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-white/65">{etiket}</p>
          <p className="text-[36px] leading-none font-extrabold text-white mt-1.5 tracking-tight tabular-nums">{deger}</p>
        </div>
        {sag && <div className="shrink-0 max-w-[62%]">{sag}</div>}
      </div>
      {alt && <p className="text-[11px] font-medium text-white/55 mt-1.5">{alt}</p>}
    </div>
  );
}

export function BolumBaslik({ baslik, link, linkAd }: { baslik: string; link?: string; linkAd?: string }) {
  return (
    <div className="flex items-center justify-between mb-2.5">
      <h2 className={`text-[15px] font-extrabold ${BM.murekkep}`}>{baslik}</h2>
      {link && linkAd && (
        <Link href={link} className={`text-xs font-bold ${BM.gri} hover:underline`}>{linkAd} →</Link>
      )}
    </div>
  );
}

export function Avatar({ ad, buyuk = false }: { ad: string; buyuk?: boolean }) {
  return (
    <div className={`${buyuk ? "w-12 h-12 text-base" : "w-[38px] h-[38px] text-[13.5px]"} rounded-full ${BM.griBg} flex items-center justify-center shrink-0 font-extrabold ${BM.murekkep}`}>
      {ad.charAt(0).toUpperCase()}
    </div>
  );
}

export function Yukleniyor() {
  return (
    <div className="flex justify-center py-16">
      <div className="w-7 h-7 border-[3px] border-[#e85a43] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export function BosDurum({ ikon, baslik, alt }: { ikon: string; baslik: string; alt?: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center pt-14 pb-10 gap-2.5">
      <span className="text-[40px]">{ikon}</span>
      <p className={`text-[15px] font-extrabold ${BM.murekkep}`}>{baslik}</p>
      {alt && <p className={`text-[13px] leading-relaxed max-w-xs ${BM.gri}`}>{alt}</p>}
    </div>
  );
}

export function MagazaAtanmamis() {
  return (
    <BosDurum
      ikon="🏬"
      baslik="Hesabınıza mağaza atanmamış"
      alt="Yöneticiniz Mağazalar sayfasından atama yaptığında burada görünecek."
    />
  );
}

export function AramaKutusu({ deger, onChange, placeholder }: { deger: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className={`flex items-center gap-2 ${BM.kart} rounded-2xl px-3.5 h-11`}>
      <span className={`text-base ${BM.soluk}`}>⌕</span>
      <input
        type="search"
        value={deger}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`flex-1 min-w-0 bg-transparent text-sm ${BM.murekkep} placeholder:text-[#a4b1aa] focus:outline-none`}
      />
    </div>
  );
}
