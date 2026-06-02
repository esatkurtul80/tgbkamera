"use client";

import { useEffect, useState } from "react";
import { Users, Pencil, Search, Plus } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import { getPersoneller, createPersonel, getPersonel, updatePersonel } from "@/lib/firestore";
import type { Personel } from "@/types";

export default function PersonelPage() {
  const [personeller, setPersoneller] = useState<Personel[]>([]);
  const [loading, setLoading] = useState(true);
  const [ara, setAra] = useState("");

  // Yeni personel modal
  const [yeniAcik, setYeniAcik] = useState(false);
  const [yeniAd, setYeniAd] = useState("");
  const [yeniUnvan, setYeniUnvan] = useState("");
  const [yeniDepartman, setYeniDepartman] = useState("");
  const [yeniSaving, setYeniSaving] = useState(false);
  const [yeniError, setYeniError] = useState("");

  // Düzenle modal
  const [editId, setEditId] = useState<string | null>(null);
  const [editAd, setEditAd] = useState("");
  const [editUnvan, setEditUnvan] = useState("");
  const [editDepartman, setEditDepartman] = useState("");
  const [editAktif, setEditAktif] = useState(true);
  const [editLoading, setEditLoading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  async function load() {
    setLoading(true);
    setPersoneller(await getPersoneller());
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function openYeni() {
    setYeniAd(""); setYeniUnvan(""); setYeniDepartman(""); setYeniError("");
    setYeniAcik(true);
  }

  async function handleYeniSave(e: React.FormEvent) {
    e.preventDefault();
    if (!yeniAd.trim()) { setYeniError("Ad Soyad boş bırakılamaz."); return; }
    setYeniSaving(true);
    await createPersonel({ ad: yeniAd.trim(), unvan: yeniUnvan.trim(), departman: yeniDepartman.trim() });
    setYeniSaving(false);
    setYeniAcik(false);
    load();
  }

  async function openEdit(id: string) {
    setEditId(id);
    setEditLoading(true);
    setEditError("");
    const p = await getPersonel(id);
    if (p) { setEditAd(p.ad); setEditUnvan(p.unvan); setEditDepartman(p.departman); setEditAktif(p.aktif); }
    setEditLoading(false);
  }

  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editId || !editAd.trim()) { setEditError("Ad Soyad boş bırakılamaz."); return; }
    setEditSaving(true);
    await updatePersonel(editId, { ad: editAd.trim(), unvan: editUnvan.trim(), departman: editDepartman.trim(), aktif: editAktif });
    setEditSaving(false);
    setEditId(null);
    load();
  }

  const filtrelenmis = personeller.filter((p) =>
    p.ad.toLowerCase().includes(ara.toLowerCase()) ||
    p.unvan?.toLowerCase().includes(ara.toLowerCase()) ||
    p.departman?.toLowerCase().includes(ara.toLowerCase())
  );

  const aktifSayisi = personeller.filter((p) => p.aktif).length;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Personel</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {personeller.length} personel
            {aktifSayisi < personeller.length && <span className="ml-2 text-slate-400">· {aktifSayisi} aktif</span>}
          </p>
        </div>
        <button onClick={openYeni} className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
          <Plus size={15} /> Yeni Personel
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Ad, unvan veya departman ara..." value={ara} onChange={(e) => setAra(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50" />
          </div>
          {ara && <span className="text-xs text-slate-400">{filtrelenmis.length} sonuç</span>}
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : filtrelenmis.length === 0 ? (
          <EmptyState icon={Users} title={ara ? "Eşleşen personel bulunamadı" : "Henüz personel yok"} description={ara ? "Arama teriminizi değiştirin." : "İlk personeli eklemek için sağ üstteki butona tıklayın."} />
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80">
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider w-10">#</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Personel</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Unvan</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Departman / Mağaza</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold text-slate-400 uppercase tracking-wider w-24">Durum</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold text-slate-400 uppercase tracking-wider w-20">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtrelenmis.map((p, i) => (
                <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3.5 text-sm text-slate-400 tabular-nums">{i + 1}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-indigo-600">{p.ad.charAt(0).toUpperCase()}</span>
                      </div>
                      <span className="text-sm font-medium text-slate-800">{p.ad}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-slate-500">{p.unvan || <span className="text-slate-300">—</span>}</td>
                  <td className="px-4 py-3.5 text-sm text-slate-500">{p.departman || <span className="text-slate-300">—</span>}</td>
                  <td className="px-4 py-3.5 text-center"><Badge variant={p.aktif ? "aktif" : "pasif"} /></td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-end">
                      <button onClick={() => openEdit(p.id)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Düzenle">
                        <Pencil size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && filtrelenmis.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50">
            <p className="text-xs text-slate-400">{filtrelenmis.length} personel listeleniyor</p>
          </div>
        )}
      </div>

      {/* Yeni Personel Modal */}
      <Modal open={yeniAcik} onClose={() => setYeniAcik(false)} title="Yeni Personel">
        <form onSubmit={handleYeniSave} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Ad Soyad</label>
            <input value={yeniAd} onChange={(e) => { setYeniAd(e.target.value); setYeniError(""); }} placeholder="ör. Ahmet Yılmaz" autoFocus
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            {yeniError && <p className="text-xs text-red-500 mt-1">{yeniError}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Unvan <span className="text-slate-400 font-normal">(isteğe bağlı)</span></label>
            <input value={yeniUnvan} onChange={(e) => setYeniUnvan(e.target.value)} placeholder="ör. Mağaza Müdürü"
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Departman / Mağaza <span className="text-slate-400 font-normal">(isteğe bağlı)</span></label>
            <input value={yeniDepartman} onChange={(e) => setYeniDepartman(e.target.value)} placeholder="ör. Satış"
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={yeniSaving} className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors">
              {yeniSaving ? "Kaydediliyor..." : "Kaydet"}
            </button>
            <button type="button" onClick={() => setYeniAcik(false)} className="px-5 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
              İptal
            </button>
          </div>
        </form>
      </Modal>

      {/* Düzenle Modal */}
      <Modal open={!!editId} onClose={() => setEditId(null)} title="Personeli Düzenle">
        {editLoading ? (
          <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <form onSubmit={handleEditSave} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Ad Soyad</label>
              <input value={editAd} onChange={(e) => { setEditAd(e.target.value); setEditError(""); }} autoFocus
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              {editError && <p className="text-xs text-red-500 mt-1">{editError}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Unvan <span className="text-slate-400 font-normal">(isteğe bağlı)</span></label>
              <input value={editUnvan} onChange={(e) => setEditUnvan(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Departman / Mağaza <span className="text-slate-400 font-normal">(isteğe bağlı)</span></label>
              <input value={editDepartman} onChange={(e) => setEditDepartman(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">Durum</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setEditAktif(true)}
                  className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${editAktif ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                  Aktif
                </button>
                <button type="button" onClick={() => setEditAktif(false)}
                  className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${!editAktif ? "border-red-400 bg-red-50 text-red-600" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                  Pasif
                </button>
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={editSaving} className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors">
                {editSaving ? "Kaydediliyor..." : "Güncelle"}
              </button>
              <button type="button" onClick={() => setEditId(null)} className="px-5 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                İptal
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
