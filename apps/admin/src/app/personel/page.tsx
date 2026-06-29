"use client";

import { useEffect, useState } from "react";
import { Users, Pencil, Plus, Store, Check, Search } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import DataTable, { type DataColumn } from "@/components/ui/DataTable";
import { getPersoneller, createPersonel, getPersonel, updatePersonel, getMagazalar } from "@/lib/firestore";
import { useAuth } from "@/contexts/AuthContext";
import type { Personel, Magaza } from "@/types";

export default function PersonelPage() {
  const { kullanici } = useAuth();
  const [personeller, setPersoneller] = useState<Personel[]>([]);
  const [magazalar, setMagazalar] = useState<Magaza[]>([]);
  const [loading, setLoading] = useState(true);

  const isKameraman = kullanici?.rol === "kameraman";

  const [yeniAcik, setYeniAcik] = useState(false);
  const [yeniAd, setYeniAd] = useState("");
  const [yeniTc, setYeniTc] = useState("");
  const [yeniMagazaIds, setYeniMagazaIds] = useState<string[]>([]);
  const [yeniMagazaAra, setYeniMagazaAra] = useState("");
  const [yeniSaving, setYeniSaving] = useState(false);
  const [yeniError, setYeniError] = useState("");

  const [editId, setEditId] = useState<string | null>(null);
  const [editAd, setEditAd] = useState("");
  const [editTc, setEditTc] = useState("");
  const [editMagazaIds, setEditMagazaIds] = useState<string[]>([]);
  const [editOrijinalMagazaIds, setEditOrijinalMagazaIds] = useState<string[]>([]);
  const [editMagazaAra, setEditMagazaAra] = useState("");
  const [editAktif, setEditAktif] = useState(true);
  const [editLoading, setEditLoading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  async function load() {
    setLoading(true);
    const [p, m] = await Promise.all([getPersoneller(), getMagazalar()]);
    setPersoneller(p); setMagazalar(m); setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function openYeni() {
    setYeniAd(""); setYeniTc(""); setYeniMagazaIds([]); setYeniMagazaAra(""); setYeniError("");
    setYeniAcik(true);
  }

  async function handleYeniSave(e: React.FormEvent) {
    e.preventDefault();
    if (!yeniAd.trim()) { setYeniError("Ad Soyad boş bırakılamaz."); return; }
    if (yeniTc.trim() && yeniTc.trim().length !== 11) { setYeniError("TC Kimlik No 11 haneli olmalıdır."); return; }
    setYeniSaving(true);
    await createPersonel({ ad: yeniAd.trim(), tc: yeniTc.trim(), magazaIdleri: yeniMagazaIds });
    setYeniSaving(false); setYeniAcik(false); load();
  }

  async function openEdit(id: string) {
    setEditId(id); setEditLoading(true); setEditError(""); setEditMagazaAra("");
    const p = await getPersonel(id);
    if (p) { 
      setEditAd(p.ad); 
      setEditTc(p.tc || ""); 
      setEditMagazaIds(p.magazaIdleri ?? []); 
      setEditOrijinalMagazaIds(p.magazaIdleri ?? []);
      setEditAktif(p.aktif); 
    }
    setEditLoading(false);
  }

  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editId || !editAd.trim()) { setEditError("Ad Soyad boş bırakılamaz."); return; }
    if (editTc.trim() && editTc.trim().length !== 11) { setEditError("TC Kimlik No 11 haneli olmalıdır."); return; }
    setEditSaving(true);
    
    await updatePersonel(editId, { ad: editAd.trim(), tc: editTc.trim(), magazaIdleri: editMagazaIds, aktif: editAktif });
    setEditSaving(false); setEditId(null); load();
  }

  function MagazaCheckList({ seciliIds, onToggle, araVal, onAraChange }: {
    seciliIds: string[]; onToggle: (id: string) => void; araVal: string; onAraChange: (v: string) => void;
  }) {
    const filtreli = magazalar.filter((m) => m.ad.toLowerCase().includes(araVal.toLowerCase()));
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-slate-700">Mağaza Ata <span className="text-slate-400 font-normal">({seciliIds.filter(id => magazalar.some(m => m.id === id)).length} seçili)</span></p>
          {magazalar.length > 4 && (
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Filtrele..." value={araVal} onChange={(e) => onAraChange(e.target.value)}
                className="pl-7 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 w-36" />
            </div>
          )}
        </div>
        {magazalar.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center border border-slate-100 rounded-lg">Henüz mağaza yok. Önce mağaza oluşturun.</p>
        ) : (
          <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100 max-h-48 overflow-y-auto">
            {filtreli.map((m) => {
              const secili = seciliIds.includes(m.id);
              return (
                <button key={m.id} type="button" onClick={() => onToggle(m.id)}
                  className={`flex items-center gap-3 w-full px-3 py-2.5 text-left transition-colors ${secili ? "bg-teal-50" : "hover:bg-slate-50"}`}>
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${secili ? "bg-teal-600 border-teal-600" : "border-slate-300"}`}>
                    {secili && <Check size={10} className="text-white" />}
                  </div>
                  <Store size={13} className={secili ? "text-teal-600" : "text-slate-400"} />
                  <span className={`flex-1 text-sm ${secili ? "text-teal-700 font-medium" : "text-slate-700"}`}>{m.ad}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const columns: DataColumn<Personel>[] = [
    {
      key: "ad",
      header: "Personel",
      searchValue: (p) => `${p.ad} ${p.tc ?? ""}`,
      sortValue: (p) => p.ad,
      cell: (p) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-indigo-600">{p.ad.charAt(0).toUpperCase()}</span>
          </div>
          <span className="text-sm font-medium text-slate-800">{p.ad}</span>
        </div>
      ),
    },
    {
      key: "tc",
      header: "TC Kimlik No",
      sortValue: (p) => p.tc ?? "",
      cell: (p) => <span className="text-sm text-slate-500">{p.tc || <span className="text-slate-300">—</span>}</span>,
    },
    {
      key: "magazalar",
      header: "Mağazalar",
      cell: (p) =>
        p.magazaIdleri?.length ? (
          <div className="flex flex-wrap gap-1">
            {p.magazaIdleri.slice(0, 2).map((id) => {
              const m = magazalar.find((x) => x.id === id);
              return m ? (
                <span key={id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-teal-50 text-teal-700 rounded text-xs font-medium">
                  <Store size={10} /> {m.ad}
                </span>
              ) : null;
            })}
            {p.magazaIdleri.length > 2 && <span className="text-xs text-slate-400">+{p.magazaIdleri.length - 2}</span>}
          </div>
        ) : <span className="text-slate-300 text-sm">—</span>,
    },
    {
      key: "durum",
      header: "Durum",
      align: "center",
      width: "90px",
      sortValue: (p) => p.aktif ? 1 : 0,
      cell: (p) => <Badge variant={p.aktif ? "aktif" : "pasif"} />,
    },
  ];

  if (!isKameraman) {
    columns.push({
      key: "islemler",
      header: "İşlemler",
      align: "right",
      width: "80px",
      cell: (p) => (
        <button onClick={() => openEdit(p.id)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Düzenle">
          <Pencil size={14} />
        </button>
      ),
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Personel</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {personeller.length} personel
            {personeller.filter((p) => p.aktif).length < personeller.length && (
              <span className="ml-2 text-slate-400">· {personeller.filter((p) => p.aktif).length} aktif</span>
            )}
          </p>
        </div>
        {!isKameraman && (
          <button onClick={openYeni} className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
            <Plus size={15} /> Yeni Personel
          </button>
        )}
      </div>

      <DataTable data={personeller} columns={columns} rowKey={(p) => p.id} loading={loading}
        searchPlaceholder="Ad veya TC kimlik no ara..." emptyIcon={Users}
        emptyTitle="Henüz personel yok" emptyDescription="İlk personeli eklemek için sağ üstteki butona tıklayın." />

      {/* Yeni Modal */}
      <Modal open={yeniAcik} onClose={() => setYeniAcik(false)} title="Yeni Personel">
        <form onSubmit={handleYeniSave} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Ad Soyad</label>
            <input value={yeniAd} onChange={(e) => { setYeniAd(e.target.value); setYeniError(""); }} placeholder="ör. Ahmet Yılmaz" autoFocus
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            {yeniError && <p className="text-xs text-red-500 mt-1">{yeniError}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">TC Kimlik No <span className="text-slate-400 font-normal">(isteğe bağlı)</span></label>
            <input value={yeniTc} onChange={(e) => setYeniTc(e.target.value.replace(/[^0-9]/g, ''))} placeholder="ör. 12345678901"
              maxLength={11}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          {(magazalar.length > 0) && (
            <MagazaCheckList seciliIds={yeniMagazaIds}
              onToggle={(id) => setYeniMagazaIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id])}
              araVal={yeniMagazaAra} onAraChange={setYeniMagazaAra} />
          )}
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={yeniSaving} className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors">
              {yeniSaving ? "Kaydediliyor..." : "Kaydet"}
            </button>
            <button type="button" onClick={() => setYeniAcik(false)} className="px-5 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">İptal</button>
          </div>
        </form>
      </Modal>

      {/* Düzenle Modal */}
      <Modal open={!!editId} onClose={() => setEditId(null)} title="Personeli Düzenle">
        {editLoading ? <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div> : (
          <form onSubmit={handleEditSave} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Ad Soyad</label>
              <input value={editAd} onChange={(e) => { setEditAd(e.target.value); setEditError(""); }} autoFocus
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              {editError && <p className="text-xs text-red-500 mt-1">{editError}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">TC Kimlik No <span className="text-slate-400 font-normal">(isteğe bağlı)</span></label>
              <input value={editTc} onChange={(e) => setEditTc(e.target.value.replace(/[^0-9]/g, ''))}
                maxLength={11}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            {(magazalar.length > 0) && (
              <MagazaCheckList seciliIds={editMagazaIds}
                onToggle={(id) => setEditMagazaIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id])}
                araVal={editMagazaAra} onAraChange={setEditMagazaAra} />
            )}
            {!isKameraman && (
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">Durum</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setEditAktif(true)}
                    className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${editAktif ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>Aktif</button>
                  <button type="button" onClick={() => setEditAktif(false)}
                    className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${!editAktif ? "border-red-400 bg-red-50 text-red-600" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>Pasif</button>
                </div>
              </div>
            )}
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={editSaving} className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors">
                {editSaving ? "Kaydediliyor..." : "Güncelle"}
              </button>
              <button type="button" onClick={() => setEditId(null)} className="px-5 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">İptal</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
