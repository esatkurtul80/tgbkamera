import { useCallback, useEffect, useState } from 'react';
import { getDegerlendirmelerByMagazaIds, getDegerlendirmelerByMagazaIdsAralik } from '@/lib/firestore';
import type { Degerlendirme, Magaza } from '@/lib/types';
import type { TarihAraligi } from '@/lib/bmRapor';

/**
 * Bölge müdürünün mağazalarına ait raporları seçili tarih aralığında çeker.
 * Aralık 'tumu' ise sınırsız (parça başına 400 kayıt), aksi halde sunucu tarafı tarih filtresi.
 */
export function useBmRaporlar(magazalar: Magaza[], aralik: TarihAraligi, hazir: boolean) {
  const [raporlar, setRaporlar] = useState<Degerlendirme[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sayac, setSayac] = useState(0);

  const yenile = useCallback(() => {
    setRefreshing(true);
    setSayac((s) => s + 1);
  }, []);

  useEffect(() => {
    if (!hazir) return;
    let iptal = false;
    const ids = magazalar.map((m) => m.id);
    (async () => {
      try {
        if (ids.length === 0) {
          if (!iptal) setRaporlar([]);
          return;
        }
        const sonuc =
          aralik.baslangic && aralik.bitis
            ? await getDegerlendirmelerByMagazaIdsAralik(ids, aralik.baslangic, aralik.bitis)
            : await getDegerlendirmelerByMagazaIds(ids);
        if (!iptal) setRaporlar(sonuc);
      } finally {
        if (!iptal) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    })();
    return () => { iptal = true; };
  }, [hazir, magazalar, aralik, sayac]);

  return { raporlar, loading, refreshing, yenile };
}
