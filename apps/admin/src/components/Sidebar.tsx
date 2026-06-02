"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Layers,
  HelpCircle,
  Users,
  ClipboardList,
  Settings,
  LogOut,
  Camera,
  PanelLeftClose,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const sections = [
  {
    label: "GENEL",
    items: [
      { name: "Panel", href: "/", icon: LayoutDashboard },
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
    label: "PERSONEL",
    items: [
      { name: "Personel", href: "/personel", icon: Users },
    ],
  },
  {
    label: "RAPORLAMA",
    items: [
      { name: "Değerlendirmeler", href: "/degerlendirmeler", icon: ClipboardList },
    ],
  },
  {
    label: "SİSTEM",
    items: [
      { name: "Ayarlar", href: "#", icon: Settings },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { signOut } = useAuth();

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
                  (item.href === "/"
                    ? pathname === "/"
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
      <div className="border-t border-slate-100 p-4">
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
