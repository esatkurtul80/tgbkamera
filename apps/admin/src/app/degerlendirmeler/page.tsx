"use client";

import { useEffect, useState } from "react";
import { ClipboardList, Plus, Eye, Store, Trash2, Pencil, Camera, CheckCircle2, Play } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import DataTable, { type DataColumn } from "@/components/ui/DataTable";
import {
  getDegerlendirmeler,
  getFormlar,
  getPersoneller,
  getMagazalar,
  deleteDegerlendirme,
} from "@/lib/firestore";
import type { Degerlendirme, Form, Personel, Magaza } from "@/types";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

// ── Kameraman: yalnızca kendi raporları ──────────────────────────────────────

function KameramanDegerlendirmelerView() {
  const { user } = useAuth();
  const [liste, setListe] = useState<Degerlendirme[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getDegerlendirmeler({ kameramanId: user.uid }).then((d) => {
      // Açık raporlar önce, sonra oluşturma tarihine göre en yeni
      const sorted = [...d].sort((a, b) => {
        if (a.durum === "acik" && b.durum !== "acik") return -1;
        if (a.durum !== "acik" && b.durum === "acik") return 1;
        return (b.olusturmaTarihi?.seconds ?? 0) - (a.olusturmaTarihi?.seconds ?? 0);
      });
      setListe(sorted);
      setLoading(false);
    });
  }, [user]);

  const acikSayisi = liste.filter((d) => d.durum === "acik").length;

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
      header: "Aksiyon",
      align: "right",
      width: "130px",
      cell: (d) =>
        d.durum === "acik" ? (
          <Link
            href={`/degerlendirmeler/yeni?devam=${d.id}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors whitespace-nowrap"
          >
            <Play size={9} fill="currentColor" /> Devam Et
          </Link>
        ) : (
          <Link
            href={`/degerlendirmeler/${d.id}`}
            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors inline-flex"
            title="Raporu Gör"
          >
            <Eye size={14} />
          </Link>
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Değerlendirmelerim</h1>
          <p className="text-sm text-slate-500 mt-0.5">{liste.length} rapor</p>
        </div>
        {acikSayisi > 0 && (
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
            {acikSayisi} devam eden rapor
          </div>
        )}
      </div>
      <DataTable
        data={liste}
        columns={columns}
        rowKey={(d) => d.id}
        loading={loading}
        searchPlaceholder="Personel veya form ara..."
        emptyIcon={ClipboardList}
        emptyTitle="Henüz değerlendirme yok"
        emptyDescription="Panelinizdeki mağazalardan personel seçerek yeni bir değerlendirme başlatabilirsiniz."
        defaultPageSize={10}
      />
    </div>
  );
}

// ── Admin / diğer roller: tüm değerlendirmeler ───────────────────────────────

export default function DegerlendirmelerPage() {
  const { kullanici } = useAuth();

  if (kullanici?.rol === "kameraman") {
    return <KameramanDegerlendirmelerView />;
  }

  return <AdminDegerlendirmelerView />;
}

function AdminDegerlendirmelerView() {
  const [liste, setListe] = useState<Degerlendirme[]>([]);
  const [formlar, setFormlar] = useState<Form[]>([]);
  const [personeller, setPersoneller] = useState<Personel[]>([]);
  const [magazalar, setMagazalar] = useState<Magaza[]>([]);
  const [filtrePersonel, setFiltrePersonel] = useState("");
  const [filtreForm, setFiltreForm] = useState("");
  const [filtreMagaza, setFiltreMagaza] = useState("");
  const [loading, setLoading] = useState(true);

  const [silId, setSilId] = useState<string | null>(null);
  const [siliyor, setSiliyor] = useState(false);

  useEffect(() => {
    Promise.all([getDegerlendirmeler(), getFormlar(), getPersoneller(), getMagazalar()]).then(
      ([d, f, p, m]) => {
        setListe(d);
        setFormlar(f);
        setPersoneller(p);
        setMagazalar(m);
        setLoading(false);
      }
    );
  }, []);

  async function applyFilter() {
    setLoading(true);
    const filters: Parameters<typeof getDegerlendirmeler>[0] = {};
    if (filtrePersonel) filters.personelId = filtrePersonel;
    else if (filtreMagaza) filters.magazaId = filtreMagaza;
    else if (filtreForm) filters.formId = filtreForm;
    setListe(await getDegerlendirmeler(filters));
    setLoading(false);
  }

  async function clearFilter() {
    setFiltrePersonel("");
    setFiltreForm("");
    setFiltreMagaza("");
    setLoading(true);
    setListe(await getDegerlendirmeler());
    setLoading(false);
  }

  async function handleSil() {
    if (!silId) return;
    setSiliyor(true);
    await deleteDegerlendirme(silId);
    setListe((prev) => prev.filter((d) => d.id !== silId));
    setSilId(null);
    setSiliyor(false);
  }

  const hasFilter = filtrePersonel || filtreForm || filtreMagaza;

  const columns: DataColumn<Degerlendirme>[] = [
    {
      key: "izlenmeTarihi",
      header: "İzlenme Tarihi",
      width: "130px",
      sortValue: (d) => d.izlenmeTarihi?.seconds ?? 0,
      searchValue: () => "",
      cell: (d) => (
        <span className="text-sm text-slate-500 whitespace-nowrap">
          {d.izlenmeTarihi?.toDate?.().toLocaleDateString("tr-TR") ?? "—"}
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
      key: "kameraman",
      header: "Kameraman",
      searchValue: (d) => d.kameramanAd ?? "",
      sortValue: (d) => d.kameramanAd ?? "",
      cell: (d) =>
        d.kameramanAd ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-violet-700 bg-violet-50 px-2 py-0.5 rounded font-medium">
            <Camera size={10} /> {d.kameramanAd}
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
      sortValue: (d) => (d.puanli ? 1 : 0),
      cell: (d) => <Badge variant={d.puanli ? "puanli" : "puansiz"} />,
    },
    {
      key: "puan",
      header: "Puan",
      align: "center",
      width: "130px",
      sortValue: (d) => d.toplamPuan ?? -1,
      cell: (d) => {
        if (!d.puanli || d.toplamPuan === null) return <span className="text-slate-300">—</span>;
        const yuzde =
          d.maxPuan && d.maxPuan > 0 ? Math.round((d.toplamPuan / d.maxPuan) * 100) : null;
        return (
          <div className="flex flex-col items-center gap-1">
            <span className="text-sm font-semibold text-slate-800">
              {d.toplamPuan} / {d.maxPuan}
            </span>
            {yuzde !== null && (
              <div className="flex items-center gap-1.5 w-full max-w-[80px]">
                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${yuzde >= 80 ? "bg-emerald-500" : yuzde >= 50 ? "bg-amber-400" : "bg-red-400"}`}
                    style={{ width: `${yuzde}%` }}
                  />
                </div>
                <span className="text-[10px] font-semibold text-slate-500 shrink-0">%{yuzde}</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: "aksiyonlar",
      header: "",
      align: "right",
      width: "100px",
      cell: (d) => (
        <div className="flex items-center justify-end gap-1">
          <Link
            href={`/degerlendirmeler/${d.id}`}
            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors inline-flex"
            title="Raporu Görüntüle"
          >
            <Eye size={14} />
          </Link>
          <Link
            href={`/degerlendirmeler/${d.id}/duzenle`}
            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors inline-flex"
            title="Düzenle"
          >
            <Pencil size={14} />
          </Link>
          <button
            onClick={() => setSilId(d.id)}
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Sil"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  const filterToolbar = (
    <div className="flex items-center gap-2 flex-wrap">
      <select
        value={filtrePersonel}
        onChange={(e) => {
          setFiltrePersonel(e.target.value);
          setFiltreMagaza("");
          setFiltreForm("");
        }}
        className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
      >
        <option value="">Tüm Personel</option>
        {personeller.map((p) => (
          <option key={p.id} value={p.id}>
            {p.ad}
          </option>
        ))}
      </select>
      <select
        value={filtreMagaza}
        onChange={(e) => {
          setFiltreMagaza(e.target.value);
          setFiltrePersonel("");
          setFiltreForm("");
        }}
        className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
      >
        <option value="">Tüm Mağazalar</option>
        {magazalar.map((m) => (
          <option key={m.id} value={m.id}>
            {m.ad}
          </option>
        ))}
      </select>
      <select
        value={filtreForm}
        onChange={(e) => {
          setFiltreForm(e.target.value);
          setFiltrePersonel("");
          setFiltreMagaza("");
        }}
        className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
      >
        <option value="">Tüm Formlar</option>
        {formlar.map((f) => (
          <option key={f.id} value={f.id}>
            {f.ad}
          </option>
        ))}
      </select>
      <button
        onClick={applyFilter}
        className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
      >
        Filtrele
      </button>
      {hasFilter && (
        <button
          onClick={clearFilter}
          className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          Temizle
        </button>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Değerlendirmeler</h1>
          <p className="text-sm text-slate-500 mt-0.5">{liste.length} kayıt</p>
        </div>
        <Link
          href="/degerlendirmeler/yeni"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus size={15} /> Yeni Değerlendirme
        </Link>
      </div>

      <DataTable
        data={liste}
        columns={columns}
        rowKey={(d) => d.id}
        loading={loading}
        searchPlaceholder="Personel, kameraman veya form ara..."
        emptyIcon={ClipboardList}
        emptyTitle="Değerlendirme bulunamadı"
        emptyDescription="Yeni bir değerlendirme başlatmak için sağ üstteki butona tıklayın."
        defaultPageSize={25}
        toolbar={filterToolbar}
      />

      <Modal open={!!silId} onClose={() => setSilId(null)} title="Değerlendirmeyi Sil" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Bu değerlendirmeyi kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri
            alınamaz.
          </p>
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setSilId(null)}
              className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              İptal
            </button>
            <button
              onClick={handleSil}
              disabled={siliyor}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-60"
            >
              {siliyor ? "Siliniyor..." : "Evet, Sil"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
