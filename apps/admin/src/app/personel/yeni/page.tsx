"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createPersonel } from "@/lib/firestore";

export default function YeniPersonelPage() {
  const router = useRouter();
  const [ad, setAd] = useState("");
  const [tc, setTc] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ad.trim()) { setError("Ad Soyad boş bırakılamaz."); return; }
    if (tc.trim() && tc.trim().length !== 11) { setError("TC Kimlik No 11 haneli olmalıdır."); return; }
    setSaving(true);
    await createPersonel({ ad: ad.trim(), tc: tc.trim() });
    router.push("/personel");
  }

  return (
    <div className="w-full">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/personel" className="text-sm text-slate-500 hover:text-slate-700">Personel</Link>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-semibold text-slate-800">Yeni Personel</span>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <h1 className="text-lg font-bold text-slate-900 mb-5">Yeni Personel</h1>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Ad Soyad</label>
            <input
              value={ad}
              onChange={(e) => { setAd(e.target.value); setError(""); }}
              placeholder="ör. Ahmet Yılmaz"
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">TC Kimlik No <span className="text-slate-400 font-normal">(isteğe bağlı)</span></label>
            <input
              value={tc}
              onChange={(e) => setTc(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="ör. 12345678901"
              maxLength={11}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
            <Link href="/personel" className="px-5 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
              İptal
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
