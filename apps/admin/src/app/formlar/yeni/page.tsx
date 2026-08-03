"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check } from "lucide-react";
import BolumSecimListesi from "@/components/degerlendirme/BolumSecimListesi";
import { createForm, getBolumler, getSorular } from "@/lib/firestore";
import type { Bolum, Soru } from "@/types";

export default function YeniFormPage() {
  const router = useRouter();
  const [ad, setAd] = useState("");
  const [aciklama, setAciklama] = useState("");
  const [puanli, setPuanli] = useState(true);
  const [bolumler, setBolumler] = useState<Bolum[]>([]);
  const [sorularById, setSorularById] = useState<Record<string, Soru>>({});
  const [seciliIds, setSeciliIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([getBolumler(), getSorular()]).then(([b, sorular]) => {
      setBolumler(b);
      const map: Record<string, Soru> = {};
      sorular.forEach((s) => { map[s.id] = s; });
      setSorularById(map);
    });
  }, []);

  function toggleBolum(id: string) {
    setSeciliIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ad.trim()) { setError("Form adı boş bırakılamaz."); return; }
    setSaving(true);
    try {
      await createForm({ ad: ad.trim(), aciklama: aciklama.trim(), puanli, bolumIdleri: seciliIds });
      router.push("/formlar");
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <div className="w-full">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/formlar" className="text-sm text-slate-500 hover:text-slate-700">Formlar</Link>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-semibold text-slate-800">Yeni Form</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-5">
          <h1 className="text-lg font-bold text-slate-900">Yeni Form</h1>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Form Adı</label>
            <input
              value={ad}
              onChange={(e) => { setAd(e.target.value); setError(""); }}
              placeholder="ör. Mağaza Denetim Formu"
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
          <BolumSecimListesi bolumler={bolumler} sorularById={sorularById} seciliIds={seciliIds}
            formPuanli={puanli} onToggle={toggleBolum} boxed={false} />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-60"
          >
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </button>
          <Link href="/formlar" className="px-5 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
            İptal
          </Link>
        </div>
      </form>
    </div>
  );
}
