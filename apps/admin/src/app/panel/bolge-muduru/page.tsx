"use client";

import { useEffect, useState } from "react";
import { MapIcon, Store, Users, ClipboardList, TrendingUp, Eye, BarChart2 } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { getBolge, getMagazalarByBolge, getDegerlendirmeler } from "@/lib/firestore";
import DataTable, { type DataColumn } from "@/components/ui/DataTable";
import Badge from "@/components/ui/Badge";
import type { Degerlendirme, Magaza, Bolge } from "@/types";

interface MagazaSatir {
  magaza: Magaza;
  buAyDeg: number;
  toplamDeg: number;
  sonTarih: string | null;
}

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

export default function BolgeMuduruPaneliPage() {
  const { kullanici } = useAuth();
  const [bolge, setBolge] = useState<Bolge | null>(null);
  const [magazaSatirlar, setMagazaSatirlar] = useState<MagazaSatir[]>([]);
  const [sonDeg, setSonDeg] = useState<Degerlendirme[]>([]);
  const [stats, setStats] = useState({ magazaSayisi: 0, buAyDeg: 0, toplamDeg: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!kullanici?.bolgeId) return;

    async function load() {
      const bolgeId = kullanici!.bolgeId!;
      const [bolgeData, magazalar] = await Promise.all([
        getBolge(bolgeId),
        getMagazalarByBolge(bolgeId),
      ]);
      setBolge(bolgeData);

      // Her mağaza için değerlendirme verileri
      const degPromises = magazalar.map((m) => getDegerlendirmeler({ magazaId: m.id }));
      const allDegListesi = await Promise.all(degPromises);

      const now = new Date();
      const ayBaslangic = new Date(now.getFullYear(), now.getMonth(), 1);

      let toplamDeg = 0;
      let buAyDeg = 0;
      const tumDeg: Degerlendirme[] = [];

      const satirlar: MagazaSatir[] = magazalar.map((magaza, i) => {
        const degListe = allDegListesi[i];
        const buAy = degListe.filter((d) => {
          const t = d.izlenmeTarihi?.toDate?.();
          return t && t >= ayBaslangic;
        });

        toplamDeg += degListe.length;
        buAyDeg += buAy.length;
        tumDeg.push(...degListe);

        const son = degListe[0];
        return {
          magaza,
          buAyDeg: buAy.length,
          toplamDeg: degListe.length,
          sonTarih: son?.izlenmeTarihi?.toDate?.().toLocaleDateString("tr-TR") ?? null,
        };
      });

      setMagazaSatirlar(satirlar.sort((a, b) => b.buAyDeg - a.buAyDeg));

      // Son değerlendirmeler (tüm mağazalardan karışık, tarih sıralı)
      const siralanmis = tumDeg.sort((a, b) => (b.izlenmeTarihi?.seconds ?? 0) - (a.izlenmeTarihi?.seconds ?? 0));
      setSonDeg(siralanmis.slice(0, 10));

      setStats({ magazaSayisi: magazalar.length, buAyDeg, toplamDeg });
      setLoading(false);
    }
    load();
  }, [kullanici]);

  const magazaColumns: DataColumn<MagazaSatir>[] = [
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
            {s.magaza.adres && <p className="text-xs text-slate-400 truncate max-w-[160px]">{s.magaza.adres}</p>}
          </div>
        </div>
      ),
    },
    {
      key: "buAyDeg",
      header: "Bu Ay",
      align: "center",
      width: "100px",
      sortValue: (s) => s.buAyDeg,
      cell: (s) => (
        <span className={`inline-flex items-center justify-center px-2.5 py-0.5 text-xs font-semibold rounded-full ${
          s.buAyDeg === 0 ? "bg-slate-100 text-slate-400" :
          s.buAyDeg >= 10 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
        }`}>
          {s.buAyDeg}
        </span>
      ),
    },
    {
      key: "toplamDeg",
      header: "Toplam",
      align: "center",
      width: "90px",
      sortValue: (s) => s.toplamDeg,
      cell: (s) => <span className="text-sm text-slate-500">{s.toplamDeg}</span>,
    },
    {
      key: "sonTarih",
      header: "Son İzlenme",
      align: "right",
      width: "130px",
      cell: (s) => <span className="text-sm text-slate-400">{s.sonTarih ?? <span className="text-slate-300">—</span>}</span>,
    },
    {
      key: "grafik",
      header: "Trend",
      align: "center",
      width: "100px",
      cell: (s) => {
        const max = magazaSatirlar[0]?.buAyDeg || 1;
        const yuzde = Math.round((s.buAyDeg / max) * 100);
        return (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-teal-500 rounded-full" style={{ width: `${yuzde}%` }} />
            </div>
          </div>
        );
      },
    },
    {
      key: "detay",
      header: "",
      align: "right",
      width: "50px",
      cell: (s) => (
        <Link href={`/raporlar/aylik-izlenme?magazaId=${s.magaza.id}`}
          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors inline-flex" title="Aylık Rapor">
          <BarChart2 size={14} />
        </Link>
      ),
    },
  ];

  const degColumns: DataColumn<Degerlendirme>[] = [
    {
      key: "tarih",
      header: "Tarih",
      width: "110px",
      sortValue: (d) => d.izlenmeTarihi?.seconds ?? 0,
      cell: (d) => <span className="text-sm text-slate-500">{d.izlenmeTarihi?.toDate?.().toLocaleDateString("tr-TR") ?? "—"}</span>,
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

  if (!kullanici?.bolgeId && !loading) {
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
    <div className="flex flex-col gap-6 w-full">
      {/* Başlık */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <MapIcon size={18} className="text-blue-600" />
            <h1 className="text-xl font-bold text-slate-900">
              {bolge?.ad ?? "Bölge Paneli"}
            </h1>
          </div>
          <p className="text-sm text-slate-500">
            {new Date().toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <Link href="/raporlar/aylik-izlenme"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
          <BarChart2 size={15} /> Aylık Rapor
        </Link>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="bg-white rounded-2xl h-28 border border-slate-100 animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          <StatKart icon={Store} title="Mağaza" value={stats.magazaSayisi} sub="bu bölgede" renk="bg-teal-500" />
          <StatKart icon={ClipboardList} title="Bu Ay Değerlendirme" value={stats.buAyDeg} renk="bg-blue-500" />
          <StatKart icon={TrendingUp} title="Toplam Değerlendirme" value={stats.toplamDeg} renk="bg-indigo-500" />
        </div>
      )}

      {/* Mağaza tablosu */}
      <div>
        <h2 className="text-base font-semibold text-slate-800 mb-3">Mağaza Değerlendirme Özeti</h2>
        <DataTable
          data={magazaSatirlar}
          columns={magazaColumns}
          rowKey={(s) => s.magaza.id}
          loading={loading}
          searchPlaceholder="Mağaza ara..."
          emptyIcon={Store}
          emptyTitle="Bu bölgede mağaza yok"
          defaultPageSize={10}
        />
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
          loading={loading}
          searchPlaceholder="Personel, mağaza veya form ara..."
          emptyIcon={ClipboardList}
          emptyTitle="Henüz değerlendirme yok"
          defaultPageSize={10}
        />
      </div>
    </div>
  );
}
