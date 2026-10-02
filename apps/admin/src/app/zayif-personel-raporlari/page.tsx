"use client";

import { AdminDegerlendirmelerView } from "../degerlendirmeler/page";

/**
 * Tekrar izlemeye alınan (zayıf) personel için açılan takip raporlarının kategorisi.
 * Bu raporlar (tekrarIzleme: true) Değerlendirmeler altındaki Tümü / Puanlı / Yorumlu /
 * Puansız listelerine girmez; yalnız burada listelenir (mağaza raporları deseni).
 */
export default function ZayifPersonelRaporlariPage() {
  return <AdminDegerlendirmelerView baslik="Zayıf Personel Raporları" kategori="takip" />;
}
