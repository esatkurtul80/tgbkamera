"use client";

import { useEffect, useState } from "react";
import { Store, Users, ClipboardList, BarChart2, Eye, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { getDegerlendirmeler, getMagaza, getPersonellerByMagaza } from "@/lib/firestore";
import DataTable, { type DataColumn } from "@/components/ui/DataTable";
import Badge from "@/components/ui/Badge";
import type { Degerlendirme, Personel, Magaza } from "@/types";

interface PersonelSatir {
  personel: Personel;
  buAyIzlenme: number;
  toplamIzlenme: number;
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

export default function MagazaSorumlusuPaneliPage() {
  const { kullanici } = useAuth();
  const [magaza, setMagaza] = useState<Magaza | null>(null);
  const [personelSatirlar, setPersonelSatirlar] = useState<PersonelSatir[]>([]);
  const [sonDeg, setSonDeg] = useState<Degerlendirme[]>([]);
  const [stats, setStats] = useState({ personelSayisi: 0, buAyDeg: 0, toplamDeg: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!kullanici?.magazaId) return;

    async function load() {
      const magazaId = kullanici!.magazaId!;
      const [magazaData, personeller, degerlendirmeler] = await Promise.all([
        getMagaza(magazaId),
        getPersonellerByMagaza(magazaId),
        getDegerlendirmeler({ magazaId }),
      ]);

      setMagaza(magazaData);

      const now = new Date();
      const ayBaslangic = new Date(now.getFullYear(), now.getMonth(), 1);

      const buAyDeg = degerlendirmeler.filter((d) => {
        const t = d.izlenmeTarihi?.toDate?.();
        return t && t >= ayBaslangic;
      });

      setStats({
        personelSayisi: personeller.length,
        buAyDeg: buAyDeg.length,
        toplamDeg: degerlendirmeler.length,
      });

      // Personel başına izlenme sayısı
      const satirlar: PersonelSatir[] = personeller.map((p) => {
        const pDeg = degerlendirmeler.filter((d) => d.personelId === p.id);
        const pDegBuAy = pDeg.filter((d) => {
          const t = d.izlenmeTarihi?.toDate?.();
          return t && t >= ayBaslangic;
        });
        const sonDegData = pDeg[0];
        return {
          personel: p,
          buAyIzlenme: pDegBuAy.length,
          toplamIzlenme: pDeg.length,
          sonTarih: sonDegData?.izlenmeTarihi?.toDate?.().toLocaleDateString("tr-TR") ?? null,
        };
      });

      setPersonelSatirlar(satirlar.sort((a, b) => b.buAyIzlenme - a.buAyIzlenme));
      setSonDeg(degerlendirmeler.slice(0, 10));
      setLoading(false);
    }
    load();
  }, [kullanici]);

  const personelColumns: DataColumn<PersonelSatir>[] = [
    {
      key: "personel",
      header: "Personel",
      searchValue: (s) => s.personel.ad,
      sortValue: (s) => s.personel.ad,
      cell: (s) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-indigo-600">{s.personel.ad.charAt(0).toUpperCase()}</span>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-800">{s.personel.ad}</p>
          </div>
        </div>
      ),
    },
    {
      key: "buAyIzlenme",
      header: "Bu Ay İzlenme",
      align: "center",
      width: "130px",
      sortValue: (s) => s.buAyIzlenme,
      cell: (s) => (
        <span className={`inline-flex items-center justify-center px-2.5 py-0.5 text-xs font-semibold rounded-full ${
          s.buAyIzlenme === 0 ? "bg-slate-100 text-slate-400" :
          s.buAyIzlenme >= 5 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
        }`}>
          {s.buAyIzlenme}
        </span>
      ),
    },
    {
      key: "toplamIzlenme",
      header: "Toplam",
      align: "center",
      width: "90px",
      sortValue: (s) => s.toplamIzlenme,
      cell: (s) => <span className="text-sm text-slate-500 tabular-nums">{s.toplamIzlenme}</span>,
    },
    {
      key: "sonTarih",
      header: "Son İzlenme",
      align: "right",
      width: "130px",
      cell: (s) => <span className="text-sm text-slate-400">{s.sonTarih ?? <span className="text-slate-300">—</span>}</span>,
    },
    {
      key: "izlenme",
      header: "Aylık",
      align: "center",
      width: "140px",
      cell: (s) => {
        const hedef = 4;
        const yuzde = Math.min(100, Math.round((s.buAyIzlenme / hedef) * 100));
        return (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${
                yuzde >= 100 ? "bg-emerald-500" : yuzde >= 50 ? "bg-amber-400" : "bg-slate-300"
              }`} style={{ width: `${yuzde}%` }} />
            </div>
            <Link href={`/raporlar/aylik-izlenme?personelId=${s.personel.id}`}
              className="p-1 text-slate-400 hover:text-indigo-600 transition-colors" title="Detay Rapor">
              <BarChart2 size={13} />
            </Link>
          </div>
        );
      },
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
      key: "form",
      header: "Form",
      searchValue: (d) => d.formAd,
      cell: (d) => <span className="text-sm text-slate-500">{d.formAd}</span>,
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
      width: "90px",
      sortValue: (d) => d.toplamPuan ?? -1,
      cell: (d) => {
        if (!d.puanli || d.toplamPuan === null) return <span className="text-slate-300 text-xs">—</span>;
        const yuzde = d.maxPuan && d.maxPuan > 0 ? Math.round((d.toplamPuan / d.maxPuan) * 100) : null;
        return yuzde !== null ? (
          <span className={`text-xs font-bold ${yuzde >= 80 ? "text-emerald-600" : yuzde >= 50 ? "text-amber-500" : "text-red-500"}`}>%{yuzde}</span>
        ) : <span className="text-sm text-slate-500">{d.toplamPuan}p</span>;
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

  if (loading && !kullanici?.magazaId) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Store size={32} className="text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Hesabınıza mağaza atanmamış.</p>
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
            <Store size={18} className="text-teal-600" />
            <h1 className="text-xl font-bold text-slate-900">{magaza?.ad ?? "Mağaza Paneli"}</h1>
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
          <StatKart icon={Users} title="Toplam Personel" value={stats.personelSayisi} sub="bu mağazada" renk="bg-indigo-500" />
          <StatKart icon={ClipboardList} title="Bu Ay Değerlendirme" value={stats.buAyDeg} renk="bg-blue-500" />
          <StatKart icon={TrendingUp} title="Toplam Değerlendirme" value={stats.toplamDeg} renk="bg-teal-500" />
        </div>
      )}

      {/* Personel izlenme tablosu */}
      <div>
        <h2 className="text-base font-semibold text-slate-800 mb-3">Personel İzlenme Durumu</h2>
        <DataTable
          data={personelSatirlar}
          columns={personelColumns}
          rowKey={(s) => s.personel.id}
          loading={loading}
          searchPlaceholder="Personel ara..."
          emptyIcon={Users}
          emptyTitle="Bu mağazada personel yok"
          emptyDescription="Personel sayfasından personel ekleyebilirsiniz."
          defaultPageSize={15}
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
          searchPlaceholder="Personel veya form ara..."
          emptyIcon={ClipboardList}
          emptyTitle="Henüz değerlendirme yok"
          defaultPageSize={10}
        />
      </div>
    </div>
  );
}
