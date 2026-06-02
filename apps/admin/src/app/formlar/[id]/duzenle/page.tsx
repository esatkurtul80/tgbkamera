"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Check } from "lucide-react";
import { getForm, updateForm, getBolumler } from "@/lib/firestore";
import type { Bolum } from "@/types";

export default function FormDuzenlePage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [ad, setAd] = useState("");
  const [aciklama, setAciklama] = useState("");
  const [puanli, setPuanli] = useState(true);
  const [bolumler, setBolumler] = useState<Bolum[]>([]);
  const [seciliIds, setSeciliIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([getForm(id), getBolumler()]).then(([form, tumBolumler]) => {
      if (form) { setAd(form.ad); setAciklama(form.aciklama); setPuanli(form.puanli); setSeciliIds(form.bolumIdleri); }
      setBolumler(tumBolumler);
      setLoading(false);
    });
  }, [id]);

  function toggleBolum(bolumId: string) {
    setSeciliIds((prev) =>
      prev.includes(bolumId) ? prev.filter((x) => x !== bolumId) : [...prev, bolumId],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ad.trim()) { setError("Form adı boş bırakılamaz."); return; }
    setSaving(true);
    await updateForm(id, { ad: ad.trim(), aciklama: aciklama.trim(), puanli, bolumIdleri: seciliIds });
    router.push("/formlar");
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/formlar" className="text-sm text-slate-500 hover:text-slate-700">Formlar</Link>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-semibold text-slate-800">Düzenle</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-5">
          <h1 className="text-lg font-bold text-slate-900">Formu Düzenle</h1>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Form Adı</label>
            <input
              value={ad}
              onChange={(e) => { setAd(e.target.value); setError(""); }}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Açıklama <span className="text-slate-400 font-normal">(isteğe bağlı)</span></label>
            <textarea
              value={aciklama}
              onChange={(e) => setAciklama(e.target.value)}
              rows={2}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          <div>
            <p className="block text-sm font-medium text-slate-700 mb-2">Puan Tipi</p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPuanli(true)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${puanli ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
              >
                {puanli && <Check size={13} />} Puanlı
              </button>
              <button
                type="button"
                onClick={() => setPuanli(false)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${!puanli ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
              >
                {!puanli && <Check size={13} />} Puansız
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <h2 className="text-sm font-semibold text-slate-800 mb-4">Bölüm Ata <span className="text-slate-400 font-normal">({seciliIds.length} seçili)</span></h2>
          {bolumler.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">Henüz bölüm yok.</p>
          ) : (
            <div className="divide-y divide-slate-50">
              {bolumler.map((bolum) => {
                const secili = seciliIds.includes(bolum.id);
                return (
                  <button
                    key={bolum.id}
                    type="button"
                    onClick={() => toggleBolum(bolum.id)}
                    className={`flex items-center gap-3 w-full py-3 text-left transition-colors ${secili ? "text-indigo-700" : "text-slate-700"}`}
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${secili ? "bg-indigo-600 border-indigo-600" : "border-slate-300"}`}>
                      {secili && <Check size={12} className="text-white" />}
                    </div>
                    <span className="flex-1 text-sm">{bolum.ad}</span>
                    <span className="text-xs text-slate-400 shrink-0">{bolum.soruIdleri.length} soru</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-60"
          >
            {saving ? "Kaydediliyor..." : "Güncelle"}
          </button>
          <Link href="/formlar" className="px-5 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
            İptal
          </Link>
        </div>
      </form>
    </div>
  );
}
