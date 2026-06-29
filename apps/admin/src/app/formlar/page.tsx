"use client";

import { useEffect, useState } from "react";
import { FileText, Pencil, Trash2, Search, Plus, Eye, Check, BarChart2, Target } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import { getFormlar, deleteForm, createForm, getForm, updateForm, getBolumler, getSorular } from "@/lib/firestore";
import type { Form, Bolum, Soru, SkorlamaSistemi } from "@/types";

const SKORLAMA_SECENEKLER: { value: SkorlamaSistemi; label: string; aciklama: string }[] = [
  {
    value: "esik",
    label: "Eşik Bazlı",
    aciklama: "Hedef yüzdeye ulaşıldığında tam puan, ulaşılamadığında 0 puan.",
  },
  {
    value: "oran",
    label: "Oran Bazlı",
    aciklama: "Evet oranı direkt puan olur, bölüm puanı soruların ortalamasıdır.",
  },
];

export default function FormlarPage() {
  const [formlar, setFormlar] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [ara, setAra] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Yeni form modal
  const [yeniAcik, setYeniAcik] = useState(false);
  const [yeniAd, setYeniAd] = useState("");
  const [yeniAciklama, setYeniAciklama] = useState("");
  const [yeniPuanli, setYeniPuanli] = useState(true);
  const [yeniSkorlamaSistemi, setYeniSkorlamaSistemi] = useState<SkorlamaSistemi>("esik");
  const [yeniBolumler, setYeniBolumler] = useState<Bolum[]>([]);
  const [yeniSeciliIds, setYeniSeciliIds] = useState<string[]>([]);
  const [yeniBolumAra, setYeniBolumAra] = useState("");
  const [yeniSaving, setYeniSaving] = useState(false);
  const [yeniError, setYeniError] = useState("");

  // Detay modal
  const [detayForm, setDetayForm] = useState<Form | null>(null);
  const [detayBolumMap, setDetayBolumMap] = useState<Record<string, Bolum>>({});
  const [detaySoruMap, setDetaySoruMap] = useState<Record<string, Soru>>({});
  const [detayLoading, setDetayLoading] = useState(false);

  // Düzenle modal
  const [editId, setEditId] = useState<string | null>(null);
  const [editAd, setEditAd] = useState("");
  const [editAciklama, setEditAciklama] = useState("");
  const [editPuanli, setEditPuanli] = useState(true);
  const [editSkorlamaSistemi, setEditSkorlamaSistemi] = useState<SkorlamaSistemi>("esik");
  const [editBolumler, setEditBolumler] = useState<Bolum[]>([]);
  const [editSeciliIds, setEditSeciliIds] = useState<string[]>([]);
  const [editBolumAra, setEditBolumAra] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  async function load() {
    setLoading(true);
    setFormlar(await getFormlar());
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function openYeni() {
    setYeniAd(""); setYeniAciklama(""); setYeniPuanli(true); setYeniSkorlamaSistemi("esik");
    setYeniSeciliIds([]); setYeniBolumAra(""); setYeniError("");
    const b = await getBolumler();
    setYeniBolumler(b);
    setYeniAcik(true);
  }

  async function handleYeniSave(e: React.FormEvent) {
    e.preventDefault();
    if (!yeniAd.trim()) { setYeniError("Form adı boş bırakılamaz."); return; }
    setYeniSaving(true);
    await createForm({
      ad: yeniAd.trim(),
      aciklama: yeniAciklama.trim(),
      puanli: yeniPuanli,
      skorlamaSistemi: yeniPuanli ? yeniSkorlamaSistemi : undefined,
      bolumIdleri: yeniSeciliIds,
    });
    setYeniSaving(false);
    setYeniAcik(false);
    load();
  }

  async function openDetay(id: string) {
    setDetayLoading(true);
    setDetayForm(null);
    const [f, bolumler, sorular] = await Promise.all([getForm(id), getBolumler(), getSorular()]);
    setDetayForm(f);
    const bm: Record<string, Bolum> = {};
    bolumler.forEach((b) => { bm[b.id] = b; });
    setDetayBolumMap(bm);
    const sm: Record<string, Soru> = {};
    sorular.forEach((s) => { sm[s.id] = s; });
    setDetaySoruMap(sm);
    setDetayLoading(false);
  }

  async function openEdit(id: string) {
    setEditId(id);
    setEditLoading(true);
    setEditError(""); setEditBolumAra("");
    const [f, tumBolumler] = await Promise.all([getForm(id), getBolumler()]);
    if (f) {
      setEditAd(f.ad); setEditAciklama(f.aciklama); setEditPuanli(f.puanli);
      setEditSkorlamaSistemi(f.skorlamaSistemi ?? "esik");
      setEditSeciliIds(f.bolumIdleri);
    }
    setEditBolumler(tumBolumler);
    setEditLoading(false);
  }

  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editId || !editAd.trim()) { setEditError("Form adı boş bırakılamaz."); return; }
    setEditSaving(true);
    await updateForm(editId, {
      ad: editAd.trim(),
      aciklama: editAciklama.trim(),
      puanli: editPuanli,
      skorlamaSistemi: editPuanli ? editSkorlamaSistemi : undefined,
      bolumIdleri: editSeciliIds,
    });
    setEditSaving(false);
    setEditId(null);
    load();
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    await deleteForm(deleteId);
    setDeleteId(null);
    setDeleting(false);
    load();
  }

  const filtrelenmis = formlar.filter((f) =>
    f.ad.toLowerCase().includes(ara.toLowerCase()) ||
    f.aciklama?.toLowerCase().includes(ara.toLowerCase())
  );

  function BolumCheckList({
    bolumler, seciliIds, onToggle, araVal, onAraChange,
  }: {
    bolumler: Bolum[]; seciliIds: string[]; onToggle: (id: string) => void;
    araVal: string; onAraChange: (v: string) => void;
  }) {
    const filtreli = bolumler.filter((b) => b.ad.toLowerCase().includes(araVal.toLowerCase()));
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-slate-700">
            Bölüm Ata <span className="text-slate-400 font-normal">({seciliIds.length} seçili)</span>
          </p>
          {bolumler.length > 4 && (
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Filtrele..." value={araVal} onChange={(e) => onAraChange(e.target.value)}
                className="pl-7 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 w-36" />
            </div>
          )}
        </div>
        {bolumler.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center border border-slate-100 rounded-lg">
            Henüz bölüm yok. Önce bölüm oluşturun.
          </p>
        ) : (
          <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100 max-h-52 overflow-y-auto">
            {filtreli.map((bolum) => {
              const secili = seciliIds.includes(bolum.id);
              return (
                <button key={bolum.id} type="button" onClick={() => onToggle(bolum.id)}
                  className={`flex items-center gap-3 w-full px-3 py-2.5 text-left transition-colors ${secili ? "bg-indigo-50" : "hover:bg-slate-50"}`}>
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${secili ? "bg-indigo-600 border-indigo-600" : "border-slate-300"}`}>
                    {secili && <Check size={10} className="text-white" />}
                  </div>
                  <span className={`flex-1 text-sm ${secili ? "text-indigo-700 font-medium" : "text-slate-700"}`}>{bolum.ad}</span>
                  <span className="text-xs text-slate-400 shrink-0">{bolum.soruIdleri.length} soru</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  function SkorlamaSecimi({
    value, onChange,
  }: {
    value: SkorlamaSistemi; onChange: (v: SkorlamaSistemi) => void;
  }) {
    return (
      <div>
        <p className="text-sm font-medium text-slate-700 mb-2">Skorlama Sistemi</p>
        <div className="grid grid-cols-2 gap-2">
          {SKORLAMA_SECENEKLER.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => onChange(s.value)}
              className={`flex flex-col items-start gap-1 p-3 rounded-lg border-2 text-left transition-colors ${
                value === s.value
                  ? "border-indigo-600 bg-indigo-50"
                  : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-1.5">
                {s.value === "esik" ? (
                  <Target size={13} className={value === s.value ? "text-indigo-600" : "text-slate-400"} />
                ) : (
                  <BarChart2 size={13} className={value === s.value ? "text-indigo-600" : "text-slate-400"} />
                )}
                <span className={`text-sm font-semibold ${value === s.value ? "text-indigo-700" : "text-slate-700"}`}>
                  {s.label}
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">{s.aciklama}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Formlar</h1>
          <p className="text-sm text-slate-500 mt-0.5">{formlar.length} form</p>
        </div>
        <button onClick={openYeni} className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
          <Plus size={15} /> Yeni Form
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Form ara..." value={ara} onChange={(e) => setAra(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50" />
          </div>
          {ara && <span className="text-xs text-slate-400">{filtrelenmis.length} sonuç</span>}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtrelenmis.length === 0 ? (
          <EmptyState icon={FileText} title={ara ? "Eşleşen form bulunamadı" : "Henüz form yok"}
            description={ara ? "Arama teriminizi değiştirin." : "Yeni form eklemek için sağ üstteki butona tıklayın."} />
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80">
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider w-10">#</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Form Adı</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Açıklama</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold text-slate-400 uppercase tracking-wider w-24">Tip</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold text-slate-400 uppercase tracking-wider w-28">Skorlama</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold text-slate-400 uppercase tracking-wider w-24">Bölüm</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold text-slate-400 uppercase tracking-wider w-28">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtrelenmis.map((form, i) => (
                <tr key={form.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3.5 text-sm text-slate-400 tabular-nums">{i + 1}</td>
                  <td className="px-4 py-3.5 text-sm font-medium text-slate-800">{form.ad}</td>
                  <td className="px-4 py-3.5 text-sm text-slate-500 truncate max-w-xs">
                    {form.aciklama || <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <Badge variant={form.puanli ? "puanli" : "puansiz"} />
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    {form.puanli && form.skorlamaSistemi ? (
                      <Badge variant={form.skorlamaSistemi} />
                    ) : (
                      <span className="text-slate-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className="inline-flex items-center justify-center px-2.5 py-0.5 text-xs font-semibold text-slate-600 bg-slate-100 rounded-full">
                      {form.bolumIdleri.length}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openDetay(form.id)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors" title="Detay">
                        <Eye size={14} />
                      </button>
                      <button onClick={() => openEdit(form.id)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Düzenle">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => setDeleteId(form.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Sil">
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
            <p className="text-xs text-slate-400">{filtrelenmis.length} form listeleniyor</p>
          </div>
        )}
      </div>

      {/* Yeni Form Modal */}
      <Modal open={yeniAcik} onClose={() => setYeniAcik(false)} title="Yeni Form" size="lg">
        <form onSubmit={handleYeniSave} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Form Adı</label>
            <input value={yeniAd} onChange={(e) => { setYeniAd(e.target.value); setYeniError(""); }} placeholder="ör. Mağaza Denetim Formu" autoFocus
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            {yeniError && <p className="text-xs text-red-500 mt-1">{yeniError}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Açıklama <span className="text-slate-400 font-normal">(isteğe bağlı)</span></label>
            <textarea value={yeniAciklama} onChange={(e) => setYeniAciklama(e.target.value)} rows={2}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">Puan Tipi</p>
            <div className="flex gap-2">
              {[true, false].map((val) => (
                <button key={String(val)} type="button" onClick={() => setYeniPuanli(val)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${yeniPuanli === val ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                  {yeniPuanli === val && <Check size={13} />}{val ? "Puanlı" : "Puansız"}
                </button>
              ))}
            </div>
          </div>
          {yeniPuanli && (
            <SkorlamaSecimi value={yeniSkorlamaSistemi} onChange={setYeniSkorlamaSistemi} />
          )}
          <BolumCheckList bolumler={yeniBolumler} seciliIds={yeniSeciliIds}
            onToggle={(id) => setYeniSeciliIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id])}
            araVal={yeniBolumAra} onAraChange={setYeniBolumAra} />
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

      {/* Detay Modal */}
      <Modal open={!!detayForm || detayLoading} onClose={() => setDetayForm(null)} title={detayForm?.ad ?? "Form Detayı"} size="lg">
        {detayLoading ? (
          <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : detayForm ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 flex-wrap">
              <Badge variant={detayForm.puanli ? "puanli" : "puansiz"} />
              {detayForm.puanli && detayForm.skorlamaSistemi && (
                <Badge variant={detayForm.skorlamaSistemi} />
              )}
              {detayForm.aciklama && <p className="text-sm text-slate-500 ml-1">{detayForm.aciklama}</p>}
            </div>
            {detayForm.bolumIdleri.length === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center">Bu forma henüz bölüm atanmamış.</p>
            ) : (
              <div className="space-y-3">
                {detayForm.bolumIdleri.map((bolumId, bi) => {
                  const bolum = detayBolumMap[bolumId];
                  if (!bolum) return null;
                  return (
                    <div key={bolumId} className="border border-slate-200 rounded-lg overflow-hidden">
                      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0">{bi + 1}</span>
                        <p className="text-sm font-semibold text-slate-800">{bolum.ad}</p>
                        <span className="ml-auto text-xs text-slate-400">{bolum.soruIdleri.length} soru</span>
                      </div>
                      <div className="divide-y divide-slate-50">
                        {bolum.soruIdleri.map((soruId, si) => {
                          const soru = detaySoruMap[soruId];
                          return (
                            <div key={soruId} className="flex items-center gap-3 px-4 py-2.5">
                              <span className="text-xs text-slate-400 w-4 shrink-0">{si + 1}.</span>
                              <p className="flex-1 text-sm text-slate-700">{soru?.metin ?? <span className="italic text-slate-400">—</span>}</p>
                              {soru && detayForm.puanli && (
                                <div className="flex items-center gap-2 shrink-0">
                                  {soru.hedefYuzde !== undefined && (
                                    <span className="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full font-medium">
                                      %{soru.hedefYuzde}
                                    </span>
                                  )}
                                  <span className="text-xs font-semibold text-indigo-600">{soru.puan} p</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}
      </Modal>

      {/* Düzenle Modal */}
      <Modal open={!!editId} onClose={() => setEditId(null)} title="Formu Düzenle" size="lg">
        {editLoading ? (
          <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <form onSubmit={handleEditSave} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Form Adı</label>
              <input value={editAd} onChange={(e) => { setEditAd(e.target.value); setEditError(""); }} autoFocus
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              {editError && <p className="text-xs text-red-500 mt-1">{editError}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Açıklama <span className="text-slate-400 font-normal">(isteğe bağlı)</span></label>
              <textarea value={editAciklama} onChange={(e) => setEditAciklama(e.target.value)} rows={2}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">Puan Tipi</p>
              <div className="flex gap-2">
                {[true, false].map((val) => (
                  <button key={String(val)} type="button" onClick={() => setEditPuanli(val)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${editPuanli === val ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                    {editPuanli === val && <Check size={13} />}{val ? "Puanlı" : "Puansız"}
                  </button>
                ))}
              </div>
            </div>
            {editPuanli && (
              <SkorlamaSecimi value={editSkorlamaSistemi} onChange={setEditSkorlamaSistemi} />
            )}
            <BolumCheckList bolumler={editBolumler} seciliIds={editSeciliIds}
              onToggle={(id) => setEditSeciliIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id])}
              araVal={editBolumAra} onAraChange={setEditBolumAra} />
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

      <ConfirmDialog open={!!deleteId} title="Formu sil" description="Bu form kalıcı olarak silinecek."
        onConfirm={handleDelete} onCancel={() => setDeleteId(null)} loading={deleting} />
    </div>
  );
}
