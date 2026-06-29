"use client";

import { useEffect, useState } from "react";
import { Users, Store, ClipboardList, Camera, TrendingUp, ArrowUpRight, MapIcon, Eye } from "lucide-react";
import Link from "next/link";
import {
  getPersoneller,
  getMagazalar,
  getBolgeler,
  getKullanicilar,
  getDegerlendirmeler,
} from "@/lib/firestore";
import type { Degerlendirme, Magaza } from "@/types";

interface Stats {
  toplamPersonel: number;
  aktifPersonel: number;
  toplamMagaza: number;
  toplamBolge: number;
  toplamKameraman: number;
  buAyDegerlendirme: number;
  bugunDegerlendirme: number;
  toplamDegerlendirme: number;
}

function StatCard({
  icon: Icon,
  title,
  value,
  sub,
  color,
  href,
}: {
  icon: React.ElementType;
  title: string;
  value: string | number;
  sub?: string;
  color: string;
  href: string;
}) {
  return (
    <Link href={href} className="group bg-white rounded-2xl p-5 border border-slate-100 hover:border-indigo-100 hover:shadow-sm transition-all">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={16} className="text-white" />
        </div>
        <ArrowUpRight size={14} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
      </div>
      <p className="text-3xl font-bold text-slate-900 tracking-tight">{value}</p>
      <p className="text-sm text-slate-500 mt-1">{title}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </Link>
  );
}

function SonDegerlendirmelerTable({ degerlendirmeler, magazaMap }: {
  degerlendirmeler: Degerlendirme[];
  magazaMap: Record<string, string>;
}) {
  if (degerlendirmeler.length === 0) {
    return (
      <div className="text-center py-10 text-slate-400">
        <ClipboardList size={24} className="mx-auto mb-2 opacity-40" />
        <p className="text-sm">Henüz değerlendirme yok</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="pb-2.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Personel</th>
            <th className="pb-2.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Mağaza</th>
            <th className="pb-2.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Form</th>
            <th className="pb-2.5 text-center text-[11px] font-semibold text-slate-400 uppercase tracking-wider w-24">Puan</th>
            <th className="pb-2.5 text-right text-[11px] font-semibold text-slate-400 uppercase tracking-wider w-32">Tarih</th>
            <th className="pb-2.5 w-10" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {degerlendirmeler.map((d) => {
            const yuzde = d.puanli && d.maxPuan && d.maxPuan > 0 && d.toplamPuan !== null
              ? Math.round((d.toplamPuan / d.maxPuan) * 100) : null;
            return (
              <tr key={d.id} className="hover:bg-slate-50/60 transition-colors">
                <td className="py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-indigo-600">{d.personelAd.charAt(0).toUpperCase()}</span>
                    </div>
                    <span className="text-sm font-medium text-slate-800">{d.personelAd}</span>
                  </div>
                </td>
                <td className="py-3 text-sm text-slate-500">
                  {magazaMap[d.magazaId] ?? d.magazaAd ?? <span className="text-slate-300">—</span>}
                </td>
                <td className="py-3 text-sm text-slate-500 max-w-[160px] truncate">{d.formAd}</td>
                <td className="py-3 text-center">
                  {yuzde !== null ? (
                    <div className="flex flex-col items-center gap-0.5">
                      <span className={`text-xs font-bold ${yuzde >= 80 ? "text-emerald-600" : yuzde >= 50 ? "text-amber-500" : "text-red-500"}`}>%{yuzde}</span>
                      <div className="w-14 h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${yuzde >= 80 ? "bg-emerald-500" : yuzde >= 50 ? "bg-amber-400" : "bg-red-400"}`} style={{ width: `${yuzde}%` }} />
                      </div>
                    </div>
                  ) : <span className="text-xs text-slate-300">Puansız</span>}
                </td>
                <td className="py-3 text-right text-sm text-slate-400 whitespace-nowrap">
                  {d.izlenmeTarihi?.toDate?.().toLocaleDateString("tr-TR") ?? "—"}
                </td>
                <td className="py-3 text-right">
                  <Link href={`/degerlendirmeler/${d.id}`}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors inline-flex">
                    <Eye size={14} />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function MagazaOzeti({ degerlendirmeler, magazalar }: { degerlendirmeler: Degerlendirme[]; magazalar: Magaza[] }) {
  const sayilar: Record<string, number> = {};
  for (const d of degerlendirmeler) {
    if (d.magazaId) sayilar[d.magazaId] = (sayilar[d.magazaId] ?? 0) + 1;
  }

  const sirali = magazalar
    .map((m) => ({ magaza: m, sayi: sayilar[m.id] ?? 0 }))
    .sort((a, b) => b.sayi - a.sayi)
    .slice(0, 6);

  const maxSayi = sirali[0]?.sayi ?? 1;

  if (sirali.length === 0 || maxSayi === 0) {
    return <p className="text-sm text-slate-400 py-6 text-center">Henüz değerlendirme yok</p>;
  }

  return (
    <div className="space-y-3">
      {sirali.map(({ magaza, sayi }) => (
        <div key={magaza.id} className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
            <Store size={13} className="text-teal-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-medium text-slate-700 truncate">{magaza.ad}</p>
              <span className="text-xs font-semibold text-slate-500 ml-2 shrink-0">{sayi}</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-teal-500 transition-all" style={{ width: `${(sayi / maxSayi) * 100}%` }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [sonDeg, setSonDeg] = useState<Degerlendirme[]>([]);
  const [magazalar, setMagazalar] = useState<Magaza[]>([]);
  const [tumDeg, setTumDeg] = useState<Degerlendirme[]>([]);
  const [magazaMap, setMagazaMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const [personeller, magazalarData, bolgeler, kullanicilar, degerlendirmeler] = await Promise.all([
        getPersoneller(), getMagazalar(), getBolgeler(), getKullanicilar(), getDegerlendirmeler(),
      ]);

      const now = new Date();
      const buAyBaslangic = new Date(now.getFullYear(), now.getMonth(), 1);
      const bugunBaslangic = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const buAy = degerlendirmeler.filter((d) => {
        const t = d.izlenmeTarihi?.toDate?.();
        return t && t >= buAyBaslangic;
      });
      const bugun = degerlendirmeler.filter((d) => {
        const t = d.izlenmeTarihi?.toDate?.();
        return t && t >= bugunBaslangic;
      });

      setStats({
        toplamPersonel: personeller.length,
        aktifPersonel: personeller.filter((p) => p.aktif).length,
        toplamMagaza: magazalarData.length,
        toplamBolge: bolgeler.length,
        toplamKameraman: kullanicilar.filter((k) => k.rol === "kameraman").length,
        buAyDegerlendirme: buAy.length,
        bugunDegerlendirme: bugun.length,
        toplamDegerlendirme: degerlendirmeler.length,
      });

      const map: Record<string, string> = {};
      magazalarData.forEach((m) => { map[m.id] = m.ad; });
      setMagazaMap(map);
      setMagazalar(magazalarData);
      setTumDeg(degerlendirmeler);
      setSonDeg(degerlendirmeler.slice(0, 8));
      setLoading(false);
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-5 w-full">
        <div className="w-32 h-7 bg-slate-100 rounded animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-5 border border-slate-100 h-28 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {new Date().toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <Link href="/degerlendirmeler/yeni"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
          <ClipboardList size={15} /> Yeni Değerlendirme
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} title="Personel" value={stats?.toplamPersonel ?? 0} sub={`${stats?.aktifPersonel} aktif`} color="bg-indigo-500" href="/personel" />
        <StatCard icon={Store} title="Mağazalar" value={stats?.toplamMagaza ?? 0} sub={`${stats?.toplamBolge} bölge`} color="bg-teal-500" href="/magazalar" />
        <StatCard icon={ClipboardList} title="Bu Ay Değerlendirme" value={stats?.buAyDegerlendirme ?? 0} sub={`${stats?.bugunDegerlendirme} bugün`} color="bg-blue-500" href="/degerlendirmeler" />
        <StatCard icon={Camera} title="Kameramanlar" value={stats?.toplamKameraman ?? 0} sub={`${stats?.toplamDegerlendirme} toplam rapor`} color="bg-violet-500" href="/kullanicilar" />
      </div>

      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-12 lg:col-span-8 bg-white rounded-2xl p-5 border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp size={15} className="text-slate-400" />
              <span className="text-sm font-semibold text-slate-800">Son Değerlendirmeler</span>
            </div>
            <Link href="/degerlendirmeler" className="text-xs text-indigo-600 font-semibold hover:underline">Tümünü Gör →</Link>
          </div>
          <SonDegerlendirmelerTable degerlendirmeler={sonDeg} magazaMap={magazaMap} />
        </div>

        <div className="col-span-12 lg:col-span-4 bg-white rounded-2xl p-5 border border-slate-100">
          <div className="flex items-center gap-2 mb-4">
            <MapIcon size={15} className="text-slate-400" />
            <span className="text-sm font-semibold text-slate-800">Mağaza Başına Rapor</span>
          </div>
          <MagazaOzeti degerlendirmeler={tumDeg} magazalar={magazalar} />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Bölgeler", href: "/bolgeler", icon: MapIcon, color: "text-blue-600 bg-blue-50" },
          { label: "Formlar", href: "/formlar", icon: ClipboardList, color: "text-indigo-600 bg-indigo-50" },
          { label: "Kullanıcılar", href: "/kullanicilar", icon: Users, color: "text-violet-600 bg-violet-50" },
          { label: "Raporlar", href: "/degerlendirmeler", icon: TrendingUp, color: "text-emerald-600 bg-emerald-50" },
        ].map((item) => (
          <Link key={item.href} href={item.href}
            className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all group">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.color}`}>
              <item.icon size={15} />
            </div>
            <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">{item.label}</span>
            <ArrowUpRight size={13} className="text-slate-300 group-hover:text-slate-500 ml-auto" />
          </Link>
        ))}
      </div>
    </div>
  );
}
