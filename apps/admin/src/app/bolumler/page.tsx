"use client";

import { useEffect, useState } from "react";
import { Layers, Pencil, Trash2, Plus, Eye, Check, Search } from "lucide-react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Modal from "@/components/ui/Modal";
import DataTable, { type DataColumn } from "@/components/ui/DataTable";
import { getBolumler, deleteBolum, createBolum, getBolum, updateBolum, getSorular } from "@/lib/firestore";
import type { Bolum, Soru } from "@/types";

export default function BolumlerPage() {
  const [bolumler, setBolumler] = useState<Bolum[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [yeniAcik, setYeniAcik] = useState(false);
  const [yeniAd, setYeniAd] = useState("");
  const [yeniAciklama, setYeniAciklama] = useState("");
  const [yeniSorular, setYeniSorular] = useState<Soru[]>([]);
  const [yeniSeciliIds, setYeniSeciliIds] = useState<string[]>([]);
  const [yeniSoruAra, setYeniSoruAra] = useState("");
  const [yeniSaving, setYeniSaving] = useState(false);
  const [yeniError, setYeniError] = useState("");

  const [detayBolum, setDetayBolum] = useState<Bolum | null>(null);
  const [detaySoruMap, setDetaySoruMap] = useState<Record<string, Soru>>({});
  const [detayLoading, setDetayLoading] = useState(false);

  const [editId, setEditId] = useState<string | null>(null);
  const [editAd, setEditAd] = useState("");
  const [editAciklama, setEditAciklama] = useState("");
  const [editSorular, setEditSorular] = useState<Soru[]>([]);
  const [editSeciliIds, setEditSeciliIds] = useState<string[]>([]);
  const [editSoruAra, setEditSoruAra] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  async function load() {
    setLoading(true);
    setBolumler(await getBolumler());
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function openYeni() {
    setYeniAd(""); setYeniAciklama(""); setYeniSeciliIds([]); setYeniSoruAra(""); setYeniError("");
    setYeniSorular(await getSorular());
    setYeniAcik(true);
  }

  async function handleYeniSave(e: React.FormEvent) {
    e.preventDefault();
    if (!yeniAd.trim()) { setYeniError("Bölüm adı boş bırakılamaz."); return; }
    setYeniSaving(true);
    await createBolum({ ad: yeniAd.trim(), aciklama: yeniAciklama.trim(), soruIdleri: yeniSeciliIds });
    setYeniSaving(false); setYeniAcik(false); load();
  }

  async function openDetay(id: string) {
    setDetayLoading(true); setDetayBolum(null);
    const [b, tumSorular] = await Promise.all([getBolum(id), getSorular()]);
    setDetayBolum(b);
    const map: Record<string, Soru> = {};
    tumSorular.forEach((s) => { map[s.id] = s; });
    setDetaySoruMap(map);
    setDetayLoading(false);
  }

  async function openEdit(id: string) {
    setEditId(id); setEditLoading(true); setEditError(""); setEditSoruAra("");
    const [b, tumSorular] = await Promise.all([getBolum(id), getSorular()]);
    if (b) { setEditAd(b.ad); setEditAciklama(b.aciklama); setEditSeciliIds(b.soruIdleri); }
    setEditSorular(tumSorular);
    setEditLoading(false);
  }

  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editId || !editAd.trim()) { setEditError("Bölüm adı boş bırakılamaz."); return; }
    setEditSaving(true);
    await updateBolum(editId, { ad: editAd.trim(), aciklama: editAciklama.trim(), soruIdleri: editSeciliIds });
    setEditSaving(false); setEditId(null); load();
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    await deleteBolum(deleteId);
    setDeleteId(null); setDeleting(false); load();
  }

  function CheckList({ sorular, seciliIds, onToggle, araVal, onAraChange }: {
    sorular: Soru[]; seciliIds: string[]; onToggle: (id: string) => void;
    araVal: string; onAraChange: (v: string) => void;
  }) {
    const filtreli = sorular.filter((s) => s.metin.toLowerCase().includes(araVal.toLowerCase()));
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-slate-700">Soru Ata <span className="text-slate-400 font-normal">({seciliIds.length} seçili)</span></p>
          {sorular.length > 5 && (
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Filtrele..." value={araVal} onChange={(e) => onAraChange(e.target.value)}
                className="pl-7 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 w-36" />
            </div>
          )}
        </div>
        {sorular.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center border border-slate-100 rounded-lg">Henüz soru yok. Önce soru oluşturun.</p>
        ) : (
          <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100 max-h-56 overflow-y-auto">
            {filtreli.map((soru) => {
              const secili = seciliIds.includes(soru.id);
              return (
                <button key={soru.id} type="button" onClick={() => onToggle(soru.id)}
                  className={`flex items-center gap-3 w-full px-3 py-2.5 text-left transition-colors ${secili ? "bg-indigo-50" : "hover:bg-slate-50"}`}>
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${secili ? "bg-indigo-600 border-indigo-600" : "border-slate-300"}`}>
                    {secili && <Check size={10} className="text-white" />}
                  </div>
                  <span className={`flex-1 text-sm ${secili ? "text-indigo-700 font-medium" : "text-slate-700"}`}>{soru.metin}</span>
                  <span className="text-xs font-semibold text-slate-400 shrink-0">{soru.puan} p</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const columns: DataColumn<Bolum>[] = [
    {
      key: "ad",
      header: "Bölüm Adı",
      searchValue: (b) => b.ad + " " + (b.aciklama ?? ""),
      sortValue: (b) => b.ad,
      cell: (b) => <span className="text-sm font-medium text-slate-800">{b.ad}</span>,
    },
    {
      key: "aciklama",
      header: "Açıklama",
      cell: (b) => <span className="text-sm text-slate-500 line-clamp-1">{b.aciklama || <span className="text-slate-300">—</span>}</span>,
    },
    {
      key: "soruSayisi",
      header: "Soru Sayısı",
      align: "center",
      width: "110px",
      sortValue: (b) => b.soruIdleri.length,
      cell: (b) => (
        <span className="inline-flex items-center justify-center px-2.5 py-0.5 text-xs font-semibold text-slate-600 bg-slate-100 rounded-full">
          {b.soruIdleri.length}
        </span>
      ),
    },
    {
      key: "islemler",
      header: "İşlemler",
      align: "right",
      width: "120px",
      cell: (b) => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={() => openDetay(b.id)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors" title="Detay"><Eye size={14} /></button>
          <button onClick={() => openEdit(b.id)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Düzenle"><Pencil size={14} /></button>
          <button onClick={() => setDeleteId(b.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Sil"><Trash2 size={14} /></button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Bölümler</h1>
          <p className="text-sm text-slate-500 mt-0.5">{bolumler.length} bölüm</p>
        </div>
        <button onClick={openYeni} className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
          <Plus size={15} /> Yeni Bölüm
        </button>
      </div>

      <DataTable data={bolumler} columns={columns} rowKey={(b) => b.id} loading={loading}
        searchPlaceholder="Bölüm ara..." emptyIcon={Layers}
        emptyTitle="Henüz bölüm yok" emptyDescription="Yeni bölüm eklemek için sağ üstteki butona tıklayın." />

      <Modal open={yeniAcik} onClose={() => setYeniAcik(false)} title="Yeni Bölüm" size="lg">
        <form onSubmit={handleYeniSave} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Bölüm Adı</label>
            <input value={yeniAd} onChange={(e) => { setYeniAd(e.target.value); setYeniError(""); }} placeholder="ör. Hijyen Kontrol" autoFocus
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            {yeniError && <p className="text-xs text-red-500 mt-1">{yeniError}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Açıklama <span className="text-slate-400 font-normal">(isteğe bağlı)</span></label>
            <textarea value={yeniAciklama} onChange={(e) => setYeniAciklama(e.target.value)} rows={2}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
          </div>
          <CheckList sorular={yeniSorular} seciliIds={yeniSeciliIds}
            onToggle={(id) => setYeniSeciliIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id])}
            araVal={yeniSoruAra} onAraChange={setYeniSoruAra} />
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={yeniSaving} className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors">
              {yeniSaving ? "Kaydediliyor..." : "Kaydet"}
            </button>
            <button type="button" onClick={() => setYeniAcik(false)} className="px-5 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">İptal</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!detayBolum || detayLoading} onClose={() => setDetayBolum(null)} title={detayBolum?.ad ?? "Bölüm Detayı"} size="lg">
        {detayLoading ? <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div> : detayBolum ? (
          <div className="space-y-4">
            {detayBolum.aciklama && <p className="text-sm text-slate-500 pb-2 border-b border-slate-100">{detayBolum.aciklama}</p>}
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sorular ({detayBolum.soruIdleri.length})</p>
            {detayBolum.soruIdleri.length === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center">Bu bölüme henüz soru atanmamış.</p>
            ) : (
              <div className="divide-y divide-slate-50">
                {detayBolum.soruIdleri.map((soruId, i) => {
                  const soru = detaySoruMap[soruId];
                  return (
                    <div key={soruId} className="flex items-center gap-3 py-3">
                      <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-500 shrink-0">{i + 1}</span>
                      <p className="flex-1 text-sm text-slate-700">{soru?.metin ?? <span className="italic text-slate-400">Soru bulunamadı</span>}</p>
                      {soru && <span className="text-xs font-semibold text-indigo-600 shrink-0">{soru.puan} p</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}
      </Modal>

      <Modal open={!!editId} onClose={() => setEditId(null)} title="Bölümü Düzenle" size="lg">
        {editLoading ? <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div> : (
          <form onSubmit={handleEditSave} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Bölüm Adı</label>
              <input value={editAd} onChange={(e) => { setEditAd(e.target.value); setEditError(""); }} autoFocus
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              {editError && <p className="text-xs text-red-500 mt-1">{editError}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Açıklama <span className="text-slate-400 font-normal">(isteğe bağlı)</span></label>
              <textarea value={editAciklama} onChange={(e) => setEditAciklama(e.target.value)} rows={2}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
            </div>
            <CheckList sorular={editSorular} seciliIds={editSeciliIds}
              onToggle={(id) => setEditSeciliIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id])}
              araVal={editSoruAra} onAraChange={setEditSoruAra} />
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={editSaving} className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors">
                {editSaving ? "Kaydediliyor..." : "Güncelle"}
              </button>
              <button type="button" onClick={() => setEditId(null)} className="px-5 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">İptal</button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmDialog open={!!deleteId} title="Bölümü sil" description="Bu bölüm kalıcı olarak silinecek. Formlara atanmışsa referans bozulabilir."
        onConfirm={handleDelete} onCancel={() => setDeleteId(null)} loading={deleting} />
    </div>
  );
}
