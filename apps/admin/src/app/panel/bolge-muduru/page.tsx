"use client";

import { useEffect, useMemo, useState } from "react";
import { MapIcon, Store, Users, ClipboardList, TrendingUp, Eye, FileText, Percent } from "lucide-react";
import Link from "next/link";
import { getDegerlendirmelerByMagazaIds } from "@/lib/firestore";
import { useBmBolge } from "@/hooks/useBmBolge";
import { bolgeOzetHesapla, type BolgeOzet, type MagazaOzet, type PersonelOzet, type FormOzet } from "@/lib/bolgeOzet";
import DataTable, { type DataColumn } from "@/components/ui/DataTable";
import Badge from "@/components/ui/Badge";
import type { Degerlendirme } from "@/types";

function StatKart({ icon: Icon, title, value, sub, renk }: {
  icon: React.ElementType; title: string; value: number | string; sub?: string; renk: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${renk}`}>
        <Icon size={16} className="text-white" />
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-sm text-slate-500 mt-0.5">{title}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function YuzdePill({ yuzde }: { yuzde: number | null }) {
  if (yuzde === null) return <span className="text-slate-300 text-xs">—</span>;
  const stil =
    yuzde >= 80 ? "bg-emerald-100 text-emerald-700" :
    yuzde >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-600";
  return (
    <span className={`inline-flex items-center justify-center px-2.5 py-0.5 text-xs font-bold rounded-full ${stil}`}>
      %{yuzde}
    </span>
  );
}

export default function BolgeMuduruPaneliPage() {
  const { bolge, magazalar, loading: bolgeLoading, bolgeYok } = useBmBolge();
  const [raporlar, setRaporlar] = useState<Degerlendirme[]>([]);
  const [loading, setLoading] = useState(true);
  const [formSekme, setFormSekme] = useState<"puanli" | "puansiz">("puanli");

  useEffect(() => {
    if (bolgeLoading || bolgeYok) return;
    let iptal = false;
    (async () => {
      const r = await getDegerlendirmelerByMagazaIds(magazalar.map((m) => m.id));
      if (!iptal) {
        setRaporlar(r);
        setLoading(false);
      }
    })();
    return () => { iptal = true; };
  }, [bolgeLoading, bolgeYok, magazalar]);

  const ozet: BolgeOzet = useMemo(() => bolgeOzetHesapla(magazalar, raporlar), [magazalar, raporlar]);
  const sonDeg = useMemo(() => raporlar.slice(0, 10), [raporlar]);

  const magazaColumns: DataColumn<MagazaOzet>[] = [
    {
      key: "magaza",
      header: "Mağaza",
      searchValue: (s) => s.magaza.ad + " " + (s.magaza.adres ?? ""),
      sortValue: (s) => s.magaza.ad,
      cell: (s) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
            <Store size={14} className="text-teal-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-800">{s.magaza.ad}</p>
            {s.magaza.adres && <p className="text-xs text-slate-400 truncate max-w-40">{s.magaza.adres}</p>}
          </div>
        </div>
      ),
    },
    {
      key: "toplamRapor",
      header: "Rapor",
      align: "center",
      width: "80px",
      sortValue: (s) => s.toplamRapor,
      cell: (s) => <span className="text-sm text-slate-600 font-medium">{s.toplamRapor}</span>,
    },
    {
      key: "ortalama",
      header: "Puanlı Ort.",
      align: "center",
      width: "110px",
      sortValue: (s) => s.puanliOrtalama ?? -1,
      cell: (s) => <YuzdePill yuzde={s.puanliOrtalama} />,
    },
    {
      key: "puanli",
      header: "Puanlı",
      align: "center",
      width: "80px",
      sortValue: (s) => s.puanliRapor,
      cell: (s) => <span className="text-sm text-slate-500">{s.puanliRapor}</span>,
    },
    {
      key: "puansiz",
      header: "Puansız",
      align: "center",
      width: "80px",
      sortValue: (s) => s.puansizRapor,
      cell: (s) => <span className="text-sm text-slate-500">{s.puansizRapor}</span>,
    },
    {
      key: "sonTarih",
      header: "Son Rapor",
      align: "right",
      width: "120px",
      sortValue: (s) => s.sonTarih?.seconds ?? 0,
      cell: (s) => (
        <span className="text-sm text-slate-400">
          {s.sonTarih?.toDate?.().toLocaleDateString("tr-TR") ?? <span className="text-slate-300">—</span>}
        </span>
      ),
    },
  ];

  const personelColumns: DataColumn<PersonelOzet>[] = [
    {
      key: "personel",
      header: "Personel",
      searchValue: (p) => p.personelAd,
      sortValue: (p) => p.personelAd,
      cell: (p) => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
            <span className="text-[10px] font-bold text-indigo-600">{p.personelAd.charAt(0).toUpperCase()}</span>
          </div>
          <span className="text-sm font-medium text-slate-800">{p.personelAd}</span>
        </div>
      ),
    },
    {
      key: "magazalar",
      header: "Mağaza",
      searchValue: (p) => p.magazaAdlari.join(" "),
      cell: (p) => (
        <div className="flex flex-wrap gap-1">
          {p.magazaAdlari.map((ad) => (
            <span key={ad} className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-teal-50 text-teal-700">
              {ad}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: "ortalama",
      header: "Puanlı Ort.",
      align: "center",
      width: "130px",
      sortValue: (p) => p.puanliOrtalama ?? -1,
      cell: (p) =>
        p.puanliOrtalama !== null ? (
          <div className="flex items-center gap-2 justify-center">
            <YuzdePill yuzde={p.puanliOrtalama} />
            <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  p.puanliOrtalama >= 80 ? "bg-emerald-500" : p.puanliOrtalama >= 50 ? "bg-amber-500" : "bg-red-500"
                }`}
                style={{ width: `${p.puanliOrtalama}%` }}
              />
            </div>
          </div>
        ) : (
          <span className="text-slate-300 text-xs">—</span>
        ),
    },
    {
      key: "puanliRapor",
      header: "Puanlı Rapor",
      align: "center",
      width: "110px",
      sortValue: (p) => p.puanliRapor,
      cell: (p) => <span className="text-sm text-slate-500">{p.puanliRapor}</span>,
    },
    {
      key: "puansizRapor",
      header: "Puansız Rapor",
      align: "center",
      width: "110px",
      sortValue: (p) => p.puansizRapor,
      cell: (p) => <span className="text-sm text-slate-500">{p.puansizRapor}</span>,
    },
  ];

  const puanliFormColumns: DataColumn<FormOzet>[] = [
    {
      key: "form",
      header: "Form",
      searchValue: (f) => f.formAd,
      sortValue: (f) => f.formAd,
      cell: (f) => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
            <FileText size={13} className="text-indigo-600" />
          </div>
          <span className="text-sm font-medium text-slate-800">{f.formAd}</span>
        </div>
      ),
    },
    {
      key: "ortalama",
      header: "Ortalama",
      align: "center",
      width: "110px",
      sortValue: (f) => f.ortalama ?? -1,
      cell: (f) => <YuzdePill yuzde={f.ortalama} />,
    },
    {
      key: "sayi",
      header: "Rapor Sayısı",
      align: "center",
      width: "110px",
      sortValue: (f) => f.raporSayisi,
      cell: (f) => <span className="text-sm text-slate-600 font-medium">{f.raporSayisi}</span>,
    },
  ];

  const puansizFormColumns: DataColumn<FormOzet>[] = [
    puanliFormColumns[0],
    {
      key: "sayi",
      header: "Rapor Sayısı",
      align: "center",
      width: "130px",
      sortValue: (f) => f.raporSayisi,
      cell: (f) => <span className="text-sm text-slate-600 font-medium">{f.raporSayisi}</span>,
    },
  ];

  const degColumns: DataColumn<Degerlendirme>[] = [
    {
      key: "tarih",
      header: "Tarih",
      width: "110px",
      sortValue: (d) => d.olusturmaTarihi?.seconds ?? 0,
      cell: (d) => <span className="text-sm text-slate-500">{d.olusturmaTarihi?.toDate?.().toLocaleDateString("tr-TR") ?? "—"}</span>,
    },
    {
      key: "personel",
      header: "Personel",
      searchValue: (d) => d.personelAd,
      sortValue: (d) => d.personelAd,
      cell: (d) => (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
            <span className="text-[9px] font-bold text-indigo-600">{d.personelAd.charAt(0).toUpperCase()}</span>
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
      cell: (d) => <span className="text-sm text-slate-500">{d.magazaAd ?? <span className="text-slate-300">—</span>}</span>,
    },
    {
      key: "tip",
      header: "Tip",
      align: "center",
      width: "80px",
      cell: (d) => <Badge variant={d.puanli ? "puanli" : "puansiz"} />,
    },
    {
      key: "puan",
      header: "Puan",
      align: "center",
      width: "80px",
      sortValue: (d) => d.toplamPuan ?? -1,
      cell: (d) => {
        if (d.durum === "acik") return <span className="text-[10px] font-bold text-amber-600">DEVAM</span>;
        if (!d.puanli || d.toplamPuan === null) return <span className="text-slate-300 text-xs">—</span>;
        const yuzde = d.maxPuan && d.maxPuan > 0 ? Math.round((d.toplamPuan / d.maxPuan) * 100) : null;
        return yuzde !== null ? (
          <span className={`text-xs font-bold ${yuzde >= 80 ? "text-emerald-600" : yuzde >= 50 ? "text-amber-500" : "text-red-500"}`}>%{yuzde}</span>
        ) : <span className="text-xs text-slate-500">{d.toplamPuan}p</span>;
      },
    },
    {
      key: "rapor",
      header: "",
      align: "right",
      width: "50px",
      cell: (d) => (
        <Link href={`/degerlendirmeler/${d.id}`} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors inline-flex">
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

  const yukleniyor = loading || bolgeLoading;

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Başlık */}
      <div>
        <div className="flex items-center gap-2 mb-0.5">
          <MapIcon size={18} className="text-blue-600" />
          <h1 className="text-xl font-bold text-slate-900">{bolge?.ad ?? "Bölge Paneli"}</h1>
        </div>
        <p className="text-sm text-slate-500">
          {new Date().toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}
          {ozet.acikRapor > 0 && (
            <span className="ml-2 text-xs font-semibold text-amber-600">· {ozet.acikRapor} devam eden rapor</span>
          )}
        </p>
      </div>

      {/* Stats */}
      {yukleniyor ? (
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="bg-white rounded-2xl h-28 border border-slate-100 animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-4">
          <StatKart icon={Store} title="Mağaza" value={magazalar.length} sub="bu bölgede" renk="bg-teal-500" />
          <StatKart icon={ClipboardList} title="Bu Ay Rapor" value={ozet.buAyRapor} renk="bg-blue-500" />
          <StatKart icon={TrendingUp} title="Toplam Rapor" value={ozet.toplamRapor} sub="kapalı raporlar" renk="bg-indigo-500" />
          <StatKart
            icon={Percent}
            title="Bölge Ortalaması"
            value={ozet.bolgeOrtalama !== null ? `%${ozet.bolgeOrtalama}` : "—"}
            sub="puanlı raporlardan"
            renk="bg-violet-500"
          />
        </div>
      )}

      {/* Mağazalar */}
      <div>
        <h2 className="text-base font-semibold text-slate-800 mb-3">Mağazalar</h2>
        <DataTable
          data={ozet.magazalar}
          columns={magazaColumns}
          rowKey={(s) => s.magaza.id}
          loading={yukleniyor}
          searchPlaceholder="Mağaza ara..."
          emptyIcon={Store}
          emptyTitle="Bu bölgede mağaza yok"
          defaultPageSize={10}
        />
      </div>

      {/* Personel puanları */}
      <div>
        <h2 className="text-base font-semibold text-slate-800 mb-3">Personel Puanları</h2>
        <DataTable
          data={ozet.personeller}
          columns={personelColumns}
          rowKey={(p) => p.personelId}
          loading={yukleniyor}
          searchPlaceholder="Personel ara..."
          emptyIcon={Users}
          emptyTitle="Bu bölgede raporlanmış personel yok"
          defaultPageSize={10}
        />
      </div>

      {/* Form türleri: puanlı / puansız */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-slate-800">Form Türleri</h2>
          <div className="flex rounded-lg bg-slate-100 p-0.5">
            <button
              onClick={() => setFormSekme("puanli")}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                formSekme === "puanli" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Puanlı ({ozet.puanliFormlar.length})
            </button>
            <button
              onClick={() => setFormSekme("puansiz")}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                formSekme === "puansiz" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Puansız ({ozet.puansizFormlar.length})
            </button>
          </div>
        </div>
        {formSekme === "puanli" ? (
          <>
            <DataTable
              data={ozet.puanliFormlar}
              columns={puanliFormColumns}
              rowKey={(f) => f.formId}
              loading={yukleniyor}
              searchPlaceholder="Form ara..."
              emptyIcon={FileText}
              emptyTitle="Puanlı form raporu yok"
              defaultPageSize={10}
            />
            <p className="text-[11px] text-slate-400 mt-2">Yorumlu (elle puan girilen) raporlar ortalamaya dahil edilmez.</p>
          </>
        ) : (
          <DataTable
            data={ozet.puansizFormlar}
            columns={puansizFormColumns}
            rowKey={(f) => f.formId}
            loading={yukleniyor}
            searchPlaceholder="Form ara..."
            emptyIcon={FileText}
            emptyTitle="Puansız form raporu yok"
            defaultPageSize={10}
          />
        )}
      </div>

      {/* Son değerlendirmeler */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-slate-800">Son Değerlendirmeler</h2>
          <Link href="/degerlendirmeler" className="text-xs text-indigo-600 font-semibold hover:underline">Tümünü Gör →</Link>
        </div>
        <DataTable
          data={sonDeg}
          columns={degColumns}
          rowKey={(d) => d.id}
          loading={yukleniyor}
          searchPlaceholder="Personel veya mağaza ara..."
          emptyIcon={ClipboardList}
          emptyTitle="Henüz değerlendirme yok"
          defaultPageSize={10}
        />
      </div>
    </div>
  );
}
