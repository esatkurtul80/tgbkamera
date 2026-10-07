import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getMagazalarByBolgeMuduru } from '@/lib/firestore';
import type { Magaza } from '@/lib/types';

/**
 * Bölge müdürünün sorumlu olduğu mağazaları çözer (webdeki useBmMagazalar ikizi):
 * magazalar.bolgeMuduruId === uid. Atama admin tarafından web Mağazalar sayfasından
 * yapılır; ayrı bir "bölge" kaydı yoktur. Rol bolge_muduru değilse sorgu çalıştırmaz.
 */
export function useBmMagazalar(): {
  magazalar: Magaza[];
  magazaIdSet: Set<string>;
  loading: boolean;
  /** BM rolünde olup hiç mağaza atanmamış. */
  magazaYok: boolean;
} {
  const { user, kullanici } = useAuth();
  const bm = kullanici?.rol === 'bolge_muduru';
  const [magazalar, setMagazalar] = useState<Magaza[]>([]);
  const [loading, setLoading] = useState(true);
  const [magazaYok, setMagazaYok] = useState(false);

  useEffect(() => {
    if (!kullanici) return;
    if (!bm || !user) { setLoading(false); return; }

    let iptal = false;
    (async () => {
      try {
        const m = await getMagazalarByBolgeMuduru(user.uid);
        if (iptal) return;
        setMagazalar(m);
        setMagazaYok(m.length === 0);
      } finally {
        if (!iptal) setLoading(false);
      }
    })();
    return () => { iptal = true; };
  }, [bm, kullanici, user]);

  const magazaIdSet = useMemo(() => new Set(magazalar.map((m) => m.id)), [magazalar]);

  return { magazalar, magazaIdSet, loading, magazaYok };
}
