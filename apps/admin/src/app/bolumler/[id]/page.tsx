"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { getBolum, getSorular } from "@/lib/firestore";
import type { Bolum, Soru } from "@/types";

export default function BolumDetayPage() {
  const { id } = useParams<{ id: string }>();
  const [bolum, setBolum] = useState<Bolum | null>(null);
  const [sorular, setSorular] = useState<Record<string, Soru>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getBolum(id), getSorular()]).then(([b, tumSorular]) => {
      setBolum(b);
      const map: Record<string, Soru> = {};
      tumSorular.forEach((s) => { map[s.id] = s; });
      setSorular(map);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!bolum) return <p className="text-sm text-slate-500">Bölüm bulunamadı.</p>;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/bolumler" className="text-sm text-slate-500 hover:text-slate-700">Bölümler</Link>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-semibold text-slate-800">{bolum.ad}</span>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h1 className="text-lg font-bold text-slate-900">{bolum.ad}</h1>
            {bolum.aciklama && <p className="text-sm text-slate-500 mt-1">{bolum.aciklama}</p>}
          </div>
          <Link
            href={`/bolumler/${bolum.id}/duzenle`}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Pencil size={13} /> Düzenle
          </Link>
        </div>

        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Sorular ({bolum.soruIdleri.length})
        </h2>

        {bolum.soruIdleri.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">Bu bölüme henüz soru atanmamış.</p>
        ) : (
          <div className="divide-y divide-slate-50">
            {bolum.soruIdleri.map((soruId, i) => {
              const soru = sorular[soruId];
              return (
                <div key={soruId} className="flex items-center gap-3 py-3">
                  <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-500 shrink-0">
                    {i + 1}
                  </span>
                  <p className="flex-1 text-sm text-slate-700">{soru?.metin ?? <span className="text-slate-400 italic">Soru bulunamadı</span>}</p>
                  {soru && <span className="text-xs font-semibold text-indigo-600 shrink-0">{soru.puan} puan</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
