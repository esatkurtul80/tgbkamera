"use client";

import { useCallback, useEffect, useState } from "react";
import { getDegerlendirmelerByMagazaIds, getDegerlendirmelerByMagazaIdsAralik } from "@/lib/firestore";
import type { Degerlendirme, Magaza } from "@/types";
import type { TarihAraligi } from "@/lib/bmRapor";

/**
 * Bölge müdürünün mağazalarına ait raporları seçili tarih aralığında çeker.
 * Aralık 'tumu' ise sınırsız (parça başına 500 kayıt), aksi halde sunucu tarafı tarih filtresi.
 * (Mobil ikizi: apps/mobile/src/hooks/useBmRaporlar.ts)
 */
export function useBmRaporlar(magazalar: Magaza[], aralik: TarihAraligi, hazir: boolean) {
  const [raporlar, setRaporlar] = useState<Degerlendirme[]>([]);
  const [loading, setLoading] = useState(true);
  const [sayac, setSayac] = useState(0);

  const yenile = useCallback(() => setSayac((s) => s + 1), []);

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
        if (!iptal) setLoading(false);
      }
    })();
    return () => { iptal = true; };
  }, [hazir, magazalar, aralik, sayac]);

  return { raporlar, loading, yenile };
}
