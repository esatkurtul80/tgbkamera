"use client";

import { useEffect, useState } from "react";
import { HelpCircle, Pencil, Trash2, Plus, Target } from "lucide-react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Modal from "@/components/ui/Modal";
import DataTable, { type DataColumn } from "@/components/ui/DataTable";
import { getSorular, deleteSoru, createSoru, getSoru, updateSoru } from "@/lib/firestore";
import type { Soru } from "@/types";

export default function SorularPage() {
  const [sorular, setSorular] = useState<Soru[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [yeniAcik, setYeniAcik] = useState(false);
  const [yeniMetin, setYeniMetin] = useState("");
  const [yeniPuan, setYeniPuan] = useState(0);
  const [yeniHedefYuzde, setYeniHedefYuzde] = useState<number | "">("");
  const [yeniSaving, setYeniSaving] = useState(false);
  const [yeniError, setYeniError] = useState("");

  const [editId, setEditId] = useState<string | null>(null);
  const [editMetin, setEditMetin] = useState("");
  const [editPuan, setEditPuan] = useState(0);
  const [editHedefYuzde, setEditHedefYuzde] = useState<number | "">("");
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
    setYeniMetin(""); setYeniPuan(0); setYeniHedefYuzde(""); setYeniError("");
    setYeniAcik(true);
  }

  async function handleYeniSave(e: React.FormEvent) {
    e.preventDefault();
    if (!yeniMetin.trim()) { setYeniError("Soru metni boş bırakılamaz."); return; }
    setYeniSaving(true);
    await createSoru({ metin: yeniMetin.trim(), puan: yeniPuan, hedefYuzde: yeniHedefYuzde === "" ? undefined : yeniHedefYuzde });
    setYeniSaving(false); setYeniAcik(false); load();
  }

  async function openEdit(id: string) {
    setEditId(id); setEditLoading(true); setEditError("");
    const s = await getSoru(id);
    if (s) { setEditMetin(s.metin); setEditPuan(s.puan); setEditHedefYuzde(s.hedefYuzde ?? ""); }
    setEditLoading(false);
  }

  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editId || !editMetin.trim()) { setEditError("Soru metni boş bırakılamaz."); return; }
    setEditSaving(true);
    await updateSoru(editId, { metin: editMetin.trim(), puan: editPuan, hedefYuzde: editHedefYuzde === "" ? undefined : editHedefYuzde });
    setEditSaving(false); setEditId(null); load();
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    await deleteSoru(deleteId);
    setDeleteId(null); setDeleting(false); load();
  }

  const HedefYuzdeField = ({ value, onChange }: { value: number | ""; onChange: (v: number | "") => void }) => (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        Hedef Yüzde <span className="text-slate-400 font-normal">(eşik sistemi için, isteğe bağlı)</span>
      </label>
      <div className="flex items-center gap-2">
        <div className="relative w-32">
          <Target size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="number" min={0} max={100} value={value}
            onChange={(e) => onChange(e.target.value === "" ? "" : Math.min(100, Math.max(0, Number(e.target.value))))}
            placeholder="0–100"
            className="w-full pl-8 pr-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <span className="text-sm text-slate-500">%</span>
        {value !== "" && (
          <button type="button" onClick={() => onChange("")} className="text-xs text-slate-400 hover:text-slate-600 underline">Temizle</button>
        )}
      </div>
      <p className="text-xs text-slate-400 mt-1.5">Bu yüzdeye ulaşılamadığında soru puanı 0 olur (eşik sistemi).</p>
    </div>
  );

  const columns: DataColumn<Soru>[] = [
    {
      key: "metin",
      header: "Soru Metni",
      searchValue: (s) => s.metin,
      sortValue: (s) => s.metin,
      cell: (s) => <span className="text-sm text-slate-800">{s.metin}</span>,
    },
    {
      key: "puan",
      header: "Puan",
      align: "center",
      width: "100px",
      sortValue: (s) => s.puan,
      cell: (s) => (
        <span className="inline-flex items-center justify-center px-2.5 py-0.5 text-xs font-semibold text-indigo-600 bg-indigo-50 rounded-full">
          {s.puan} p
        </span>
      ),
    },
    {
      key: "hedefYuzde",
      header: "Hedef %",
      align: "center",
      width: "110px",
      sortValue: (s) => s.hedefYuzde ?? -1,
      cell: (s) =>
        s.hedefYuzde !== undefined ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold text-amber-600 bg-amber-50 rounded-full">
            <Target size={10} /> %{s.hedefYuzde}
          </span>
        ) : <span className="text-slate-300 text-xs">—</span>,
    },
    {
      key: "islemler",
      header: "İşlemler",
      align: "right",
      width: "100px",
      cell: (s) => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={() => openEdit(s.id)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Düzenle">
            <Pencil size={14} />
          </button>
          <button onClick={() => setDeleteId(s.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Sil">
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

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

      <DataTable
        data={sorular}
        columns={columns}
        rowKey={(s) => s.id}
        loading={loading}
        searchPlaceholder="Soru ara..."
        emptyIcon={HelpCircle}
        emptyTitle="Henüz soru yok"
        emptyDescription="Yeni soru eklemek için sağ üstteki butona tıklayın."
      />

      {/* Yeni Modal */}
      <Modal open={yeniAcik} onClose={() => setYeniAcik(false)} title="Yeni Soru">
        <form onSubmit={handleYeniSave} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Soru Metni</label>
            <textarea value={yeniMetin} onChange={(e) => { setYeniMetin(e.target.value); setYeniError(""); }} rows={3} autoFocus placeholder="Soru metnini yazın..."
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
            {yeniError && <p className="text-xs text-red-500 mt-1">{yeniError}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Puan</label>
            <input type="number" min={0} value={yeniPuan} onChange={(e) => setYeniPuan(Number(e.target.value))}
              className="w-32 px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <HedefYuzdeField value={yeniHedefYuzde} onChange={setYeniHedefYuzde} />
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={yeniSaving} className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors">
              {yeniSaving ? "Kaydediliyor..." : "Kaydet"}
            </button>
            <button type="button" onClick={() => setYeniAcik(false)} className="px-5 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">İptal</button>
          </div>
        </form>
      </Modal>

      {/* Düzenle Modal */}
      <Modal open={!!editId} onClose={() => setEditId(null)} title="Soruyu Düzenle">
        {editLoading ? <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div> : (
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
            <HedefYuzdeField value={editHedefYuzde} onChange={setEditHedefYuzde} />
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={editSaving} className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors">
                {editSaving ? "Kaydediliyor..." : "Güncelle"}
              </button>
              <button type="button" onClick={() => setEditId(null)} className="px-5 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">İptal</button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmDialog open={!!deleteId} title="Soruyu sil" description="Bu soru kalıcı olarak silinecek."
        onConfirm={handleDelete} onCancel={() => setDeleteId(null)} loading={deleting} />
    </div>
  );
}
