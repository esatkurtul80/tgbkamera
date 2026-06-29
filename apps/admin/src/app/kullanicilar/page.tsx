"use client";

import { useEffect, useState } from "react";
import {
  UserCog, Pencil, Search, Plus, CheckCircle2, XCircle, Shield, Store, Check,
} from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import {
  getKullanicilar,
  createKullanici,
  getKullanici,
  updateKullanici,
  getBolgeler,
  getMagazalar,
} from "@/lib/firestore";
import type { Kullanici, KullaniciRol, Bolge, Magaza } from "@/types";
import { ROL_ETIKETLERI } from "@/types";

const ROLLER: KullaniciRol[] = [
  "admin",
  "sirketsahibi",
  "ust_yonetici",
  "bolge_muduru",
  "magaza_sorumlusu",
  "kameraman",
];

export default function KullanicilarPage() {
  const [kullanicilar, setKullanicilar] = useState<Kullanici[]>([]);
  const [bolgeler, setBolgeler] = useState<Bolge[]>([]);
  const [magazalar, setMagazalar] = useState<Magaza[]>([]);
  const [loading, setLoading] = useState(true);
  const [ara, setAra] = useState("");
  const [rolFiltre, setRolFiltre] = useState<KullaniciRol | "">("");

  // Yeni modal
  const [yeniAcik, setYeniAcik] = useState(false);
  const [yeniDisplayName, setYeniDisplayName] = useState("");
  const [yeniEmail, setYeniEmail] = useState("");
  const [yeniRol, setYeniRol] = useState<KullaniciRol>("kameraman");
  const [yeniBolgeId, setYeniBolgeId] = useState("");
  const [yeniMagazaId, setYeniMagazaId] = useState("");
  const [yeniMagazaIdleri, setYeniMagazaIdleri] = useState<string[]>([]);
  const [yeniMagazaAra, setYeniMagazaAra] = useState("");
  const [yeniSaving, setYeniSaving] = useState(false);
  const [yeniError, setYeniError] = useState("");

  // Düzenle modal
  const [editId, setEditId] = useState<string | null>(null);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editRol, setEditRol] = useState<KullaniciRol>("kameraman");
  const [editBolgeId, setEditBolgeId] = useState("");
  const [editMagazaId, setEditMagazaId] = useState("");
  const [editMagazaIdleri, setEditMagazaIdleri] = useState<string[]>([]);
  const [editMagazaAra, setEditMagazaAra] = useState("");
  const [editAktif, setEditAktif] = useState(true);
  const [editLoading, setEditLoading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  async function load() {
    setLoading(true);
    const [k, b, m] = await Promise.all([getKullanicilar(), getBolgeler(), getMagazalar()]);
    setKullanicilar(k);
    setBolgeler(b);
    setMagazalar(m);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function openYeni() {
    setYeniDisplayName(""); setYeniEmail(""); setYeniRol("kameraman");
    setYeniBolgeId(""); setYeniMagazaId(""); setYeniMagazaIdleri([]); setYeniMagazaAra(""); setYeniError("");
    setYeniAcik(true);
  }

  async function handleYeniSave(e: React.FormEvent) {
    e.preventDefault();
    if (!yeniDisplayName.trim()) { setYeniError("Ad Soyad boş bırakılamaz."); return; }
    if (!yeniEmail.trim()) { setYeniError("E-posta boş bırakılamaz."); return; }
    setYeniSaving(true);
    await createKullanici({
      displayName: yeniDisplayName.trim(),
      email: yeniEmail.trim(),
      rol: yeniRol,
      bolgeId: yeniBolgeId || undefined,
      magazaId: yeniMagazaId || undefined,
      magazaIdleri: yeniRol === "kameraman" ? yeniMagazaIdleri : undefined,
    });
    setYeniSaving(false);
    setYeniAcik(false);
    load();
  }

  async function openEdit(id: string) {
    setEditId(id);
    setEditLoading(true);
    setEditError("");
    const k = await getKullanici(id);
    if (k) {
      setEditDisplayName(k.displayName || "");
      setEditRol(k.rol || "kameraman");
      setEditBolgeId(k.bolgeId ?? "");
      setEditMagazaId(k.magazaId ?? "");
      setEditMagazaIdleri(k.magazaIdleri ?? []);
      setEditAktif(k.aktif !== false);
    }
    setEditLoading(false);
  }

  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editId || !editDisplayName.trim()) { setEditError("Ad Soyad boş bırakılamaz."); return; }
    setEditSaving(true);
    setEditError("");
    try {
      await updateKullanici(editId, {
        displayName: editDisplayName.trim(),
        rol: editRol,
        bolgeId: editBolgeId || null,
        magazaId: editMagazaId || null,
        magazaIdleri: editRol === "kameraman" ? editMagazaIdleri : null,
        aktif: editAktif,
      });
      setEditSaving(false);
      setEditId(null);
      load();
    } catch (err: any) {
      console.error("Kullanıcı güncellenirken hata oluştu:", err);
      setEditError(err?.message || "Kullanıcı güncellenirken bir hata oluştu.");
      setEditSaving(false);
    }
  }

  const filtrelenmis = kullanicilar.filter((k) => {
    const araEslesen =
      k.displayName.toLowerCase().includes(ara.toLowerCase()) ||
      k.email.toLowerCase().includes(ara.toLowerCase());
    const rolEslesen = !rolFiltre || k.rol === rolFiltre;
    return araEslesen && rolEslesen;
  });

  function bolgeAdi(id?: string) {
    if (!id) return null;
    return bolgeler.find((b) => b.id === id)?.ad ?? null;
  }

  function magazaAdi(id?: string) {
    if (!id) return null;
    return magazalar.find((m) => m.id === id)?.ad ?? null;
  }

  function MagazaCheckList({ seciliIds, onToggle, araVal, onAraChange }: {
    seciliIds: string[]; onToggle: (id: string) => void; araVal: string; onAraChange: (v: string) => void;
  }) {
    const filtreli = magazalar.filter((m) => m.ad.toLowerCase().includes(araVal.toLowerCase()));
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-slate-700">Mağaza Ata <span className="text-slate-400 font-normal">({seciliIds.length} seçili)</span></p>
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

  const showBolgeField = (rol: KullaniciRol) =>
    rol === "bolge_muduru" || rol === "ust_yonetici";
  const showMagazaField = (rol: KullaniciRol) =>
    rol === "magaza_sorumlusu";
  const showMagazaCokluField = (rol: KullaniciRol) =>
    rol === "kameraman";

  const RolBadgeInline = ({ rol }: { rol: KullaniciRol }) => (
    <Badge variant={rol} />
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Kullanıcılar</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {kullanicilar.length} kullanıcı
            {kullanicilar.filter((k) => k.aktif !== false).length < kullanicilar.length && (
              <span className="ml-2 text-slate-400">· {kullanicilar.filter((k) => k.aktif !== false).length} aktif</span>
            )}
          </p>
        </div>
        <button
          onClick={openYeni}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus size={15} /> Yeni Kullanıcı
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 flex-wrap">
          <div className="relative flex-1 min-w-48 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Ad veya e-posta ara..."
              value={ara}
              onChange={(e) => setAra(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
            />
          </div>
          <select
            value={rolFiltre}
            onChange={(e) => setRolFiltre(e.target.value as KullaniciRol | "")}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
          >
            <option value="">Tüm Roller</option>
            {ROLLER.map((r) => (
              <option key={r} value={r}>{ROL_ETIKETLERI[r]}</option>
            ))}
          </select>
          {(ara || rolFiltre) && (
            <span className="text-xs text-slate-400">{filtrelenmis.length} sonuç</span>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtrelenmis.length === 0 ? (
          <EmptyState
            icon={UserCog}
            title={ara || rolFiltre ? "Eşleşen kullanıcı bulunamadı" : "Henüz kullanıcı yok"}
            description={ara || rolFiltre ? "Filtrelerinizi değiştirin." : "Yeni kullanıcı eklemek için sağ üstteki butona tıklayın."}
          />
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80">
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider w-10">#</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Kullanıcı</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Rol</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Bölge / Mağaza</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold text-slate-400 uppercase tracking-wider w-24">Durum</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold text-slate-400 uppercase tracking-wider w-20">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtrelenmis.map((k, i) => (
                <tr key={k.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3.5 text-sm text-slate-400 tabular-nums">{i + 1}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-indigo-600">
                          {(k.displayName || k.email || "?").charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{k.displayName || "İsimsiz Kullanıcı"}</p>
                        <p className="text-xs text-slate-400">{k.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <Shield size={12} className="text-slate-400" />
                      <RolBadgeInline rol={k.rol || "kameraman"} />
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-slate-500">
                    {k.bolgeId && bolgeAdi(k.bolgeId) ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                        {bolgeAdi(k.bolgeId)}
                      </span>
                    ) : k.magazaId && magazaAdi(k.magazaId) ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-teal-50 text-teal-700 rounded text-xs font-medium">
                        {magazaAdi(k.magazaId)}
                      </span>
                    ) : k.magazaIdleri && k.magazaIdleri.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-teal-50 text-teal-700 rounded text-xs font-medium">
                          {k.magazaIdleri.length} Mağaza
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <Badge variant={k.aktif !== false ? "aktif" : "pasif"} />
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-end">
                      <button
                        onClick={() => openEdit(k.id)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Düzenle"
                      >
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
            <p className="text-xs text-slate-400">{filtrelenmis.length} kullanıcı listeleniyor</p>
          </div>
        )}
      </div>

      {/* Yeni Kullanıcı Modal */}
      <Modal open={yeniAcik} onClose={() => setYeniAcik(false)} title="Yeni Kullanıcı">
        <form onSubmit={handleYeniSave} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Ad Soyad</label>
            <input
              value={yeniDisplayName}
              onChange={(e) => { setYeniDisplayName(e.target.value); setYeniError(""); }}
              placeholder="ör. Ahmet Yılmaz"
              autoFocus
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {yeniError && <p className="text-xs text-red-500 mt-1">{yeniError}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">E-posta</label>
            <input
              type="email"
              value={yeniEmail}
              onChange={(e) => { setYeniEmail(e.target.value); setYeniError(""); }}
              placeholder="ornek@sirket.com"
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Rol</label>
            <select
              value={yeniRol}
              onChange={(e) => { setYeniRol(e.target.value as KullaniciRol); setYeniBolgeId(""); setYeniMagazaId(""); }}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              {ROLLER.map((r) => (
                <option key={r} value={r}>{ROL_ETIKETLERI[r]}</option>
              ))}
            </select>
          </div>
          {showBolgeField(yeniRol) && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Bölge <span className="text-slate-400 font-normal">(isteğe bağlı)</span>
              </label>
              <select
                value={yeniBolgeId}
                onChange={(e) => setYeniBolgeId(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="">Seçin...</option>
                {bolgeler.map((b) => <option key={b.id} value={b.id}>{b.ad}</option>)}
              </select>
            </div>
          )}
          {showMagazaField(yeniRol) && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Mağaza <span className="text-slate-400 font-normal">(isteğe bağlı)</span>
              </label>
              <select
                value={yeniMagazaId}
                onChange={(e) => setYeniMagazaId(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="">Seçin...</option>
                {magazalar.map((m) => <option key={m.id} value={m.id}>{m.ad}</option>)}
              </select>
            </div>
          )}
          {showMagazaCokluField(yeniRol) && (
            <MagazaCheckList
              seciliIds={yeniMagazaIdleri}
              onToggle={(id) => setYeniMagazaIdleri((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id])}
              araVal={yeniMagazaAra}
              onAraChange={setYeniMagazaAra}
            />
          )}
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
      <Modal open={!!editId} onClose={() => setEditId(null)} title="Kullanıcıyı Düzenle">
        {editLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleEditSave} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Ad Soyad</label>
              <input
                value={editDisplayName}
                onChange={(e) => { setEditDisplayName(e.target.value); setEditError(""); }}
                autoFocus
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {editError && <p className="text-xs text-red-500 mt-1">{editError}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Rol</label>
              <select
                value={editRol}
                onChange={(e) => { setEditRol(e.target.value as KullaniciRol); setEditBolgeId(""); setEditMagazaId(""); }}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                {ROLLER.map((r) => (
                  <option key={r} value={r}>{ROL_ETIKETLERI[r]}</option>
                ))}
              </select>
            </div>
            {showBolgeField(editRol) && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Bölge <span className="text-slate-400 font-normal">(isteğe bağlı)</span>
                </label>
                <select
                  value={editBolgeId}
                  onChange={(e) => setEditBolgeId(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="">Seçin...</option>
                  {bolgeler.map((b) => <option key={b.id} value={b.id}>{b.ad}</option>)}
                </select>
              </div>
            )}
            {showMagazaField(editRol) && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Mağaza <span className="text-slate-400 font-normal">(isteğe bağlı)</span>
                </label>
                <select
                  value={editMagazaId}
                  onChange={(e) => setEditMagazaId(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="">Seçin...</option>
                  {magazalar.map((m) => <option key={m.id} value={m.id}>{m.ad}</option>)}
                </select>
              </div>
            )}
            {showMagazaCokluField(editRol) && (
              <MagazaCheckList
                seciliIds={editMagazaIdleri}
                onToggle={(id) => setEditMagazaIdleri((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id])}
                araVal={editMagazaAra}
                onAraChange={setEditMagazaAra}
              />
            )}
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
    </div>
  );
}
