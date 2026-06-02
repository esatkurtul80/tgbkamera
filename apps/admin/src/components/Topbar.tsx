"use client";

import { useState } from "react";
import { Search, Bell, Plus, Gift, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function Topbar() {
  const { user, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="h-14 bg-white border-b border-slate-100 flex items-center px-6 gap-4 shrink-0 relative z-10">
      {/* Search */}
      <div className="flex-1 max-w-xs">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Ara"
            className="w-full pl-8 pr-12 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded font-mono">
            ⌘F
          </kbd>
        </div>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {[Gift, Bell, Plus].map((Icon, i) => (
          <button
            key={i}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
          >
            <Icon size={16} />
          </button>
        ))}

        <div className="w-px h-5 bg-slate-200 mx-1" />

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2.5 hover:bg-slate-50 rounded-lg px-2 py-1.5 transition-colors"
          >
            {user?.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.photoURL}
                alt={user.displayName ?? ""}
                referrerPolicy="no-referrer"
                className="w-7 h-7 rounded-full object-cover shrink-0"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shrink-0" />
            )}
            <div className="text-left">
              <p className="text-xs font-semibold text-slate-900 leading-tight">
                {user?.displayName ?? "Admin"}
              </p>
              <p className="text-[10px] text-slate-500 leading-tight truncate max-w-[120px]">
                {user?.email ?? ""}
              </p>
            </div>
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    signOut();
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
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
