"use client";

import { useEffect, useState } from "react";
import { HelpCircle, Pencil, Trash2, Search, Plus } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Modal from "@/components/ui/Modal";
import { getSorular, deleteSoru, createSoru, getSoru, updateSoru } from "@/lib/firestore";
import type { Soru } from "@/types";

export default function SorularPage() {
  const [sorular, setSorular] = useState<Soru[]>([]);
  const [loading, setLoading] = useState(true);
  const [ara, setAra] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Yeni soru modal
  const [yeniAcik, setYeniAcik] = useState(false);
  const [yeniMetin, setYeniMetin] = useState("");
  const [yeniPuan, setYeniPuan] = useState(0);
  const [yeniSaving, setYeniSaving] = useState(false);
  const [yeniError, setYeniError] = useState("");

  // Düzenleme modal
  const [editId, setEditId] = useState<string | null>(null);
  const [editMetin, setEditMetin] = useState("");
  const [editPuan, setEditPuan] = useState(0);
  const [editLoading, setEditLoading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  async function load() {
    setLoading(true);
    setSorular(await getSorular());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openYeni() {
    setYeniMetin(""); setYeniPuan(0); setYeniError("");
    setYeniAcik(true);
  }

  async function handleYeniSave(e: React.FormEvent) {
    e.preventDefault();
    if (!yeniMetin.trim()) { setYeniError("Soru metni boş bırakılamaz."); return; }
    setYeniSaving(true);
    await createSoru({ metin: yeniMetin.trim(), puan: yeniPuan });
    setYeniSaving(false);
    setYeniAcik(false);
    load();
  }

  async function openEdit(id: string) {
    setEditId(id);
    setEditLoading(true);
    setEditError("");
    const s = await getSoru(id);
    if (s) { setEditMetin(s.metin); setEditPuan(s.puan); }
    setEditLoading(false);
  }

  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editId || !editMetin.trim()) { setEditError("Soru metni boş bırakılamaz."); return; }
    setEditSaving(true);
    await updateSoru(editId, { metin: editMetin.trim(), puan: editPuan });
    setEditSaving(false);
    setEditId(null);
    load();
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    await deleteSoru(deleteId);
    setDeleteId(null);
    setDeleting(false);
    load();
  }

  const filtrelenmis = sorular.filter((s) =>
    s.metin.toLowerCase().includes(ara.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Sorular</h1>
          <p className="text-sm text-slate-500 mt-0.5">{sorular.length} soru</p>
        </div>
        <button onClick={openYeni} className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
          <Plus size={15} /> Yeni Soru
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Soru ara..." value={ara} onChange={(e) => setAra(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50" />
          </div>
          {ara && <span className="text-xs text-slate-400">{filtrelenmis.length} sonuç</span>}
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : filtrelenmis.length === 0 ? (
          <EmptyState icon={HelpCircle} title={ara ? "Eşleşen soru bulunamadı" : "Henüz soru yok"} description={ara ? "Arama teriminizi değiştirin." : "Yeni soru eklemek için sağ üstteki butona tıklayın."} />
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80">
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider w-10">#</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Soru Metni</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold text-slate-400 uppercase tracking-wider w-24">Puan</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold text-slate-400 uppercase tracking-wider w-24">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtrelenmis.map((soru, i) => (
                <tr key={soru.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3.5 text-sm text-slate-400 tabular-nums">{i + 1}</td>
                  <td className="px-4 py-3.5 text-sm text-slate-800">{soru.metin}</td>
                  <td className="px-4 py-3.5 text-center">
                    <span className="inline-flex items-center justify-center px-2.5 py-0.5 text-xs font-semibold text-indigo-600 bg-indigo-50 rounded-full">
                      {soru.puan} p
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(soru.id)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Düzenle">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => setDeleteId(soru.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Sil">
                        <Trash2 size={14} />
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
            <p className="text-xs text-slate-400">{filtrelenmis.length} soru listeleniyor</p>
          </div>
        )}
      </div>

      {/* Yeni Soru Modal */}
      <Modal open={yeniAcik} onClose={() => setYeniAcik(false)} title="Yeni Soru">
        <form onSubmit={handleYeniSave} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Soru Metni</label>
            <textarea value={yeniMetin} onChange={(e) => { setYeniMetin(e.target.value); setYeniError(""); }} rows={3}
              placeholder="Soru metnini yazın..." autoFocus
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
            {yeniError && <p className="text-xs text-red-500 mt-1">{yeniError}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Puan</label>
            <input type="number" min={0} value={yeniPuan} onChange={(e) => setYeniPuan(Number(e.target.value))}
              className="w-32 px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
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
      <Modal open={!!editId} onClose={() => setEditId(null)} title="Soruyu Düzenle">
        {editLoading ? (
          <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <form onSubmit={handleEditSave} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Soru Metni</label>
              <textarea value={editMetin} onChange={(e) => { setEditMetin(e.target.value); setEditError(""); }} rows={3} autoFocus
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
              {editError && <p className="text-xs text-red-500 mt-1">{editError}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Puan</label>
              <input type="number" min={0} value={editPuan} onChange={(e) => setEditPuan(Number(e.target.value))}
                className="w-32 px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
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

      <ConfirmDialog open={!!deleteId} title="Soruyu sil" description="Bu soru kalıcı olarak silinecek. Bölümlere atanmışsa referans bozulabilir."
        onConfirm={handleDelete} onCancel={() => setDeleteId(null)} loading={deleting} />
    </div>
  );
}
