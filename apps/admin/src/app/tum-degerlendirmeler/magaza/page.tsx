"use client";

import { AdminDegerlendirmelerView } from "../../degerlendirmeler/page";

/** Mağaza raporlarının (personelsiz, mağazanın kendisine ait) kategorisi. */
export default function MagazaDegerlendirmelerPage() {
  return <AdminDegerlendirmelerView baslik="Mağaza Raporları" kategori="magaza" />;
}
