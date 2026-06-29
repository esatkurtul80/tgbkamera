"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, FileText, Layers, HelpCircle, Users, ClipboardList,
  Settings, LogOut, Camera, PanelLeftClose, MapIcon, Store, UserCog,
  TrendingUp, Plus, BarChart2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import type { KullaniciRol } from "@/types";
import { ROL_ETIKETLERI } from "@/types";

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const adminSections: NavSection[] = [
  {
    label: "GENEL",
    items: [{ name: "Panel", href: "/", icon: LayoutDashboard }],
  },
  {
    label: "YAPI",
    items: [
      { name: "Bölgeler", href: "/bolgeler", icon: MapIcon },
      { name: "Mağazalar", href: "/magazalar", icon: Store },
      { name: "Personel", href: "/personel", icon: Users },
    ],
  },
  {
    label: "DEĞERLENDİRME",
    items: [
      { name: "Formlar", href: "/formlar", icon: FileText },
      { name: "Bölümler", href: "/bolumler", icon: Layers },
      { name: "Sorular", href: "/sorular", icon: HelpCircle },
    ],
  },
  {
    label: "RAPORLAMA",
    items: [
      { name: "Değerlendirmeler", href: "/degerlendirmeler", icon: ClipboardList },
      { name: "Aylık İzlenme", href: "/raporlar/aylik-izlenme", icon: BarChart2 },
    ],
  },
  {
    label: "SİSTEM",
    items: [
      { name: "Kullanıcılar", href: "/kullanicilar", icon: UserCog },
      { name: "Ayarlar", href: "/ayarlar", icon: Settings },
    ],
  },
];

const bolgeMuduruSections: NavSection[] = [
  {
    label: "GENEL",
    items: [{ name: "Panel", href: "/panel/bolge-muduru", icon: LayoutDashboard }],
  },
  {
    label: "YAPI",
    items: [
      { name: "Mağazalar", href: "/magazalar", icon: Store },
      { name: "Personel", href: "/personel", icon: Users },
    ],
  },
  {
    label: "RAPORLAMA",
    items: [
      { name: "Değerlendirmeler", href: "/degerlendirmeler", icon: ClipboardList },
      { name: "Aylık İzlenme", href: "/raporlar/aylik-izlenme", icon: BarChart2 },
    ],
  },
];

const magazaSorumlusuSections: NavSection[] = [
  {
    label: "GENEL",
    items: [{ name: "Panel", href: "/panel/magaza-sorumlusu", icon: LayoutDashboard }],
  },
  {
    label: "PERSONEL",
    items: [{ name: "Personel", href: "/personel", icon: Users }],
  },
  {
    label: "RAPORLAMA",
    items: [
      { name: "Değerlendirmeler", href: "/degerlendirmeler", icon: ClipboardList },
      { name: "Aylık İzlenme", href: "/raporlar/aylik-izlenme", icon: BarChart2 },
    ],
  },
];

const kameramanSections: NavSection[] = [
  {
    label: "GENEL",
    items: [
      { name: "Panelim", href: "/panel/kameraman", icon: LayoutDashboard },
      { name: "Personel Havuzu", href: "/personel", icon: Users },
    ],
  },
  {
    label: "RAPORLAMA",
    items: [
      { name: "Değerlendirmelerim", href: "/degerlendirmeler", icon: TrendingUp },
    ],
  },
];

function getSections(rol?: KullaniciRol): NavSection[] {
  if (!rol || rol === "admin" || rol === "sirketsahibi" || rol === "ust_yonetici") return adminSections;
  if (rol === "bolge_muduru") return bolgeMuduruSections;
  if (rol === "magaza_sorumlusu") return magazaSorumlusuSections;
  if (rol === "kameraman") return kameramanSections;
  return adminSections;
}

export default function Sidebar() {
  const pathname = usePathname();
  const { signOut, kullanici } = useAuth();
  const sections = getSections(kullanici?.rol);

  return (
    <aside className="w-56 flex flex-col bg-white border-r border-slate-100 h-screen shrink-0">
      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-[18px] border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-indigo-600 flex items-center justify-center">
            <Camera size={14} className="text-white" />
          </div>
          <span className="font-semibold text-slate-900 text-sm">TGB Kamera</span>
        </div>
        <button className="text-slate-400 hover:text-slate-600 transition-colors">
          <PanelLeftClose size={16} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 overflow-y-auto space-y-5">
        {sections.map((section) => (
          <div key={section.label}>
            <p className="px-3 text-[10px] font-semibold text-slate-400 mb-1.5 tracking-widest uppercase">
              {section.label}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active =
                  item.href !== "#" &&
                  (item.href === "/" || item.href === "/panel/kameraman" || item.href === "/panel/bolge-muduru" || item.href === "/panel/magaza-sorumlusu"
                    ? pathname === item.href
                    : pathname === item.href || pathname.startsWith(item.href + "/"));
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        active
                          ? "bg-blue-50 text-blue-600"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <item.icon size={15} className="shrink-0" />
                      <span className="flex-1">{item.name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-100 p-3 space-y-1">
        {kullanici && (
          <div className="px-3 py-2 mb-1">
            <p className="text-xs font-semibold text-slate-700 truncate">{kullanici.displayName}</p>
            <p className="text-[10px] text-slate-400 truncate">{ROL_ETIKETLERI[kullanici.rol]}</p>
          </div>
        )}
        <button
          onClick={signOut}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut size={15} className="shrink-0" />
          <span>Çıkış Yap</span>
        </button>
      </div>
    </aside>
  );
}
