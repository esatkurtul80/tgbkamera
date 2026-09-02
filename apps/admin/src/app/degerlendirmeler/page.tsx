"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardList, Eye, Store, Trash2, Pencil, Camera, CheckCircle2, Play, FileSpreadsheet, X } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import DataTable, { type DataColumn } from "@/components/ui/DataTable";
import {
  getDegerlendirmeler,
  getFormlar,
  getPersoneller,
  getMagazalar,
  softDeleteDegerlendirme,
} from "@/lib/firestore";
import type { Degerlendirme, Form, Personel, Magaza } from "@/types";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import BolgeMuduruDegerlendirmelerView from "@/components/degerlendirme/BolgeMuduruDegerlendirmelerView";

// ── Kameraman: yalnızca kendi raporları ──────────────────────────────────────

function KameramanDegerlendirmelerView() {
  const { user, kullanici } = useAuth();
  const [liste, setListe] = useState<Degerlendirme[]>([]);
  const [loading, setLoading] = useState(true);
  const [tarihBaslangic, setTarihBaslangic] = useState("");
  const [tarihBitis, setTarihBitis] = useState("");

  const [silId, setSilId] = useState<string | null>(null);
  const [siliyor, setSiliyor] = useState(false);

  useEffect(() => {
    if (!user) return;
    getDegerlendirmeler({ kameramanId: user.uid }).then((d) => {
      // Devam eden raporlar önce, sonra oluşturma tarihine göre en yeni
      const sorted = [...d].sort((a, b) => {
        if (devamEdiyorMu(a) && !devamEdiyorMu(b)) return -1;
        if (!devamEdiyorMu(a) && devamEdiyorMu(b)) return 1;
        return (b.olusturmaTarihi?.seconds ?? 0) - (a.olusturmaTarihi?.seconds ?? 0);
      });
      setListe(sorted);
      setLoading(false);
    });
  }, [user]);

  async function handleSil() {
    if (!silId || !user) return;
    const hedef = liste.find((d) => d.id === silId);
    if (!hedef) { setSilId(null); return; }
    setSiliyor(true);
    await softDeleteDegerlendirme(hedef, {
      id: user.uid,
      ad: kullanici?.displayName ?? user.displayName ?? "",
    });
    setListe((prev) => prev.filter((d) => d.id !== silId));
    setSilId(null);
    setSiliyor(false);
  }

  const acikSayisi = liste.filter(devamEdiyorMu).length;

  const filtrelenmisListe = useMemo(() => {
    if (!tarihBaslangic && !tarihBitis) return liste;
    return liste.filter((d) => {
      const t = d.olusturmaTarihi?.toDate?.();
      if (!t) return false;
      if (tarihBaslangic && t < new Date(tarihBaslangic)) return false;
      if (tarihBitis) {
        const bitis = new Date(tarihBitis);
        bitis.setHours(23, 59, 59, 999);
        if (t > bitis) return false;
      }
      return true;
    });
  }, [liste, tarihBaslangic, tarihBitis]);

  const tarihToolbar = (
    <div className="flex items-center gap-2 flex-wrap">
      <label className="text-xs text-slate-500 font-medium whitespace-nowrap">Rapor Oluşturma Tarihi:</label>
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
      {(tarihBaslangic || tarihBitis) && (
        <button
          onClick={() => { setTarihBaslangic(""); setTarihBitis(""); }}
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
      sortValue: (d) => (devamEdiyorMu(d) ? 1 : 0),
      cell: (d) =>
        devamEdiyorMu(d) ? (
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
          <span className={`text-xs font-bold ${yuzde !== null ? (yuzde >= 80 ? "text-emerald-600" : yuzde >= 50 ? "text-amber-500" : "text-red-500") : "text-slate-500"}`}>
            {d.toplamPuan}
          </span>
        );
      },
    },
    {
      key: "aksiyon",
      header: "Aksiyon",
      align: "right",
      width: "160px",
      cell: (d) => (
        <div className="flex items-center justify-end gap-1">
          {devamEdiyorMu(d) ? (
            <>
              <Link
                href={`/degerlendirmeler/${d.id}`}
                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors inline-flex"
                title="Ara Raporu Gör"
              >
                <Eye size={14} />
              </Link>
              <Link
                href={`/degerlendirmeler/yeni?devam=${d.id}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors whitespace-nowrap"
              >
                <Play size={9} fill="currentColor" /> Devam Et
              </Link>
            </>
          ) : (
            <>
              <Link
                href={`/degerlendirmeler/${d.id}`}
                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors inline-flex"
                title="Raporu Görüntüle"
              >
                <Eye size={14} />
              </Link>
              <Link
                // Puanlı matris raporunda "düzenle", raporun ilk açıldığı matris
                // ekranını (devam modu) açar; diğer tipler ayrı düzenleme sayfasını kullanır.
                href={kategoriUygunMu(d, "puanli")
                  ? `/degerlendirmeler/yeni?devam=${d.id}`
                  : `/degerlendirmeler/${d.id}/duzenle`}
                className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors inline-flex"
                title="Düzenle"
              >
                <Pencil size={14} />
              </Link>
            </>
          )}
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

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Değerlendirmelerim</h1>
          <p className="text-sm text-slate-500 mt-0.5">{filtrelenmisListe.length} rapor</p>
        </div>
        {acikSayisi > 0 && (
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
            {acikSayisi} devam eden rapor
          </div>
        )}
      </div>
      <DataTable
        data={filtrelenmisListe}
        columns={columns}
        rowKey={(d) => d.id}
        loading={loading}
        searchPlaceholder="Personel veya form ara..."
        emptyIcon={ClipboardList}
        emptyTitle="Henüz değerlendirme yok"
        emptyDescription="Panelinizdeki mağazalardan personel seçerek yeni bir değerlendirme başlatabilirsiniz."
        defaultPageSize={10}
        toolbar={tarihToolbar}
      />

      <Modal open={!!silId} onClose={() => setSilId(null)} title="Değerlendirmeyi Sil" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Bu değerlendirme çöp kutusuna taşınacak. 30 gün boyunca çöp kutusundan geri
            getirilebilir, süre dolunca kalıcı olarak silinir.
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

// ── Admin / diğer roller: tüm değerlendirmeler ───────────────────────────────

export default function DegerlendirmelerPage() {
  const { kullanici } = useAuth();

  if (kullanici?.rol === "kameraman") {
    return <KameramanDegerlendirmelerView />;
  }

  // Bölge müdürü: yalnız kendi bölgesinin raporları, salt okunur
  if (kullanici?.rol === "bolge_muduru") {
    return <BolgeMuduruDegerlendirmelerView />;
  }

  return <AdminDegerlendirmelerView />;
}

/** Rapor kategorileri — ileride yeni kategoriler eklendikçe bu birlik genişletilir. */
export type DegerlendirmeKategori = "puanli" | "yorumlu" | "puansiz";

function kategoriUygunMu(
  d: { puanli?: boolean; puanGirisTipi?: string },
  kategori?: DegerlendirmeKategori
): boolean {
  if (!kategori) return true;
  const yorumluMu = !!d.puanli && d.puanGirisTipi === "manuel";
  if (kategori === "puanli") return !!d.puanli && !yorumluMu;
  if (kategori === "yorumlu") return yorumluMu;
  return !d.puanli; // puansiz
}

/** Puanlı matris raporları her zaman düzenlenebilir olduğundan hiçbir zaman
 *  "devam ediyor" sayılmaz; ayrım yalnız puansız/yorumlu formlar için geçerlidir. */
function devamEdiyorMu(d: Degerlendirme): boolean {
  return d.durum === "acik" && !kategoriUygunMu(d, "puanli");
}

export function AdminDegerlendirmelerView({ baslik = "Değerlendirmeler", kategori }: { baslik?: string; kategori?: DegerlendirmeKategori } = {}) {
  const { user, kullanici } = useAuth();
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

  const [secilenler, setSecilenler] = useState<Set<string>>(new Set());
  const [excelIndiriliyor, setExcelIndiriliyor] = useState(false);
  const [excelIlerleme, setExcelIlerleme] = useState<{ tamamlanan: number; toplam: number } | null>(null);

  function toggleSecim(id: string) {
    setSecilenler((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleTumu() {
    setSecilenler((prev) =>
      liste.length > 0 && prev.size === liste.length ? new Set() : new Set(liste.map((d) => d.id))
    );
  }

  async function handleExcelIndir() {
    setExcelIndiriliyor(true);
    try {
      if (secilenler.size > 0) {
        const seciliKayitlar = liste.filter((d) => secilenler.has(d.id));
        const { secilenleriAyriAyriIndir } = await import("@/lib/raporIndir");
        setExcelIlerleme({ tamamlanan: 0, toplam: seciliKayitlar.length });
        await secilenleriAyriAyriIndir(seciliKayitlar, (tamamlanan, toplam) =>
          setExcelIlerleme({ tamamlanan, toplam })
        );
      } else {
        if (liste.length === 0) return;
        const { degerlendirmeListesiExcelIndir } = await import("@/lib/excelExport");
        await degerlendirmeListesiExcelIndir(liste);
      }
    } finally {
      setExcelIndiriliyor(false);
      setExcelIlerleme(null);
    }
  }

  // Kategori sayfalarında (puanlı/yorumlu/puansız) liste ilgili rapor tipine indirgenir
  const hazirla = useCallback((d: Degerlendirme[]): Degerlendirme[] => {
    return d
      .filter((x) => kategoriUygunMu(x, kategori))
      .sort((a, b) => {
        if (devamEdiyorMu(a) && !devamEdiyorMu(b)) return -1;
        if (!devamEdiyorMu(a) && devamEdiyorMu(b)) return 1;
        return (b.olusturmaTarihi?.seconds ?? 0) - (a.olusturmaTarihi?.seconds ?? 0);
      });
  }, [kategori]);

  useEffect(() => {
    Promise.all([getDegerlendirmeler(), getFormlar(), getPersoneller(), getMagazalar()]).then(
      ([d, f, p, m]) => {
        setListe(hazirla(d));
        setFormlar(f);
        setPersoneller(p);
        setMagazalar(m);
        setLoading(false);
      }
    );
  }, [hazirla]);

  async function applyFilter() {
    setLoading(true);
    setSecilenler(new Set());
    const filters: Parameters<typeof getDegerlendirmeler>[0] = {};
    if (filtrePersonel) filters.personelId = filtrePersonel;
    else if (filtreMagaza) filters.magazaId = filtreMagaza;
    else if (filtreForm) filters.formId = filtreForm;
    setListe(hazirla(await getDegerlendirmeler(filters)));
    setLoading(false);
  }

  async function clearFilter() {
    setFiltrePersonel("");
    setFiltreForm("");
    setFiltreMagaza("");
    setSecilenler(new Set());
    setLoading(true);
    setListe(hazirla(await getDegerlendirmeler()));
    setLoading(false);
  }

  async function handleSil() {
    if (!silId || !user) return;
    const hedef = liste.find((d) => d.id === silId);
    if (!hedef) { setSilId(null); return; }
    setSiliyor(true);
    await softDeleteDegerlendirme(hedef, {
      id: user.uid,
      ad: kullanici?.displayName ?? user.displayName ?? "",
    });
    setListe((prev) => prev.filter((d) => d.id !== silId));
    setSecilenler((prev) => {
      if (!prev.has(silId)) return prev;
      const next = new Set(prev);
      next.delete(silId);
      return next;
    });
    setSilId(null);
    setSiliyor(false);
  }

  const hasFilter = filtrePersonel || filtreForm || filtreMagaza;
  const acikSayisi = liste.filter(devamEdiyorMu).length;

  const columns: DataColumn<Degerlendirme>[] = [
    {
      key: "sec",
      header: (
        <input
          type="checkbox"
          title="Listedeki tüm kayıtları seç"
          checked={liste.length > 0 && secilenler.size === liste.length}
          onChange={toggleTumu}
          className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
        />
      ),
      width: "36px",
      align: "center",
      cell: (d) => (
        <input
          type="checkbox"
          checked={secilenler.has(d.id)}
          onChange={() => toggleSecim(d.id)}
          className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
        />
      ),
    },
    // Durum sütunu yalnızca açık/tamamlandı ayrımının anlamlı olduğu kategorilerde
    // (yorumlu puanlı, puansız) gösterilir; Tümü ve Puanlı sayfalarında gizli.
    ...(kategori !== "yorumlu" && kategori !== "puansiz" ? [] : [{
      key: "durum",
      header: "Durum" as React.ReactNode,
      width: "140px",
      sortValue: (d: Degerlendirme) => (devamEdiyorMu(d) ? 1 : 0),
      cell: (d: Degerlendirme) =>
        devamEdiyorMu(d) ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
            Devam Ediyor
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full whitespace-nowrap">
            <CheckCircle2 size={11} />
            Tamamlandı
          </span>
        ),
    }]),
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
      header: "Kamera Gözlem",
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
        return <span className="text-sm font-semibold text-slate-800">{d.toplamPuan}</span>;
      },
    },
    {
      key: "aksiyonlar",
      header: "",
      align: "right",
      width: "160px",
      cell: (d) => (
        <div className="flex items-center justify-end gap-1">
          {devamEdiyorMu(d) ? (
            <>
              <Link
                href={`/degerlendirmeler/${d.id}`}
                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors inline-flex"
                title="Ara Raporu Gör"
              >
                <Eye size={14} />
              </Link>
              <Link
                href={`/degerlendirmeler/yeni?devam=${d.id}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors whitespace-nowrap"
              >
                <Play size={9} fill="currentColor" /> Devam Et
              </Link>
            </>
          ) : (
            <>
              <Link
                href={`/degerlendirmeler/${d.id}`}
                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors inline-flex"
                title="Raporu Görüntüle"
              >
                <Eye size={14} />
              </Link>
              <Link
                // Puanlı matris raporunda "düzenle", raporun ilk açıldığı matris
                // ekranını (devam modu) açar; diğer tipler ayrı düzenleme sayfasını kullanır.
                href={kategoriUygunMu(d, "puanli")
                  ? `/degerlendirmeler/yeni?devam=${d.id}`
                  : `/degerlendirmeler/${d.id}/duzenle`}
                className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors inline-flex"
                title="Düzenle"
              >
                <Pencil size={14} />
              </Link>
            </>
          )}
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
        {formlar.filter((f) => kategoriUygunMu(f, kategori)).map((f) => (
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
          <h1 className="text-xl font-bold text-slate-900">{baslik}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{liste.length} kayıt</p>
        </div>
        <div className="flex items-center gap-3">
          {acikSayisi > 0 && (
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
              {acikSayisi} devam eden rapor
            </div>
          )}
          {secilenler.size > 0 && (
            <button
              onClick={() => setSecilenler(new Set())}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-full hover:bg-indigo-100 transition-colors"
            >
              {secilenler.size} seçili <X size={12} />
            </button>
          )}
          <button
            onClick={handleExcelIndir}
            disabled={liste.length === 0 || excelIndiriliyor}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-60"
          >
            <FileSpreadsheet size={15} />
            {excelIlerleme
              ? `İndiriliyor... (${excelIlerleme.tamamlanan}/${excelIlerleme.toplam})`
              : secilenler.size > 0
              ? `Seçilenlerin Raporunu İndir (${secilenler.size} dosya)`
              : `Excel İndir (${liste.length})`}
          </button>
        </div>
      </div>
      {secilenler.size > 1 && (
        <p className="text-xs text-slate-400 -mt-3">
          Seçili {secilenler.size} kayıt için ayrı ayrı {secilenler.size} dosya inecek. Tarayıcınız
          birden fazla dosya indirmek için izin isteyebilir, "İzin Ver"i seçin.
        </p>
      )}

      <DataTable
        data={liste}
        columns={columns}
        rowKey={(d) => d.id}
        loading={loading}
        searchPlaceholder="Personel, kamera gözlem veya form ara..."
        emptyIcon={ClipboardList}
        emptyTitle="Değerlendirme bulunamadı"
        emptyDescription="Yeni raporlar Panelim sayfasında mağaza seçilip personel üzerinden başlatılır."
        defaultPageSize={25}
        toolbar={filterToolbar}
      />

      <Modal open={!!silId} onClose={() => setSilId(null)} title="Değerlendirmeyi Sil" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Bu değerlendirme çöp kutusuna taşınacak. 30 gün boyunca çöp kutusundan geri
            getirilebilir, süre dolunca kalıcı olarak silinir.
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
