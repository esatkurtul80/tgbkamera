import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getBolgeler, getMagazalarByBolge } from '@/lib/firestore';
import type { Bolge, Magaza } from '@/lib/types';

/**
 * Bölge müdürünün bölgesini ve bölge mağazalarını çözer (webdeki useBmBolge ikizi).
 * Kaynak önceliği: kullanici.bolgeId → (yedek) bolgeMuduruId === uid olan bölge.
 * Rol bolge_muduru değilse hiçbir sorgu çalıştırmaz.
 */
export function useBmBolge(): {
  bolge: Bolge | null;
  magazalar: Magaza[];
  magazaIdSet: Set<string>;
  loading: boolean;
  bolgeYok: boolean;
} {
  const { user, kullanici } = useAuth();
  const bm = kullanici?.rol === 'bolge_muduru';
  const [bolge, setBolge] = useState<Bolge | null>(null);
  const [magazalar, setMagazalar] = useState<Magaza[]>([]);
  const [loading, setLoading] = useState(true);
  const [bolgeYok, setBolgeYok] = useState(false);

  useEffect(() => {
    if (!kullanici) return;
    if (!bm) { setLoading(false); return; }

    let iptal = false;
    (async () => {
      try {
        const bolgeler = await getBolgeler();
        const b =
          (kullanici.bolgeId ? bolgeler.find((x) => x.id === kullanici.bolgeId) : undefined) ??
          bolgeler.find((x) => x.bolgeMuduruId === user?.uid) ??
          null;
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
