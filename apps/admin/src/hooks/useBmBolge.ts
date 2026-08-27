"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getBolge, getBolgeByMuduruId, getMagazalarByBolge } from "@/lib/firestore";
import type { Bolge, Magaza } from "@/types";

/**
 * Bölge müdürünün bölgesini ve bölge mağazalarını çözer.
 * Kaynak önceliği: kullanici.bolgeId → (yedek) bolgeMuduruId === uid olan bölge.
 * Rol bolge_muduru değilse hiçbir sorgu çalıştırmaz (loading=false, bolge=null).
 */
export function useBmBolge(): {
  bolge: Bolge | null;
  magazalar: Magaza[];
  magazaIdSet: Set<string>;
  loading: boolean;
  /** BM rolünde olup ne bolgeId ne de yedek eşleşme bulunamadı. */
  bolgeYok: boolean;
} {
  const { user, kullanici } = useAuth();
  const bm = kullanici?.rol === "bolge_muduru";
  const [bolge, setBolge] = useState<Bolge | null>(null);
  const [magazalar, setMagazalar] = useState<Magaza[]>([]);
  const [loading, setLoading] = useState(true);
  const [bolgeYok, setBolgeYok] = useState(false);

  useEffect(() => {
    if (!kullanici) return; // auth henüz çözülmedi
    if (!bm) { setLoading(false); return; }

    let iptal = false;
    (async () => {
      try {
        let b: Bolge | null = null;
        if (kullanici.bolgeId) b = await getBolge(kullanici.bolgeId);
        if (!b && user) b = await getBolgeByMuduruId(user.uid);
        if (iptal) return;
        if (!b) {
          setBolgeYok(true);
          return;
        }
        setBolge(b);
        const m = await getMagazalarByBolge(b.id);
        if (!iptal) setMagazalar(m);
      } finally {
        if (!iptal) setLoading(false);
      }
    })();
    return () => { iptal = true; };
  }, [bm, kullanici, user]);

  const magazaIdSet = useMemo(() => new Set(magazalar.map((m) => m.id)), [magazalar]);

  return { bolge, magazalar, magazaIdSet, loading, bolgeYok };
}
