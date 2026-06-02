"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Pencil } from "lucide-react";
import Badge from "@/components/ui/Badge";
import { getForm, getBolumler, getSorular } from "@/lib/firestore";
import type { Form, Bolum, Soru } from "@/types";

export default function FormDetayPage() {
  const { id } = useParams<{ id: string }>();
  const [form, setForm] = useState<Form | null>(null);
  const [bolumMap, setBolumMap] = useState<Record<string, Bolum>>({});
  const [soruMap, setSoruMap] = useState<Record<string, Soru>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getForm(id), getBolumler(), getSorular()]).then(([f, bolumler, sorular]) => {
      setForm(f);
      const bm: Record<string, Bolum> = {};
      bolumler.forEach((b) => { bm[b.id] = b; });
      setBolumMap(bm);
      const sm: Record<string, Soru> = {};
      sorular.forEach((s) => { sm[s.id] = s; });
      setSoruMap(sm);
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

  if (!form) return <p className="text-sm text-slate-500">Form bulunamadı.</p>;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/formlar" className="text-sm text-slate-500 hover:text-slate-700">Formlar</Link>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-semibold text-slate-800">{form.ad}</span>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-6 mb-5">
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900">{form.ad}</h1>
              <Badge variant={form.puanli ? "puanli" : "puansiz"} />
            </div>
            {form.aciklama && <p className="text-sm text-slate-500 mt-1">{form.aciklama}</p>}
          </div>
          <Link
            href={`/formlar/${form.id}/duzenle`}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shrink-0"
          >
            <Pencil size={13} /> Düzenle
          </Link>
        </div>
      </div>

      <div className="space-y-4">
        {form.bolumIdleri.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
            <p className="text-sm text-slate-400">Bu forma henüz bölüm atanmamış.</p>
          </div>
        ) : (
          form.bolumIdleri.map((bolumId, bi) => {
            const bolum = bolumMap[bolumId];
            if (!bolum) return null;
            return (
              <div key={bolumId} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                    {bi + 1}
                  </span>
                  <p className="text-sm font-semibold text-slate-800">{bolum.ad}</p>
                  <span className="ml-auto text-xs text-slate-400">{bolum.soruIdleri.length} soru</span>
                </div>
                <div className="divide-y divide-slate-50">
                  {bolum.soruIdleri.map((soruId, si) => {
                    const soru = soruMap[soruId];
                    return (
                      <div key={soruId} className="flex items-center gap-3 px-5 py-3">
                        <span className="text-xs text-slate-400 w-5 shrink-0">{si + 1}.</span>
                        <p className="flex-1 text-sm text-slate-700">{soru?.metin ?? <span className="italic text-slate-400">Soru bulunamadı</span>}</p>
                        {soru && form.puanli && (
                          <span className="text-xs font-semibold text-indigo-600 shrink-0">{soru.puan} puan</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
