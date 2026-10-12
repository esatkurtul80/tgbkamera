"use client";

import { useCallback, useEffect, useState } from "react";
import { getDegerlendirmelerByMagazaIds, getDegerlendirmelerByMagazaIdsAralik, type VeriKaynagi } from "@/lib/firestore";
import { bmGorunurRaporlar, type TarihAraligi } from "@/lib/bmRapor";
import { onbellekSonraSunucu } from "@/lib/onbellek";
import type { Degerlendirme, Magaza } from "@/types";

/**
 * Bölge müdürünün mağazalarına ait raporları seçili tarih aralığında çeker.
 * Aralık 'tumu' ise sınırsız (parça başına 500 kayıt), aksi halde sunucu tarafı tarih filtresi.
 * Önce kalıcı önbellekten (anında), sonra sunucudan (güncel) okur.
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
    const cek = (kaynak: VeriKaynagi) =>
      aralik.baslangic && aralik.bitis
        ? getDegerlendirmelerByMagazaIdsAralik(ids, aralik.baslangic, aralik.bitis, kaynak)
        : getDegerlendirmelerByMagazaIds(ids, 500, kaynak);
    (async () => {
      try {
        if (ids.length === 0) {
          if (!iptal) setRaporlar([]);
          return;
        }
        await onbellekSonraSunucu(
          () => cek("onbellek"),
          () => cek("sunucu"),
          (sonuc) => {
            setRaporlar(bmGorunurRaporlar(sonuc));
            setLoading(false);
          },
          () => iptal
        );
      } finally {
        if (!iptal) setLoading(false);
      }
    })();
    return () => { iptal = true; };
  }, [hazir, magazalar, aralik, sayac]);

  return { raporlar, loading, yenile };
}
