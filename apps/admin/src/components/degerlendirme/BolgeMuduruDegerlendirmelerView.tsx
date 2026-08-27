"use client";

import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Eye, Store, CheckCircle2, MapIcon } from "lucide-react";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import DataTable, { type DataColumn } from "@/components/ui/DataTable";
import { getDegerlendirmelerByMagazaIds } from "@/lib/firestore";
import { useBmBolge } from "@/hooks/useBmBolge";
import type { Degerlendirme } from "@/types";

/**
 * Bölge müdürü için salt okunur değerlendirme listesi: yalnızca kendi
 * bölgesindeki mağazaların raporları. Oluşturma/düzenleme/silme yok;
 * tek aksiyon rapor detayını görüntülemek. (Excel dışa aktarım istenirse
 * admin görünümündeki desenle eklenebilir.)
 */
export default function BolgeMuduruDegerlendirmelerView() {
  const { bolge, magazalar, loading: bolgeLoading, bolgeYok } = useBmBolge();
  const [liste, setListe] = useState<Degerlendirme[]>([]);
  const [loading, setLoading] = useState(true);

  const [magazaFiltre, setMagazaFiltre] = useState("");
  const [tarihBaslangic, setTarihBaslangic] = useState("");
  const [tarihBitis, setTarihBitis] = useState("");

  useEffect(() => {
    if (bolgeLoading || bolgeYok) return;
    let iptal = false;
    (async () => {
      const d = await getDegerlendirmelerByMagazaIds(magazalar.map((m) => m.id));
      if (iptal) return;
      // Açık raporlar önce, sonra en yeni
      const sorted = [...d].sort((a, b) => {
        if (a.durum === "acik" && b.durum !== "acik") return -1;
        if (a.durum !== "acik" && b.durum === "acik") return 1;
        return (b.olusturmaTarihi?.seconds ?? 0) - (a.olusturmaTarihi?.seconds ?? 0);
      });
      setListe(sorted);
      setLoading(false);
    })();
    return () => { iptal = true; };
  }, [bolgeLoading, bolgeYok, magazalar]);

  const filtrelenmis = useMemo(() => {
    return liste.filter((d) => {
      if (magazaFiltre && d.magazaId !== magazaFiltre) return false;
      if (tarihBaslangic || tarihBitis) {
        const t = d.olusturmaTarihi?.toDate?.();
        if (!t) return false;
        if (tarihBaslangic && t < new Date(tarihBaslangic)) return false;
        if (tarihBitis) {
          const bitis = new Date(tarihBitis);
          bitis.setHours(23, 59, 59, 999);
          if (t > bitis) return false;
        }
      }
      return true;
    });
  }, [liste, magazaFiltre, tarihBaslangic, tarihBitis]);

  const acikSayisi = liste.filter((d) => d.durum === "acik").length;
  const filtreAktif = magazaFiltre || tarihBaslangic || tarihBitis;

  const toolbar = (
    <div className="flex items-center gap-2 flex-wrap">
      <select
        value={magazaFiltre}
        onChange={(e) => setMagazaFiltre(e.target.value)}
        className="px-2.5 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
      >
        <option value="">Tüm Mağazalar</option>
        {magazalar.map((m) => (
          <option key={m.id} value={m.id}>{m.ad}</option>
        ))}
      </select>
      <label className="text-xs text-slate-500 font-medium whitespace-nowrap">Tarih:</label>
      <input
        type="date"
        value={tarihBaslangic}
        onChange={(e) => setTarihBaslangic(e.target.value)}
        className="px-2.5 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
      />
      <span className="text-xs text-slate-400">–</span>
      <input
        type="date"
        value={tarihBitis}
        onChange={(e) => setTarihBitis(e.target.value)}
        className="px-2.5 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
      />
      {filtreAktif && (
        <button
          onClick={() => { setMagazaFiltre(""); setTarihBaslangic(""); setTarihBitis(""); }}
          className="px-3 py-2 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          Temizle
        </button>
      )}
    </div>
  );

  const columns: DataColumn<Degerlendirme>[] = [
    {
      key: "durum",
      header: "Durum",
      width: "145px",
      sortValue: (d) => (d.durum === "acik" ? 1 : 0),
      cell: (d) =>
        d.durum === "acik" ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
            Devam Ediyor
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
            <CheckCircle2 size={11} />
            Tamamlandı
          </span>
        ),
    },
    {
      key: "tarih",
      header: "Tarih",
      width: "105px",
      sortValue: (d) => d.olusturmaTarihi?.seconds ?? 0,
      cell: (d) => (
        <span className="text-sm text-slate-500">
          {d.olusturmaTarihi?.toDate?.().toLocaleDateString("tr-TR") ?? "—"}
        </span>
      ),
    },
    {
      key: "personel",
      header: "Personel",
      searchValue: (d) => d.personelAd,
      sortValue: (d) => d.personelAd,
      cell: (d) => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
            <span className="text-[10px] font-bold text-indigo-600">
              {d.personelAd.charAt(0).toUpperCase()}
            </span>
          </div>
          <span className="text-sm font-medium text-slate-800">{d.personelAd}</span>
        </div>
      ),
    },
    {
      key: "magaza",
      header: "Mağaza",
      searchValue: (d) => d.magazaAd ?? "",
      sortValue: (d) => d.magazaAd ?? "",
      cell: (d) =>
        d.magazaAd ? (
          <span className="inline-flex items-center gap-1 text-xs text-teal-700 bg-teal-50 px-2 py-0.5 rounded font-medium">
            <Store size={10} /> {d.magazaAd}
          </span>
        ) : (
          <span className="text-slate-300 text-sm">—</span>
        ),
    },
    {
      key: "form",
      header: "Form",
      searchValue: (d) => d.formAd,
      sortValue: (d) => d.formAd,
      cell: (d) => <span className="text-sm text-slate-600">{d.formAd}</span>,
    },
    {
      key: "tip",
      header: "Tip",
      align: "center",
      width: "90px",
      cell: (d) => <Badge variant={d.puanli ? "puanli" : "puansiz"} />,
    },
    {
      key: "puan",
      header: "Puan",
      align: "center",
      width: "130px",
      sortValue: (d) => {
        if (!d.puanli || d.maxPuan === null || d.maxPuan === 0 || d.toplamPuan === null) return -1;
        return Math.round((d.toplamPuan / d.maxPuan) * 100);
      },
      cell: (d) => {
        if (!d.puanli || d.toplamPuan === null) return <span className="text-slate-300 text-xs">—</span>;
        const yuzde = d.maxPuan && d.maxPuan > 0 ? Math.round((d.toplamPuan / d.maxPuan) * 100) : null;
        return (
          <div className="flex flex-col items-center gap-0.5">
            <span className={`text-xs font-bold ${yuzde !== null ? (yuzde >= 80 ? "text-emerald-600" : yuzde >= 50 ? "text-amber-500" : "text-red-500") : "text-slate-500"}`}>
              {yuzde !== null ? `%${yuzde}` : `${d.toplamPuan}p`}
            </span>
            {yuzde !== null && (
              <div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${yuzde >= 80 ? "bg-emerald-500" : yuzde >= 50 ? "bg-amber-400" : "bg-red-400"}`}
                  style={{ width: `${yuzde}%` }}
                />
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: "aksiyon",
      header: "",
      align: "right",
      width: "60px",
      cell: (d) => (
        <Link
          href={`/degerlendirmeler/${d.id}`}
          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors inline-flex"
          title="Raporu Görüntüle"
        >
          <Eye size={14} />
        </Link>
      ),
    },
  ];

  if (bolgeYok) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <MapIcon size={32} className="text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Hesabınıza bölge atanmamış.</p>
          <p className="text-xs text-slate-400 mt-1">Lütfen yöneticinizle iletişime geçin.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Bölge Değerlendirmeleri</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {bolge?.ad ? `${bolge.ad} · ` : ""}{filtrelenmis.length} rapor
          </p>
        </div>
        {acikSayisi > 0 && (
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
            {acikSayisi} devam eden rapor
          </div>
        )}
      </div>
      <DataTable
        data={filtrelenmis}
        columns={columns}
        rowKey={(d) => d.id}
        loading={loading || bolgeLoading}
        searchPlaceholder="Personel, mağaza veya form ara..."
        emptyIcon={ClipboardList}
        emptyTitle="Bölgenizde henüz değerlendirme yok"
        defaultPageSize={25}
        toolbar={toolbar}
      />
    </div>
  );
}
