"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { getPersonel, updatePersonel } from "@/lib/firestore";

export default function PersonelDuzenlePage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [ad, setAd] = useState("");
  const [unvan, setUnvan] = useState("");
  const [departman, setDepartman] = useState("");
  const [aktif, setAktif] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getPersonel(id).then((p) => {
      if (p) { setAd(p.ad); setUnvan(p.unvan); setDepartman(p.departman); setAktif(p.aktif); }
      setLoading(false);
    });
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ad.trim()) { setError("Ad Soyad boş bırakılamaz."); return; }
    setSaving(true);
    await updatePersonel(id, { ad: ad.trim(), unvan: unvan.trim(), departman: departman.trim(), aktif });
    router.push("/personel");
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/personel" className="text-sm text-slate-500 hover:text-slate-700">Personel</Link>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-semibold text-slate-800">Düzenle</span>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <h1 className="text-lg font-bold text-slate-900 mb-5">Personeli Düzenle</h1>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Ad Soyad</label>
            <input
              value={ad}
              onChange={(e) => { setAd(e.target.value); setError(""); }}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Unvan</label>
            <input
              value={unvan}
              onChange={(e) => setUnvan(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Departman / Mağaza</label>
            <input
              value={departman}
              onChange={(e) => setDepartman(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">Durum</p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setAktif(true)}
                className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${aktif ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
              >
                Aktif
              </button>
              <button
                type="button"
                onClick={() => setAktif(false)}
                className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${!aktif ? "border-red-400 bg-red-50 text-red-600" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
              >
                Pasif
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-60"
            >
              {saving ? "Kaydediliyor..." : "Güncelle"}
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
