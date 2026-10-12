"use client";

import { createContext, useContext, useState } from "react";
import { onAyarAraligi, type TarihAraligi } from "@/lib/bmRapor";

/**
 * Bölge müdürü ekranlarının ortak tarih aralığı: Panel'de "Son 3 Ay" seçilip mağazaya
 * girildiğinde aynı aralık gelir. BmShell kök layout'ta takılı kaldığı için sayfalar
 * arasında korunur; sayfa yenilenince "Bu Ay"a döner.
 */
interface BmAralikDegeri {
  aralik: TarihAraligi;
  setAralik: (a: TarihAraligi) => void;
}

const BmAralikCtx = createContext<BmAralikDegeri | null>(null);

export function BmAralikProvider({ children }: { children: React.ReactNode }) {
  const [aralik, setAralik] = useState<TarihAraligi>(() => onAyarAraligi("buAy"));
  return <BmAralikCtx.Provider value={{ aralik, setAralik }}>{children}</BmAralikCtx.Provider>;
}

export function useBmAralik(): BmAralikDegeri {
  const ctx = useContext(BmAralikCtx);
  if (!ctx) throw new Error("useBmAralik yalnız BmShell içinde kullanılabilir");
  return ctx;
}
