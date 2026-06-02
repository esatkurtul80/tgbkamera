"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Check } from "lucide-react";
import { getBolum, updateBolum, getSorular } from "@/lib/firestore";
import type { Soru } from "@/types";

export default function BolumDuzenlePage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [ad, setAd] = useState("");
  const [aciklama, setAciklama] = useState("");
  const [sorular, setSorular] = useState<Soru[]>([]);
  const [seciliIds, setSeciliIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([getBolum(id), getSorular()]).then(([bolum, tumSorular]) => {
      if (bolum) { setAd(bolum.ad); setAciklama(bolum.aciklama); setSeciliIds(bolum.soruIdleri); }
      setSorular(tumSorular);
      setLoading(false);
    });
  }, [id]);

  function toggleSoru(soruId: string) {
    setSeciliIds((prev) =>
      prev.includes(soruId) ? prev.filter((x) => x !== soruId) : [...prev, soruId],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ad.trim()) { setError("Bölüm adı boş bırakılamaz."); return; }
    setSaving(true);
    await updateBolum(id, { ad: ad.trim(), aciklama: aciklama.trim(), soruIdleri: seciliIds });
    router.push("/bolumler");
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
        <Link href="/bolumler" className="text-sm text-slate-500 hover:text-slate-700">Bölümler</Link>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-semibold text-slate-800">Düzenle</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-5">
          <h1 className="text-lg font-bold text-slate-900">Bölümü Düzenle</h1>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Bölüm Adı</label>
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
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <h2 className="text-sm font-semibold text-slate-800 mb-4">Soru Ata <span className="text-slate-400 font-normal">({seciliIds.length} seçili)</span></h2>
          {sorular.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">Henüz soru yok.</p>
          ) : (
            <div className="divide-y divide-slate-50">
              {sorular.map((soru) => {
                const secili = seciliIds.includes(soru.id);
                return (
                  <button
                    key={soru.id}
                    type="button"
                    onClick={() => toggleSoru(soru.id)}
                    className={`flex items-center gap-3 w-full py-3 text-left transition-colors ${secili ? "text-indigo-700" : "text-slate-700"}`}
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${secili ? "bg-indigo-600 border-indigo-600" : "border-slate-300"}`}>
                      {secili && <Check size={12} className="text-white" />}
                    </div>
                    <span className="flex-1 text-sm">{soru.metin}</span>
                    <span className="text-xs font-semibold text-slate-400 shrink-0">{soru.puan} puan</span>
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
          <Link href="/bolumler" className="px-5 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
            İptal
          </Link>
        </div>
      </form>
    </div>
  );
}
