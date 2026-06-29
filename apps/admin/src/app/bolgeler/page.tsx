"use client";

import { useEffect, useState } from "react";
import { Map, Pencil, Trash2, Search, Plus, CheckCircle2, XCircle } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import {
  getBolgeler,
  createBolge,
  getBolge,
  updateBolge,
  deleteBolge,
  getKullanicilar,
} from "@/lib/firestore";
import type { Bolge, Kullanici } from "@/types";

export default function BolgelerPage() {
  const [bolgeler, setBolgeler] = useState<Bolge[]>([]);
  const [kullanicilar, setKullanicilar] = useState<Kullanici[]>([]);
  const [loading, setLoading] = useState(true);
  const [ara, setAra] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Yeni modal
  const [yeniAcik, setYeniAcik] = useState(false);
  const [yeniAd, setYeniAd] = useState("");
  const [yeniAciklama, setYeniAciklama] = useState("");
  const [yeniBolgeMuduruId, setYeniBolgeMuduruId] = useState("");
  const [yeniSaving, setYeniSaving] = useState(false);
  const [yeniError, setYeniError] = useState("");

  // Düzenle modal
  const [editId, setEditId] = useState<string | null>(null);
  const [editAd, setEditAd] = useState("");
  const [editAciklama, setEditAciklama] = useState("");
  const [editBolgeMuduruId, setEditBolgeMuduruId] = useState("");
  const [editAktif, setEditAktif] = useState(true);
  const [editLoading, setEditLoading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const bolgeMudurleri = kullanicilar.filter(
    (k) => k.rol === "bolge_muduru" || k.rol === "admin" || k.rol === "ust_yonetici"
  );

  async function load() {
    setLoading(true);
    const [b, k] = await Promise.all([getBolgeler(), getKullanicilar()]);
    setBolgeler(b);
    setKullanicilar(k);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function openYeni() {
    setYeniAd(""); setYeniAciklama(""); setYeniBolgeMuduruId(""); setYeniError("");
    setYeniAcik(true);
  }

  async function handleYeniSave(e: React.FormEvent) {
    e.preventDefault();
    if (!yeniAd.trim()) { setYeniError("Bölge adı boş bırakılamaz."); return; }
    setYeniSaving(true);
    await createBolge({
      ad: yeniAd.trim(),
      aciklama: yeniAciklama.trim(),
      bolgeMuduruId: yeniBolgeMuduruId || undefined,
    });
    setYeniSaving(false);
    setYeniAcik(false);
    load();
  }

  async function openEdit(id: string) {
    setEditId(id);
    setEditLoading(true);
    setEditError("");
    const b = await getBolge(id);
    if (b) {
      setEditAd(b.ad);
      setEditAciklama(b.aciklama ?? "");
      setEditBolgeMuduruId(b.bolgeMuduruId ?? "");
      setEditAktif(b.aktif);
    }
    setEditLoading(false);
  }

  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editId || !editAd.trim()) { setEditError("Bölge adı boş bırakılamaz."); return; }
    setEditSaving(true);
    await updateBolge(editId, {
      ad: editAd.trim(),
      aciklama: editAciklama.trim(),
      bolgeMuduruId: editBolgeMuduruId || undefined,
      aktif: editAktif,
    });
    setEditSaving(false);
    setEditId(null);
    load();
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    await deleteBolge(deleteId);
    setDeleteId(null);
    setDeleting(false);
    load();
  }

  const filtrelenmis = bolgeler.filter((b) =>
    b.ad.toLowerCase().includes(ara.toLowerCase()) ||
    (b.aciklama ?? "").toLowerCase().includes(ara.toLowerCase())
  );

  function mudurAdi(id?: string) {
    if (!id) return null;
    return kullanicilar.find((k) => k.id === id)?.displayName ?? null;
  }

  const SelectField = ({
    label, value, onChange, options, placeholder,
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    options: { value: string; label: string }[];
    placeholder: string;
  }) => (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Bölgeler</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {bolgeler.length} bölge
            {bolgeler.filter((b) => b.aktif).length < bolgeler.length && (
              <span className="ml-2 text-slate-400">· {bolgeler.filter((b) => b.aktif).length} aktif</span>
            )}
          </p>
        </div>
        <button
          onClick={openYeni}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus size={15} /> Yeni Bölge
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Bölge ara..."
              value={ara}
              onChange={(e) => setAra(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
            />
          </div>
          {ara && <span className="text-xs text-slate-400">{filtrelenmis.length} sonuç</span>}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtrelenmis.length === 0 ? (
          <EmptyState
            icon={Map}
            title={ara ? "Eşleşen bölge bulunamadı" : "Henüz bölge yok"}
            description={ara ? "Arama teriminizi değiştirin." : "İlk bölgeyi eklemek için sağ üstteki butona tıklayın."}
          />
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80">
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider w-10">#</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Bölge Adı</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Açıklama</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Bölge Müdürü</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold text-slate-400 uppercase tracking-wider w-24">Durum</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold text-slate-400 uppercase tracking-wider w-24">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtrelenmis.map((bolge, i) => (
                <tr key={bolge.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3.5 text-sm text-slate-400 tabular-nums">{i + 1}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                        <Map size={14} className="text-blue-600" />
                      </div>
                      <span className="text-sm font-medium text-slate-800">{bolge.ad}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-slate-500 max-w-xs truncate">
                    {bolge.aciklama || <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3.5 text-sm text-slate-600">
                    {bolge.bolgeMuduruId ? (
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center">
                          <span className="text-[9px] font-bold text-indigo-600">
                            {mudurAdi(bolge.bolgeMuduruId)?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span>{mudurAdi(bolge.bolgeMuduruId)}</span>
                      </div>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <Badge variant={bolge.aktif ? "aktif" : "pasif"} />
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(bolge.id)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Düzenle"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteId(bolge.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Sil"
                      >
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
            <p className="text-xs text-slate-400">{filtrelenmis.length} bölge listeleniyor</p>
          </div>
        )}
      </div>

      {/* Yeni Modal */}
      <Modal open={yeniAcik} onClose={() => setYeniAcik(false)} title="Yeni Bölge">
        <form onSubmit={handleYeniSave} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Bölge Adı</label>
            <input
              value={yeniAd}
              onChange={(e) => { setYeniAd(e.target.value); setYeniError(""); }}
              placeholder="ör. İstanbul Anadolu"
              autoFocus
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {yeniError && <p className="text-xs text-red-500 mt-1">{yeniError}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Açıklama <span className="text-slate-400 font-normal">(isteğe bağlı)</span>
            </label>
            <textarea
              value={yeniAciklama}
              onChange={(e) => setYeniAciklama(e.target.value)}
              rows={2}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>
          <SelectField
            label="Bölge Müdürü (isteğe bağlı)"
            value={yeniBolgeMuduruId}
            onChange={setYeniBolgeMuduruId}
            options={bolgeMudurleri.map((k) => ({ value: k.id, label: k.displayName }))}
            placeholder="Seçin..."
          />
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
      <Modal open={!!editId} onClose={() => setEditId(null)} title="Bölgeyi Düzenle">
        {editLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleEditSave} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Bölge Adı</label>
              <input
                value={editAd}
                onChange={(e) => { setEditAd(e.target.value); setEditError(""); }}
                autoFocus
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {editError && <p className="text-xs text-red-500 mt-1">{editError}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Açıklama <span className="text-slate-400 font-normal">(isteğe bağlı)</span>
              </label>
              <textarea
                value={editAciklama}
                onChange={(e) => setEditAciklama(e.target.value)}
                rows={2}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>
            <SelectField
              label="Bölge Müdürü (isteğe bağlı)"
              value={editBolgeMuduruId}
              onChange={setEditBolgeMuduruId}
              options={bolgeMudurleri.map((k) => ({ value: k.id, label: k.displayName }))}
              placeholder="Seçin..."
            />
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">Durum</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditAktif(true)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${editAktif ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                >
                  <CheckCircle2 size={13} /> Aktif
                </button>
                <button
                  type="button"
                  onClick={() => setEditAktif(false)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${!editAktif ? "border-red-400 bg-red-50 text-red-600" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                >
                  <XCircle size={13} /> Pasif
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

      <ConfirmDialog
        open={!!deleteId}
        title="Bölgeyi sil"
        description="Bu bölge kalıcı olarak silinecek. Bağlı mağazalar etkilenebilir."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        loading={deleting}
      />
    </div>
  );
}
