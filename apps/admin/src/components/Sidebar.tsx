"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, FileText, Layers, HelpCircle, Users, ClipboardList,
  LogOut, Camera, PanelLeftClose, PanelLeftOpen, MapIcon, Store, UserCog,
  TrendingUp, Plus, BarChart2, Trash2, Palette, Table, MessageSquare, File,
  ChevronDown, ChevronRight,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import type { KullaniciRol } from "@/types";
import { ROL_ETIKETLERI } from "@/types";

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  /** true ise yalnız birebir path eşleşmesinde aktif olur (alt path'ler saymaz). */
  exact?: boolean;
  /** Alt menü: verilirse öğe açılır grup olarak çizilir, href "Tümü" hedefi olur. */
  children?: NavItem[];
}

interface NavSection {
  label: string;
  items: NavItem[];
}

// Rapor kategorileri — yeni kategori eklendikçe bu listeye eklenir,
// sayfası apps/admin/src/app/tum-degerlendirmeler/<slug>/page.tsx altına açılır.
const RAPOR_KATEGORILERI: NavItem[] = [
  { name: "Puanlı Raporlar", href: "/tum-degerlendirmeler/puanli", icon: Table },
  { name: "Yorumlu Puanlı", href: "/tum-degerlendirmeler/yorumlu", icon: MessageSquare },
  { name: "Puansız Raporlar", href: "/tum-degerlendirmeler/puansiz", icon: File },
  { name: "Mağaza Raporları", href: "/tum-degerlendirmeler/magaza", icon: Store },
];

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
      {
        name: "Değerlendirmeler", href: "/degerlendirmeler", icon: ClipboardList,
        children: [
          { name: "Tümü", href: "/degerlendirmeler", icon: ClipboardList },
          ...RAPOR_KATEGORILERI,
        ],
      },
      { name: "Aylık İzlenme", href: "/raporlar/aylik-izlenme", icon: BarChart2 },
      { name: "Rapor Tasarımı", href: "/rapor-tasarimi", icon: Palette },
      { name: "Çöp Kutusu", href: "/cop-kutusu", icon: Trash2 },
    ],
  },
  {
    label: "SİSTEM",
    items: [
      { name: "Kullanıcılar", href: "/kullanicilar", icon: UserCog },
    ],
  },
];

// Bölge müdürü salt okunur: mağaza listesi, personel puanları ve form kırılımı
// panelin içinde; değerlendirme oluşturma/düzenleme yetkisi yok.
const bolgeMuduruSections: NavSection[] = [
  {
    label: "GENEL",
    items: [{ name: "Panel", href: "/panel/bolge-muduru", icon: LayoutDashboard }],
  },
  {
    label: "RAPORLAMA",
    items: [{ name: "Değerlendirmeler", href: "/degerlendirmeler", icon: ClipboardList }],
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
      { name: "Çöp Kutusu", href: "/cop-kutusu", icon: Trash2 },
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
      {
        name: "Tüm Değerlendirmeler", href: "/tum-degerlendirmeler", icon: ClipboardList,
        children: [
          { name: "Tümü", href: "/tum-degerlendirmeler", icon: ClipboardList, exact: true },
          ...RAPOR_KATEGORILERI,
        ],
      },
      { name: "Çöp Kutusu", href: "/cop-kutusu", icon: Trash2 },
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

const SIDEBAR_COLLAPSED_KEY = "sidebar-collapsed";

export default function Sidebar() {
  const pathname = usePathname();
  const { signOut, kullanici } = useAuth();
  const sections = getSections(kullanici?.rol);
  const [collapsed, setCollapsed] = useState(false);
  // Açılır gruplar: elle açılıp kapananlar; kayıt yoksa aktif alt öğeye göre otomatik açılır
  const [acikGruplar, setAcikGruplar] = useState<Record<string, boolean>>({});

  function isActive(item: NavItem): boolean {
    if (item.href === "#") return false;
    const exact = item.exact || item.href === "/" || item.href.startsWith("/panel/");
    return exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/");
  }

  useEffect(() => {
    if (localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1") setCollapsed(true);
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      return next;
    });
  }

  return (
    <aside
      className={`flex flex-col bg-white border-r border-slate-100 h-screen shrink-0 transition-[width] duration-200 ${
        collapsed ? "w-17" : "w-56"
      }`}
    >
      {/* Logo */}
      <div className={`flex items-center px-5 py-4.5 border-b border-slate-100 ${collapsed ? "justify-center" : "justify-between"}`}>
        {!collapsed && (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-md bg-indigo-600 flex items-center justify-center shrink-0">
              <Camera size={14} className="text-white" />
            </div>
            <span className="font-semibold text-slate-900 text-sm truncate">TGB Kamera</span>
          </div>
        )}
        <button
          onClick={toggleCollapsed}
          title={collapsed ? "Menüyü Genişlet" : "Menüyü Daralt"}
          className="text-slate-400 hover:text-slate-600 transition-colors shrink-0"
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 overflow-y-auto space-y-5">
        {sections.map((section) => (
          <div key={section.label}>
            {!collapsed && (
              <p className="px-3 text-[10px] font-semibold text-slate-400 mb-1.5 tracking-widest uppercase">
                {section.label}
              </p>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                // Açılır grup (genişletilmiş görünümde): başlık tıklanınca alt menü açılır
                if (item.children && !collapsed) {
                  const childActive = item.children.some((c) => isActive(c));
                  const acik = acikGruplar[item.name] ?? childActive;
                  return (
                    <li key={item.name}>
                      <button
                        onClick={() => setAcikGruplar((p) => ({ ...p, [item.name]: !acik }))}
                        className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          childActive ? "text-blue-600" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        }`}
                      >
                        <item.icon size={15} className="shrink-0" />
                        <span className="flex-1 text-left">{item.name}</span>
                        {acik
                          ? <ChevronDown size={13} className="shrink-0 text-slate-400" />
                          : <ChevronRight size={13} className="shrink-0 text-slate-400" />}
                      </button>
                      {acik && (
                        <ul className="mt-0.5 space-y-0.5">
                          {item.children.map((child) => {
                            const cActive = isActive(child);
                            return (
                              <li key={child.name}>
                                <Link
                                  href={child.href}
                                  className={`flex items-center gap-2.5 pl-9 pr-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
                                    cActive
                                      ? "bg-blue-50 text-blue-600"
                                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                                  }`}
                                >
                                  <child.icon size={13} className="shrink-0" />
                                  <span className="flex-1">{child.name}</span>
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </li>
                  );
                }

                // Normal öğe (daraltılmış görünümde gruplar da tek ikon olarak "Tümü"ye gider)
                const active = isActive(item) || (!!item.children && item.children.some((c) => isActive(c)));
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      title={collapsed ? item.name : undefined}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        collapsed ? "justify-center" : ""
                      } ${
                        active
                          ? "bg-blue-50 text-blue-600"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <item.icon size={15} className="shrink-0" />
                      {!collapsed && <span className="flex-1">{item.name}</span>}
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
        {kullanici && !collapsed && (
          <div className="px-3 py-2 mb-1">
            <p className="text-xs font-semibold text-slate-700 truncate">{kullanici.displayName}</p>
            <p className="text-[10px] text-slate-400 truncate">{ROL_ETIKETLERI[kullanici.rol]}</p>
          </div>
        )}
        <button
          onClick={signOut}
          title={collapsed ? "Çıkış Yap" : undefined}
          className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors ${
            collapsed ? "justify-center" : ""
          }`}
        >
          <LogOut size={15} className="shrink-0" />
          {!collapsed && <span>Çıkış Yap</span>}
        </button>
      </div>
    </aside>
  );
}
