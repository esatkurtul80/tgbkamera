"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getMagazalarByBolgeMuduru } from "@/lib/firestore";
import { onbellekSonraSunucu } from "@/lib/onbellek";
import type { Magaza } from "@/types";

/**
 * Bölge müdürünün sorumlu olduğu mağazaları çözer (magazalar.bolgeMuduruId === uid).
 * Atama admin tarafından Mağazalar sayfasından yapılır; ayrı bir "bölge" kaydı yoktur.
 * Rol bolge_muduru değilse hiçbir sorgu çalıştırmaz (loading=false, magazalar=[]).
 * Önce kalıcı önbellekten (anında), sonra sunucudan (güncel) okur.
 */
export function useBmMagazalar(): {
  magazalar: Magaza[];
  magazaIdSet: Set<string>;
  loading: boolean;
  /** BM rolünde olup hiç mağaza atanmamış. */
  magazaYok: boolean;
} {
  const { user, kullanici } = useAuth();
  const bm = kullanici?.rol === "bolge_muduru";
  const [magazalar, setMagazalar] = useState<Magaza[]>([]);
  const [loading, setLoading] = useState(true);
  const [magazaYok, setMagazaYok] = useState(false);

  useEffect(() => {
    if (!kullanici) return; // auth henüz çözülmedi
    if (!bm || !user) { setLoading(false); return; }

    let iptal = false;
    (async () => {
      try {
        await onbellekSonraSunucu(
          () => getMagazalarByBolgeMuduru(user.uid, "onbellek"),
          () => getMagazalarByBolgeMuduru(user.uid, "sunucu"),
          (m) => {
            setMagazalar((onceki) => (ayniIdler(onceki, m) ? onceki : m));
            setMagazaYok(m.length === 0);
            setLoading(false);
          },
          () => iptal
        );
      } finally {
        if (!iptal) setLoading(false);
      }
    })();
    return () => { iptal = true; };
  }, [bm, kullanici, user]);

  const magazaIdSet = useMemo(() => new Set(magazalar.map((m) => m.id)), [magazalar]);

  return { magazalar, magazaIdSet, loading, magazaYok };
}

/** Önbellek ve sunucu aynı mağaza listesini verdiyse referansı koru (bağlı hook'lar yeniden sorgulamasın). */
function ayniIdler(a: Magaza[], b: Magaza[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((m, i) => m.id === b[i].id && m.ad === b[i].ad);
}
