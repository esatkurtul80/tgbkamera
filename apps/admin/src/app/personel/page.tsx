"use client";

import { useEffect, useState } from "react";
import { Users, Pencil, Plus, Store, Check, Search, Upload, FileSpreadsheet, UserX } from "lucide-react";
import { Workbook, type Cell } from "exceljs";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import DataTable, { type DataColumn } from "@/components/ui/DataTable";
import { getPersoneller, createPersonel, getPersonel, updatePersonel, getMagazalar } from "@/lib/firestore";
import { useAuth } from "@/contexts/AuthContext";
import type { Personel, Magaza } from "@/types";

interface TopluSatir {
  rowNo: number;
  magazaAdiRaw: string;
  ad: string;
  tc: string;
  magazaId: string | null;
}

function hucreMetni(cell: Cell | undefined): string {
  if (!cell) return "";
  const v = cell.value;
  if (v == null) return "";
  if (typeof v === "object") {
    if (v instanceof Date) return v.toLocaleDateString("tr-TR");
    if ("richText" in v && Array.isArray((v as { richText?: { text: string }[] }).richText)) {
      return (v as { richText: { text: string }[] }).richText.map((t) => t.text).join("").trim();
    }
    if ("text" in v) return String((v as { text: unknown }).text ?? "").trim();
    if ("result" in v) return String((v as { result: unknown }).result ?? "").trim();
    return "";
  }
  return String(v).trim();
}

function normalizeMagazaAdi(s: string): string {
  return s.trim().toLocaleLowerCase("tr-TR").replace(/\s+/g, " ");
}

// Türkçe harf duyarlı, büyük/küçük harften bağımsız arama (İ/i, I/ı, Ş, Ğ, Ü, Ö, Ç)
function trIceriyor(metin: string, aranan: string): boolean {
  return metin.toLocaleLowerCase("tr-TR").includes(aranan.toLocaleLowerCase("tr-TR"));
}

// PersonelPage'in DIŞINDA tanımlı olmalı: içeride tanımlanırsa her render'da
// bileşen tipi yeniden yaratılır, React alt ağacı unmount/mount eder ve
// filtre input'u her tuş vuruşunda odağını kaybeder.
function MagazaCheckList({ magazalar, seciliIds, onToggle, araVal, onAraChange }: {
  magazalar: Magaza[]; seciliIds: string[]; onToggle: (id: string) => void; araVal: string; onAraChange: (v: string) => void;
}) {
  const filtreli = magazalar.filter((m) => trIceriyor(m.ad, araVal));
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

export default function PersonelPage() {
  const { kullanici } = useAuth();
  const [personeller, setPersoneller] = useState<Personel[]>([]);
  const [magazalar, setMagazalar] = useState<Magaza[]>([]);
  const [loading, setLoading] = useState(true);

  const isKameraman = kullanici?.rol === "kameraman";

  // Aktif / Pasife Alınanlar kategorileri
  const [durumGorunumu, setDurumGorunumu] = useState<"aktif" | "pasif">("aktif");
  const aktifPersoneller = personeller.filter((p) => p.aktif);
  const pasifPersoneller = personeller.filter((p) => !p.aktif);

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

  // Toplu Personel Ekle
  const [topluAcik, setTopluAcik] = useState(false);
  const [topluParsing, setTopluParsing] = useState(false);
  const [topluSatirlar, setTopluSatirlar] = useState<TopluSatir[]>([]);
  const [topluDuzeltmeler, setTopluDuzeltmeler] = useState<Record<number, string>>({});
  const [topluHata, setTopluHata] = useState("");
  const [topluImporting, setTopluImporting] = useState(false);
  const [topluSonuc, setTopluSonuc] = useState<{ eklenen: number; guncellenen: number; atlanan: number } | null>(null);

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

  function openToplu() {
    setTopluAcik(true);
    setTopluSatirlar([]);
    setTopluDuzeltmeler({});
    setTopluHata("");
    setTopluSonuc(null);
  }

  async function handleTopluDosya(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setTopluHata("");
    setTopluSonuc(null);
    setTopluParsing(true);
    try {
      const buffer = await file.arrayBuffer();
      const wb = new Workbook();
      await wb.xlsx.load(buffer);
      const ws = wb.worksheets[0];
      if (!ws) throw new Error("Çalışma sayfası bulunamadı.");

      const satirlar: TopluSatir[] = [];
      ws.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // başlık satırı atlanır
        const magazaAdiRaw = hucreMetni(row.getCell(1));
        const ad = hucreMetni(row.getCell(2));
        const tc = hucreMetni(row.getCell(3)).replace(/[^0-9]/g, "");
        if (!magazaAdiRaw && !ad && !tc) return; // boş satır
        const magazaId =
          magazalar.find((m) => normalizeMagazaAdi(m.ad) === normalizeMagazaAdi(magazaAdiRaw))?.id ?? null;
        satirlar.push({ rowNo: rowNumber, magazaAdiRaw, ad, tc, magazaId });
      });

      if (satirlar.length === 0) throw new Error("Excel dosyasında okunacak satır bulunamadı.");
      setTopluSatirlar(satirlar);
      setTopluDuzeltmeler({});
    } catch (err) {
      console.error("Excel okuma hatası:", err);
      setTopluHata("Dosya okunamadı. Lütfen A: Mağaza Adı, B: Ad Soyad, C: TC Kimlik No sütunlarını içeren geçerli bir .xlsx dosyası seçin.");
    } finally {
      setTopluParsing(false);
    }
  }

  async function handleTopluIceAktar() {
    setTopluImporting(true);
    setTopluHata("");
    try {
      const cozulmusSatirlar = topluSatirlar
        .map((s) => {
          if (s.magazaId) return s;
          const duzeltme = topluDuzeltmeler[s.rowNo];
          if (!duzeltme || duzeltme === "atla") return null;
          return { ...s, magazaId: duzeltme };
        })
        .filter((s): s is TopluSatir => !!s && !!s.ad.trim());
      const atlanan = topluSatirlar.length - cozulmusSatirlar.length;

      // Aynı kişi birden fazla satırda (farklı mağazalarda) geçiyorsa TC'ye göre
      // tek personelde birleştirilir; TC boşsa satır kendi başına içe aktarılır.
      const gruplar = new Map<string, { ad: string; tc: string; magazaIds: Set<string> }>();
      let sirNo = 0;
      for (const s of cozulmusSatirlar) {
        const key = s.tc ? `tc:${s.tc}` : `satir:${sirNo++}`;
        const mevcut = gruplar.get(key);
        if (mevcut) {
          mevcut.magazaIds.add(s.magazaId!);
        } else {
          gruplar.set(key, { ad: s.ad.trim(), tc: s.tc, magazaIds: new Set([s.magazaId!]) });
        }
      }

      let eklenen = 0;
      let guncellenen = 0;
      for (const grup of gruplar.values()) {
        const mevcutPersonel = grup.tc ? personeller.find((p) => p.tc === grup.tc) : undefined;
        if (mevcutPersonel) {
          const birlesikIds = Array.from(new Set([...(mevcutPersonel.magazaIdleri ?? []), ...grup.magazaIds]));
          await updatePersonel(mevcutPersonel.id, {
            ad: mevcutPersonel.ad,
            tc: mevcutPersonel.tc,
            magazaIdleri: birlesikIds,
            aktif: mevcutPersonel.aktif,
          });
          guncellenen++;
        } else {
          await createPersonel({ ad: grup.ad, tc: grup.tc, magazaIdleri: Array.from(grup.magazaIds) });
          eklenen++;
        }
      }

      setTopluSonuc({ eklenen, guncellenen, atlanan });
      setTopluSatirlar([]);
      setTopluDuzeltmeler({});
      await load();
    } catch (err) {
      console.error("Toplu içe aktarma hatası:", err);
      setTopluHata("İçe aktarma sırasında bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setTopluImporting(false);
    }
  }

  const topluCakisanlar = topluSatirlar.filter((s) => !s.magazaId);
  const topluEslesenler = topluSatirlar.filter((s) => s.magazaId);

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

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Personel</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {aktifPersoneller.length} aktif personel
            {pasifPersoneller.length > 0 && (
              <span className="ml-2 text-slate-400">· {pasifPersoneller.length} pasif</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isKameraman && (
            <button onClick={openToplu} className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-slate-700 text-sm font-medium rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
              <Upload size={15} /> Toplu Personel Ekle
            </button>
          )}
          <button onClick={openYeni} className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
            <Plus size={15} /> Yeni Personel
          </button>
        </div>
      </div>

      {/* Aktif / Pasife Alınanlar kategorileri */}
      <div className="inline-flex items-center gap-1 bg-slate-100 rounded-lg p-1 self-start">
        <button
          onClick={() => setDurumGorunumu("aktif")}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
            durumGorunumu === "aktif" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <Users size={12} />
          Aktif Personeller
          <span className="text-[10px] text-slate-400">{aktifPersoneller.length}</span>
        </button>
        <button
          onClick={() => setDurumGorunumu("pasif")}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
            durumGorunumu === "pasif" ? "bg-white text-rose-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <UserX size={12} />
          Pasife Alınanlar
          <span className="text-[10px] text-slate-400">{pasifPersoneller.length}</span>
        </button>
      </div>

      <DataTable data={durumGorunumu === "aktif" ? aktifPersoneller : pasifPersoneller}
        columns={columns} rowKey={(p) => p.id} loading={loading}
        searchPlaceholder="Ad veya TC kimlik no ara..." emptyIcon={durumGorunumu === "aktif" ? Users : UserX}
        emptyTitle={durumGorunumu === "aktif" ? "Henüz personel yok" : "Pasife alınan personel yok"}
        emptyDescription={durumGorunumu === "aktif"
          ? "İlk personeli eklemek için sağ üstteki butona tıklayın."
          : "Bir personeli düzenleme ekranından pasife aldığınızda burada listelenir."} />

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
            <MagazaCheckList magazalar={magazalar} seciliIds={yeniMagazaIds}
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
              <MagazaCheckList magazalar={magazalar} seciliIds={editMagazaIds}
                onToggle={(id) => setEditMagazaIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id])}
                araVal={editMagazaAra} onAraChange={setEditMagazaAra} />
            )}
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">Durum</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setEditAktif(true)}
                  className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${editAktif ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>Aktif</button>
                <button type="button" onClick={() => setEditAktif(false)}
                  className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${!editAktif ? "border-red-400 bg-red-50 text-red-600" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>Pasif</button>
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={editSaving} className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors">
                {editSaving ? "Kaydediliyor..." : "Güncelle"}
              </button>
              <button type="button" onClick={() => setEditId(null)} className="px-5 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">İptal</button>
            </div>
          </form>
        )}
      </Modal>

      {/* Toplu Personel Ekle Modal */}
      <Modal open={topluAcik} onClose={() => setTopluAcik(false)} title="Toplu Personel Ekle" size="lg">
        <div className="space-y-5">
          {topluSonuc ? (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl p-4 text-sm">
                <p className="font-semibold">İçe aktarma tamamlandı.</p>
                <p className="mt-1">
                  {topluSonuc.eklenen} yeni personel eklendi, {topluSonuc.guncellenen} mevcut personele yeni mağaza eklendi
                  {topluSonuc.atlanan > 0 && `, ${topluSonuc.atlanan} satır atlandı`}.
                </p>
              </div>
              <button type="button" onClick={() => setTopluAcik(false)} className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
                Tamam
              </button>
            </div>
          ) : topluSatirlar.length === 0 ? (
            <div className="space-y-4">
              <div className="text-sm text-slate-600 space-y-1.5">
                <p>
                  Excel sütun sırası: <span className="font-semibold text-slate-800">A: Mağaza Adı</span>,{" "}
                  <span className="font-semibold text-slate-800">B: Ad Soyad</span>,{" "}
                  <span className="font-semibold text-slate-800">C: TC Kimlik No</span>.
                </p>
                <p className="text-slate-400">İlk satır başlık kabul edilir ve atlanır.</p>
              </div>
              <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 rounded-xl py-10 cursor-pointer transition-colors">
                <FileSpreadsheet size={28} className="text-slate-400" />
                <span className="text-sm font-medium text-slate-600">{topluParsing ? "Okunuyor..." : "Excel dosyası seç (.xlsx)"}</span>
                <input type="file" accept=".xlsx" className="hidden" disabled={topluParsing} onChange={handleTopluDosya} />
              </label>
              {topluHata && <p className="text-sm text-red-500">{topluHata}</p>}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap text-sm">
                <p className="text-slate-600">
                  <span className="font-semibold text-slate-800">{topluSatirlar.length}</span> satır okundu ·{" "}
                  <span className="font-semibold text-emerald-600">{topluEslesenler.length}</span> eşleşti
                  {topluCakisanlar.length > 0 && (
                    <>
                      {" "}
                      · <span className="font-semibold text-amber-600">{topluCakisanlar.length}</span> mağaza adı eşleşmedi
                    </>
                  )}
                </p>
                <button type="button" onClick={() => { setTopluSatirlar([]); setTopluDuzeltmeler({}); }} className="text-xs font-medium text-slate-400 hover:text-slate-600">
                  Farklı dosya seç
                </button>
              </div>

              {topluCakisanlar.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-amber-700">Eşleşmeyen mağaza adları — doğru mağazayı seçin ya da atlayın</p>
                  <div className="border border-amber-200 rounded-xl overflow-hidden divide-y divide-amber-100 max-h-64 overflow-y-auto">
                    {topluCakisanlar.map((s) => (
                      <div key={s.rowNo} className="p-3 bg-amber-50/40 space-y-2">
                        <div className="text-sm">
                          <span className="font-semibold text-slate-800">{s.ad || "(isimsiz)"}</span>
                          <span className="text-slate-400"> · satır {s.rowNo}</span>
                        </div>
                        <div className="text-xs text-slate-500">
                          Excel&apos;deki mağaza adı:{" "}
                          <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">{s.magazaAdiRaw || "(boş)"}</span>
                        </div>
                        <select
                          value={topluDuzeltmeler[s.rowNo] ?? ""}
                          onChange={(e) => setTopluDuzeltmeler((p) => ({ ...p, [s.rowNo]: e.target.value }))}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">— Mağaza seçin —</option>
                          <option value="atla">Atla (içe aktarma)</option>
                          {magazalar.map((m) => (
                            <option key={m.id} value={m.id}>{m.ad}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {topluHata && <p className="text-sm text-red-500">{topluHata}</p>}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleTopluIceAktar}
                  disabled={topluImporting}
                  className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors"
                >
                  {topluImporting ? "İçe aktarılıyor..." : "İçe Aktar"}
                </button>
                <button
                  type="button"
                  onClick={() => setTopluAcik(false)}
                  disabled={topluImporting}
                  className="px-5 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  İptal
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
