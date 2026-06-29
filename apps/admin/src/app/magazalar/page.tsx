"use client";

import { useEffect, useState } from "react";
import { Store, Pencil, Trash2, Search, Plus, CheckCircle2, XCircle, MapPin } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import {
  getMagazalar,
  createMagaza,
  getMagaza,
  updateMagaza,
  deleteMagaza,
  getBolgeler,
  getKullanicilar,
} from "@/lib/firestore";
import type { Magaza, Bolge, Kullanici } from "@/types";

export default function MagazalarPage() {
  const [magazalar, setMagazalar] = useState<Magaza[]>([]);
  const [bolgeler, setBolgeler] = useState<Bolge[]>([]);
  const [kullanicilar, setKullanicilar] = useState<Kullanici[]>([]);
  const [loading, setLoading] = useState(true);
  const [ara, setAra] = useState("");
  const [bolgeFiltre, setBolgeFiltre] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Yeni modal
  const [yeniAcik, setYeniAcik] = useState(false);
  const [yeniAd, setYeniAd] = useState("");
  const [yeniAdres, setYeniAdres] = useState("");
  const [yeniBolgeId, setYeniBolgeId] = useState("");
  const [yeniSorumluId, setYeniSorumluId] = useState("");
  const [yeniSaving, setYeniSaving] = useState(false);
  const [yeniError, setYeniError] = useState("");

  // Düzenle modal
  const [editId, setEditId] = useState<string | null>(null);
  const [editAd, setEditAd] = useState("");
  const [editAdres, setEditAdres] = useState("");
  const [editBolgeId, setEditBolgeId] = useState("");
  const [editSorumluId, setEditSorumluId] = useState("");
  const [editAktif, setEditAktif] = useState(true);
  const [editLoading, setEditLoading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const sorumluAdaylar = kullanicilar.filter(
    (k) => k.rol === "magaza_sorumlusu" || k.rol === "admin"
  );

  async function load() {
    setLoading(true);
    const [m, b, k] = await Promise.all([getMagazalar(), getBolgeler(), getKullanicilar()]);
    setMagazalar(m);
    setBolgeler(b);
    setKullanicilar(k);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function openYeni() {
    setYeniAd(""); setYeniAdres(""); setYeniBolgeId(""); setYeniSorumluId(""); setYeniError("");
    setYeniAcik(true);
  }

  async function handleYeniSave(e: React.FormEvent) {
    e.preventDefault();
    if (!yeniAd.trim()) { setYeniError("Mağaza adı boş bırakılamaz."); return; }
    setYeniSaving(true);
    await createMagaza({
      ad: yeniAd.trim(),
      adres: yeniAdres.trim() || undefined,
      bolgeId: yeniBolgeId || undefined,
      magazaSorumlusuId: yeniSorumluId || undefined,
    });
    setYeniSaving(false);
    setYeniAcik(false);
    load();
  }

  async function openEdit(id: string) {
    setEditId(id);
    setEditLoading(true);
    setEditError("");
    const m = await getMagaza(id);
    if (m) {
      setEditAd(m.ad);
      setEditAdres(m.adres ?? "");
      setEditBolgeId(m.bolgeId ?? "");
      setEditSorumluId(m.magazaSorumlusuId ?? "");
      setEditAktif(m.aktif);
    }
    setEditLoading(false);
  }

  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editId || !editAd.trim()) { setEditError("Mağaza adı boş bırakılamaz."); return; }
    setEditSaving(true);
    await updateMagaza(editId, {
      ad: editAd.trim(),
      adres: editAdres.trim() || undefined,
      bolgeId: editBolgeId || undefined,
      magazaSorumlusuId: editSorumluId || undefined,
      aktif: editAktif,
    });
    setEditSaving(false);
    setEditId(null);
    load();
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    await deleteMagaza(deleteId);
    setDeleteId(null);
    setDeleting(false);
    load();
  }

  const filtrelenmis = magazalar.filter((m) => {
    const araEslesen =
      m.ad.toLowerCase().includes(ara.toLowerCase()) ||
      (m.adres ?? "").toLowerCase().includes(ara.toLowerCase());
    const bolgeEslesen = !bolgeFiltre || m.bolgeId === bolgeFiltre;
    return araEslesen && bolgeEslesen;
  });

  function bolgeAdi(id?: string) {
    if (!id) return null;
    return bolgeler.find((b) => b.id === id)?.ad ?? null;
  }

  function sorumluAdi(id?: string) {
    if (!id) return null;
    return kullanicilar.find((k) => k.id === id)?.displayName ?? null;
  }

  const SelectField = ({
    label, value, onChange, options, placeholder,
  }: {
    label: string; value: string; onChange: (v: string) => void;
    options: { value: string; label: string }[]; placeholder: string;
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
          <h1 className="text-xl font-bold text-slate-900">Mağazalar</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {magazalar.length} mağaza
            {magazalar.filter((m) => m.aktif).length < magazalar.length && (
              <span className="ml-2 text-slate-400">· {magazalar.filter((m) => m.aktif).length} aktif</span>
            )}
          </p>
        </div>
        <button
          onClick={openYeni}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus size={15} /> Yeni Mağaza
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 flex-wrap">
          <div className="relative flex-1 min-w-48 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Mağaza ara..."
              value={ara}
              onChange={(e) => setAra(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
            />
          </div>
          <select
            value={bolgeFiltre}
            onChange={(e) => setBolgeFiltre(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
          >
            <option value="">Tüm Bölgeler</option>
            {bolgeler.map((b) => (
              <option key={b.id} value={b.id}>{b.ad}</option>
            ))}
          </select>
          {(ara || bolgeFiltre) && (
            <span className="text-xs text-slate-400">{filtrelenmis.length} sonuç</span>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtrelenmis.length === 0 ? (
          <EmptyState
            icon={Store}
            title={ara || bolgeFiltre ? "Eşleşen mağaza bulunamadı" : "Henüz mağaza yok"}
            description={ara || bolgeFiltre ? "Filtrelerinizi değiştirin." : "İlk mağazayı eklemek için sağ üstteki butona tıklayın."}
          />
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80">
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider w-10">#</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Mağaza</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Adres</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Bölge</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Sorumlu</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold text-slate-400 uppercase tracking-wider w-24">Durum</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold text-slate-400 uppercase tracking-wider w-24">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtrelenmis.map((magaza, i) => (
                <tr key={magaza.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3.5 text-sm text-slate-400 tabular-nums">{i + 1}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
                        <Store size={14} className="text-teal-600" />
                      </div>
                      <span className="text-sm font-medium text-slate-800">{magaza.ad}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-slate-500">
                    {magaza.adres ? (
                      <div className="flex items-center gap-1.5">
                        <MapPin size={12} className="text-slate-400 shrink-0" />
                        <span className="truncate max-w-[180px]">{magaza.adres}</span>
                      </div>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-sm text-slate-600">
                    {bolgeAdi(magaza.bolgeId) ?? <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3.5 text-sm text-slate-600">
                    {magaza.magazaSorumlusuId ? (
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-teal-100 flex items-center justify-center">
                          <span className="text-[9px] font-bold text-teal-600">
                            {sorumluAdi(magaza.magazaSorumlusuId)?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span>{sorumluAdi(magaza.magazaSorumlusuId)}</span>
                      </div>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <Badge variant={magaza.aktif ? "aktif" : "pasif"} />
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(magaza.id)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Düzenle"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteId(magaza.id)}
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
            <p className="text-xs text-slate-400">{filtrelenmis.length} mağaza listeleniyor</p>
          </div>
        )}
      </div>

      {/* Yeni Modal */}
      <Modal open={yeniAcik} onClose={() => setYeniAcik(false)} title="Yeni Mağaza">
        <form onSubmit={handleYeniSave} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Mağaza Adı</label>
            <input
              value={yeniAd}
              onChange={(e) => { setYeniAd(e.target.value); setYeniError(""); }}
              placeholder="ör. Kadıköy Şubesi"
              autoFocus
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {yeniError && <p className="text-xs text-red-500 mt-1">{yeniError}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Adres <span className="text-slate-400 font-normal">(isteğe bağlı)</span>
            </label>
            <input
              value={yeniAdres}
              onChange={(e) => setYeniAdres(e.target.value)}
              placeholder="ör. Moda Cad. No:5, Kadıköy"
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <SelectField
            label="Bölge (isteğe bağlı)"
            value={yeniBolgeId}
            onChange={setYeniBolgeId}
            options={bolgeler.map((b) => ({ value: b.id, label: b.ad }))}
            placeholder="Seçin..."
          />
          <SelectField
            label="Mağaza Sorumlusu (isteğe bağlı)"
            value={yeniSorumluId}
            onChange={setYeniSorumluId}
            options={sorumluAdaylar.map((k) => ({ value: k.id, label: k.displayName }))}
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
      <Modal open={!!editId} onClose={() => setEditId(null)} title="Mağazayı Düzenle">
        {editLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleEditSave} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Mağaza Adı</label>
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
                Adres <span className="text-slate-400 font-normal">(isteğe bağlı)</span>
              </label>
              <input
                value={editAdres}
                onChange={(e) => setEditAdres(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <SelectField
              label="Bölge (isteğe bağlı)"
              value={editBolgeId}
              onChange={setEditBolgeId}
              options={bolgeler.map((b) => ({ value: b.id, label: b.ad }))}
              placeholder="Seçin..."
            />
            <SelectField
              label="Mağaza Sorumlusu (isteğe bağlı)"
              value={editSorumluId}
              onChange={setEditSorumluId}
              options={sorumluAdaylar.map((k) => ({ value: k.id, label: k.displayName }))}
              placeholder="Seçin..."
            />
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">Durum</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setEditAktif(true)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${editAktif ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                  <CheckCircle2 size={13} /> Aktif
                </button>
                <button type="button" onClick={() => setEditAktif(false)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${!editAktif ? "border-red-400 bg-red-50 text-red-600" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
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
        title="Mağazayı sil"
        description="Bu mağaza kalıcı olarak silinecek. Bağlı personel ve değerlendirmeler etkilenebilir."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        loading={deleting}
      />
    </div>
  );
}
