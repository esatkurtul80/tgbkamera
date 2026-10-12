"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { LayoutDashboard, Store, ClipboardList, Menu } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { BM } from "./tema";
import { BmAralikProvider } from "./BmAralikContext";

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
    <BmAralikProvider>
      <div className={`fixed inset-0 flex flex-col min-w-0 ${BM.zemin}`}>
        {/* Geniş ekran: üst sekme çubuğu */}
        <header className="hidden md:flex items-center gap-6 px-6 h-14 bg-white border-b border-[#e2e8e4] shrink-0">
          <div className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="TGB Kamera" width={64} height={39} priority className="h-7 w-auto" />
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
  
        {/* İçerik: telefon genişliğinde sütun; geniş ekranda ortalı. Dar ekranda alttaki yüzen menü için boşluk bırakılır. */}
        <main className="flex-1 min-h-0 overflow-auto">
          <div className="mx-auto w-full max-w-2xl px-4 pt-2 pb-28 md:pt-6 md:pb-8">{children}</div>
        </main>
  
        {/* Dar ekran: yüzen elips (pill) alt menü — ekranın altından biraz yukarıda, içerik altından kayar */}
        <nav
          className="md:hidden absolute left-0 right-0 z-20 flex justify-center px-5 pointer-events-none"
          style={{ bottom: "calc(12px + env(safe-area-inset-bottom, 0px))" }}
        >
          <div
            className={`pointer-events-auto flex items-center w-full max-w-[360px] ${BM.bordoBg} rounded-full p-1.5 shadow-[0_12px_32px_rgba(155,27,48,0.35)]`}
          >
            {SEKMELER.map((s) => {
              const aktif = aktifMi(pathname, s);
              return (
                <Link
                  key={s.href}
                  href={s.href}
                  className={`flex-1 flex flex-col items-center justify-center gap-0.5 h-[50px] rounded-full text-[10px] font-bold transition-colors ${
                    aktif ? "bg-white/15 text-white" : "text-white/60 hover:text-white/90"
                  }`}
                >
                  <s.icon size={19} strokeWidth={aktif ? 2.4 : 2} />
                  {s.ad}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </BmAralikProvider>
  );
}
