"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Store, ClipboardList, Menu, Camera } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { BM } from "./tema";

/**
 * Bölge müdürü için telefon öncelikli uygulama kabuğu — mobildeki alt sekme çubuğunun web karşılığı.
 * Dar ekranda altta 4 sekme (Panel, Mağazalarım, Raporlar, Menü); geniş ekranda (md+) üstte
 * aynı sekmeler, içerik ortalanmış dar sütunda. Admin kenar çubuğu/üst çubuk kullanılmaz.
 */
export const BM_YOL = {
  panel: "/panel/bolge-muduru",
  magazalar: "/panel/bolge-muduru/magazalar",
  magaza: "/panel/bolge-muduru/magaza",
  raporlar: "/panel/bolge-muduru/raporlar",
  menu: "/panel/bolge-muduru/menu",
} as const;

const SEKMELER = [
  { ad: "Panel", href: BM_YOL.panel, icon: LayoutDashboard, exact: true },
  { ad: "Mağazalarım", href: BM_YOL.magazalar, icon: Store, ekYollar: [BM_YOL.magaza] },
  { ad: "Raporlar", href: BM_YOL.raporlar, icon: ClipboardList, ekYollar: ["/degerlendirmeler"] },
  { ad: "Menü", href: BM_YOL.menu, icon: Menu },
];

function aktifMi(pathname: string, s: (typeof SEKMELER)[number]): boolean {
  if (s.exact) return pathname === s.href;
  const yollar = [s.href, ...(s.ekYollar ?? [])];
  return yollar.some((y) => pathname === y || pathname.startsWith(y + "/"));
}

export default function BmShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { kullanici } = useAuth();
  const ad = kullanici?.displayName ?? "Bölge Müdürü";

  return (
    <div className={`flex flex-col flex-1 min-w-0 h-screen ${BM.zemin}`}>
      {/* Geniş ekran: üst sekme çubuğu */}
      <header className="hidden md:flex items-center gap-6 px-6 h-14 bg-white border-b border-[#e2e8e4] shrink-0">
        <div className="flex items-center gap-2.5">
          <div className={`w-7 h-7 rounded-md ${BM.murekkepBg} flex items-center justify-center`}>
            <Camera size={14} className="text-white" />
          </div>
          <span className={`text-sm font-extrabold ${BM.murekkep}`}>TGB Kamera</span>
        </div>
        <nav className="flex items-center gap-1 ml-4">
          {SEKMELER.map((s) => {
            const aktif = aktifMi(pathname, s);
            return (
              <Link
                key={s.href}
                href={s.href}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-[13px] font-bold transition-colors ${
                  aktif ? `${BM.murekkepBg} text-white` : `${BM.gri} hover:bg-[#eef2ef]`
                }`}
              >
                <s.icon size={15} />
                {s.ad}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-2.5">
          <div className="text-right">
            <p className={`text-xs font-bold leading-tight ${BM.murekkep}`}>{ad}</p>
            <p className={`text-[10px] leading-tight ${BM.soluk}`}>Bölge Müdürü</p>
          </div>
          <div className={`w-8 h-8 rounded-full ${BM.murekkepBg} flex items-center justify-center`}>
            <span className="text-xs font-extrabold text-white">{ad.charAt(0).toUpperCase()}</span>
          </div>
        </div>
      </header>

      {/* İçerik: telefon genişliğinde sütun; geniş ekranda ortalı */}
      <main className="flex-1 min-h-0 overflow-auto">
        <div className="mx-auto w-full max-w-2xl px-4 pt-3 pb-8 md:pt-6">{children}</div>
      </main>

      {/* Dar ekran: alt sekme çubuğu */}
      <nav
        className="md:hidden shrink-0 flex items-stretch bg-white border-t border-[#e2e8e4]"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {SEKMELER.map((s) => {
          const aktif = aktifMi(pathname, s);
          return (
            <Link
              key={s.href}
              href={s.href}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 text-[10.5px] font-bold transition-colors ${
                aktif ? BM.vurgu : BM.soluk
              }`}
            >
              <s.icon size={21} strokeWidth={aktif ? 2.4 : 2} />
              {s.ad}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
