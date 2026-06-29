"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import type { KullaniciRol } from "@/types";

const PUBLIC_PATHS = ["/login"];

const ROLE_HOMES: Record<KullaniciRol, string> = {
  admin: "/",
  sirketsahibi: "/",
  ust_yonetici: "/",
  bolge_muduru: "/panel/bolge-muduru",
  magaza_sorumlusu: "/panel/magaza-sorumlusu",
  kameraman: "/panel/kameraman",
};

const ADMIN_ROLES: KullaniciRol[] = ["admin", "sirketsahibi", "ust_yonetici"];

const ADMIN_ONLY_PREFIXES = [
  "/bolgeler", "/magazalar", "/kullanicilar",
  "/formlar", "/bolumler", "/sorular", "/ayarlar",
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, kullanici, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isPublic = PUBLIC_PATHS.includes(pathname);
  const rol = kullanici?.rol;

  useEffect(() => {
    if (loading) return;

    if (!user && !isPublic) {
      router.replace("/login");
      return;
    }

    if (!user) return;

    if (isPublic) {
      if (rol) {
        router.replace(ROLE_HOMES[rol]);
      }
      return;
    }

    if (!rol) return;

    // Admin olmayan kullanıcı admin-only sayfaya girmeye çalışıyorsa
    if (!ADMIN_ROLES.includes(rol)) {
      const isAdminOnly = ADMIN_ONLY_PREFIXES.some((p) => pathname.startsWith(p));
      const isAdminDashboard = pathname === "/";
      if (isAdminOnly || isAdminDashboard) {
        router.replace(ROLE_HOMES[rol]);
        return;
      }
    }
  }, [user, kullanici, rol, loading, isPublic, router, pathname]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isPublic) return <>{children}</>;
  if (!user) return null;

  // Firebase kullanıcısı var ama Firestore profili yok ya da rolü tanımlanmamış
  if (!kullanici || !kullanici.rol) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-center max-w-sm px-6">
          <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🔒</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">Erişim Yok</h2>
          <p className="text-sm text-slate-500">
            Hesabınıza henüz rol atanmamış. Lütfen yöneticinizle iletişime geçin.
          </p>
          <button
            onClick={signOut}
            className="mt-5 px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer"
          >
            Çıkış Yap
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </>
  );
}
