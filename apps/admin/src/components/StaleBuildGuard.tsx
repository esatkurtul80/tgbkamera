"use client";

import { useEffect, useState } from "react";

const RELOAD_GUARD_KEY = "tgb-stale-build-reload-at";
const RELOAD_GUARD_WINDOW_MS = 15000;

function isStaticAssetErrorTarget(target: EventTarget | null): boolean {
  if (target instanceof HTMLLinkElement) {
    return target.rel === "stylesheet" && target.href.includes("/_next/static/");
  }
  if (target instanceof HTMLScriptElement) {
    return (target.src || "").includes("/_next/static/");
  }
  return false;
}

function isChunkLoadRejection(reason: unknown): boolean {
  if (!reason) return false;
  const err = reason as { name?: string; message?: string };
  const msg = typeof reason === "string" ? reason : err.message || "";
  return (
    err.name === "ChunkLoadError" ||
    /Loading chunk [\w.-]+ failed/i.test(msg) ||
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg)
  );
}

/**
 * Yeni bir deploy, tarayıcıda açık kalan eski bir sayfanın referans verdiği
 * statik dosyaları (CSS/JS chunk) sunucudan kaldırır — bu da 404 ve stilsiz/
 * bozuk render ile sonuçlanır. Bu bileşen bu tür kaynak hatalarını yakalayıp
 * sayfayı otomatik olarak bir kez yeniler; aynı sekmede kısa sürede tekrar
 * tetiklenirse (gerçek bir hata olabileceğinden) sonsuz döngüye girmez.
 */
export default function StaleBuildGuard() {
  const [reloading, setReloading] = useState(false);

  useEffect(() => {
    function reloadOnce() {
      const last = Number(sessionStorage.getItem(RELOAD_GUARD_KEY) || 0);
      const now = Date.now();
      if (now - last < RELOAD_GUARD_WINDOW_MS) return;
      sessionStorage.setItem(RELOAD_GUARD_KEY, String(now));
      setReloading(true);
      setTimeout(() => window.location.reload(), 500);
    }

    function onResourceError(e: Event) {
      if (isStaticAssetErrorTarget(e.target)) reloadOnce();
    }

    function onRejection(e: PromiseRejectionEvent) {
      if (isChunkLoadRejection(e.reason)) reloadOnce();
    }

    window.addEventListener("error", onResourceError, true);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onResourceError, true);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  if (!reloading) return null;
  return (
    <div className="fixed inset-x-0 top-0 z-[100] bg-indigo-600 text-white text-sm font-medium text-center py-2 shadow-md">
      Yeni bir sürüm yayınlandı, sayfa yenileniyor...
    </div>
  );
}
