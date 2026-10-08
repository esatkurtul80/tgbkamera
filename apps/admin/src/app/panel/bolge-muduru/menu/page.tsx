"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, LayoutDashboard, Store, ClipboardList, Smartphone } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { BM_YOL } from "@/components/bm/BmShell";
import { Avatar, BmBaslik, BmKart } from "@/components/bm/BmParcalar";
import { BM } from "@/components/bm/tema";

const OGELER = [
  { ad: "Panel", href: BM_YOL.panel, icon: LayoutDashboard },
  { ad: "Mağazalarım", href: BM_YOL.magazalar, icon: Store },
  { ad: "Raporlar", href: BM_YOL.raporlar, icon: ClipboardList },
];

/** Bölge müdürü menüsü (web): profil, kısayollar ve çıkış — mobildeki "BÖLGEM" menüsünün karşılığı. */
export default function BmMenuPage() {
  const { kullanici, user, signOut } = useAuth();
  const [cikisOnay, setCikisOnay] = useState(false);
  const ad = kullanici?.displayName ?? "Bölge Müdürü";

  return (
    <div>
      <BmBaslik baslik="Menü" alt={`${ad} · Bölge Müdürü`} />

      <BmKart className="p-4 flex items-center gap-3">
        <Avatar ad={ad} buyuk />
        <div className="min-w-0">
          <p className={`text-[15px] font-extrabold truncate ${BM.murekkep}`}>{ad}</p>
          <p className={`text-xs truncate ${BM.soluk}`}>{kullanici?.email ?? user?.email ?? ""}</p>
        </div>
      </BmKart>

      <p className={`text-[10.5px] font-extrabold tracking-[1.2px] px-2 mt-5 mb-2 ${BM.soluk}`}>BÖLGEM</p>
      <BmKart>
        {OGELER.map((o, i) => (
          <Link
            key={o.href}
            href={o.href}
            className={`flex items-center gap-3 px-3.5 py-3 hover:bg-[#f7faf8] transition-colors ${i > 0 ? `border-t ${BM.ayrac}` : ""}`}
          >
            <div className={`w-[38px] h-[38px] rounded-full ${BM.griBg} flex items-center justify-center shrink-0`}>
              <o.icon size={16} className={BM.murekkep} />
            </div>
            <span className={`flex-1 text-[14.5px] font-bold ${BM.murekkep}`}>{o.ad}</span>
            <ChevronRight size={18} className="text-[#c4cfc8]" />
          </Link>
        ))}
      </BmKart>

      <div className={`flex items-start gap-2 px-2 mt-4 text-[11.5px] leading-relaxed ${BM.soluk}`}>
        <Smartphone size={14} className="shrink-0 mt-0.5" />
        <p>Aynı ekranlar TGB Kamera mobil uygulamasında da bulunur; telefonunuzdan aynı hesapla giriş yapabilirsiniz.</p>
      </div>

      <div className="mt-5">
        {cikisOnay ? (
          <BmKart className="p-4">
            <p className={`text-sm font-bold text-center ${BM.murekkep}`}>Oturumu kapatmak istediğinize emin misiniz?</p>
            <div className="flex gap-2.5 mt-3">
              <button
                type="button"
                onClick={() => setCikisOnay(false)}
                className={`flex-1 py-3 rounded-2xl text-sm font-bold ${BM.griBg} ${BM.gri} cursor-pointer`}
              >
                İptal
              </button>
              <button
                type="button"
                onClick={() => signOut()}
                className={`flex-1 py-3 rounded-2xl text-sm font-extrabold text-white ${BM.vurguBg} cursor-pointer`}
              >
                Çıkış Yap
              </button>
            </div>
          </BmKart>
        ) : (
          <button
            type="button"
            onClick={() => setCikisOnay(true)}
            className={`w-full ${BM.kart} rounded-[22px] py-3.5 text-sm font-extrabold ${BM.vurgu} hover:bg-[#fff3f0] transition-colors cursor-pointer`}
          >
            Çıkış Yap
          </button>
        )}
      </div>
    </div>
  );
}
