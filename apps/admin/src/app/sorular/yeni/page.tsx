"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSoru } from "@/lib/firestore";

export default function YeniSoruPage() {
  const router = useRouter();
  const [metin, setMetin] = useState("");
  const [puan, setPuan] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!metin.trim()) { setError("Soru metni boş bırakılamaz."); return; }
    setSaving(true);
    await createSoru({ metin: metin.trim(), puan });
    router.push("/sorular");
  }

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/sorular" className="text-sm text-slate-500 hover:text-slate-700">Sorular</Link>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-semibold text-slate-800">Yeni Soru</span>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <h1 className="text-lg font-bold text-slate-900 mb-5">Yeni Soru</h1>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Soru Metni</label>
            <textarea
              value={metin}
              onChange={(e) => { setMetin(e.target.value); setError(""); }}
              rows={3}
              placeholder="Soru metnini yazın..."
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Puan</label>
            <input
              type="number"
              min={0}
              value={puan}
              onChange={(e) => setPuan(Number(e.target.value))}
              className="w-32 px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-60"
            >
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </button>
            <Link href="/sorular" className="px-5 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
              İptal
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
