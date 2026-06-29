"use client";

import { useState } from "react";
import { Bell, LogOut, ChevronDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ROL_ETIKETLERI } from "@/types";

export default function Topbar() {
  const { user, kullanici, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const initials = (kullanici?.displayName ?? user?.displayName ?? "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="h-14 bg-white border-b border-slate-100 flex items-center px-6 gap-4 shrink-0 relative z-10">
      <div className="flex-1" />

      <div className="flex items-center gap-2">
        <button className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 transition-colors relative">
          <Bell size={16} />
        </button>

        <div className="w-px h-5 bg-slate-200 mx-1" />

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2.5 hover:bg-slate-50 rounded-lg px-2 py-1.5 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
              <span className="text-[10px] font-bold text-white">{initials}</span>
            </div>
            <div className="text-left">
              <p className="text-xs font-semibold text-slate-900 leading-tight">
                {kullanici?.displayName ?? user?.displayName ?? "Kullanıcı"}
              </p>
              <p className="text-[10px] text-slate-500 leading-tight">
                {kullanici?.rol ? ROL_ETIKETLERI[kullanici.rol] : ""}
              </p>
            </div>
            <ChevronDown size={13} className="text-slate-400" />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50">
                <div className="px-3 py-2.5 border-b border-slate-100">
                  <p className="text-xs font-semibold text-slate-800">
                    {kullanici?.displayName ?? user?.displayName}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">
                    {kullanici?.email ?? user?.email}
                  </p>
                </div>
                <button
                  onClick={() => { setMenuOpen(false); signOut(); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors mt-0.5"
                >
                  <LogOut size={14} />
                  Çıkış Yap
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
