"use client";

import { useEffect, useState } from "react";
import { Trash2, Store, RotateCcw, User } from "lucide-react";
import Badge from "@/components/ui/Badge";
import DataTable, { type DataColumn } from "@/components/ui/DataTable";
import { getCopKutusu, restoreDegerlendirmeFromCopKutusu } from "@/lib/firestore";
import type { CopKutusuKaydi } from "@/types";

const GUN_MS = 24 * 60 * 60 * 1000;

function kalanGun(kayit: CopKutusuKaydi): number {
  const bitis = kayit.otomatikSilinmeTarihi?.toDate?.();
  if (!bitis) return 0;
  return Math.max(0, Math.ceil((bitis.getTime() - Date.now()) / GUN_MS));
}

export default function CopKutusuPage() {
  const [liste, setListe] = useState<CopKutusuKaydi[]>([]);
  const [loading, setLoading] = useState(true);
  const [geriGetirilenId, setGeriGetirilenId] = useState<string | null>(null);

  useEffect(() => {
    getCopKutusu().then((d) => {
      setListe(d);
      setLoading(false);
    });
  }, []);

  async function handleGeriGetir(id: string) {
    setGeriGetirilenId(id);
    try {
      await restoreDegerlendirmeFromCopKutusu(id);
      setListe((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      console.error("Değerlendirme geri getirilemedi:", err);
    } finally {
      setGeriGetirilenId(null);
    }
  }

  const columns: DataColumn<CopKutusuKaydi>[] = [
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
      key: "silen",
      header: "Silen",
      searchValue: (d) => d.silenKullaniciAd ?? "",
      sortValue: (d) => d.silenKullaniciAd ?? "",
      width: "150px",
      cell: (d) =>
        d.silenKullaniciAd ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
            <User size={11} className="text-slate-400" /> {d.silenKullaniciAd}
          </span>
        ) : (
          <span className="text-slate-300 text-sm">—</span>
        ),
    },
    {
      key: "silinmeTarihi",
      header: "Silinme Tarihi",
      width: "130px",
      sortValue: (d) => d.silinmeTarihi?.seconds ?? 0,
      searchValue: () => "",
      cell: (d) => (
        <span className="text-sm text-slate-500 whitespace-nowrap">
          {d.silinmeTarihi?.toDate?.().toLocaleDateString("tr-TR") ?? "—"}
        </span>
      ),
    },
    {
      key: "kalanGun",
      header: "Kalan Süre",
      align: "center",
      width: "130px",
      sortValue: (d) => kalanGun(d),
      searchValue: () => "",
      cell: (d) => {
        const gun = kalanGun(d);
        const renk =
          gun <= 3
            ? "bg-red-50 text-red-600 border-red-200"
            : gun <= 10
            ? "bg-amber-50 text-amber-600 border-amber-200"
            : "bg-emerald-50 text-emerald-600 border-emerald-200";
        return (
          <span className={`inline-flex items-center justify-center text-xs font-semibold px-2.5 py-1 rounded-full border whitespace-nowrap ${renk}`}>
            {gun} gün kaldı
          </span>
        );
      },
    },
    {
      key: "aksiyon",
      header: "",
      align: "right",
      width: "150px",
      cell: (d) => (
        <button
          onClick={() => handleGeriGetir(d.id)}
          disabled={geriGetirilenId === d.id}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-60 whitespace-nowrap"
        >
          <RotateCcw size={12} />
          {geriGetirilenId === d.id ? "Geri Getiriliyor..." : "Geri Getir"}
        </button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Çöp Kutusu</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Silinen değerlendirmeler burada 30 gün saklanır, isteyen geri getirebilir. Süre dolunca kalıcı olarak silinir.
        </p>
      </div>
      <DataTable
        data={liste}
        columns={columns}
        rowKey={(d) => d.id}
        loading={loading}
        searchPlaceholder="Personel, mağaza, form veya silen kişi ara..."
        emptyIcon={Trash2}
        emptyTitle="Çöp kutusu boş"
        emptyDescription="Silinen değerlendirmeler burada görünür."
        defaultPageSize={25}
      />
    </div>
  );
}
