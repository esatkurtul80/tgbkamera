"use client";

import { useEffect, useState } from "react";
import { ClipboardList, Search, Plus, Eye } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import { getDegerlendirmeler, getDegerlendirme, getFormlar, getPersoneller } from "@/lib/firestore";
import type { Degerlendirme, Form, Personel } from "@/types";
import Link from "next/link";

const cevapStyle: Record<string, { label: string; className: string }> = {
  evet: { label: "Evet", className: "bg-emerald-50 text-emerald-700" },
  hayir: { label: "Hayır", className: "bg-red-50 text-red-600" },
  muaf: { label: "Muaf", className: "bg-slate-100 text-slate-500" },
};

export default function DegerlendirmelerPage() {
  const [liste, setListe] = useState<Degerlendirme[]>([]);
  const [formlar, setFormlar] = useState<Form[]>([]);
  const [personeller, setPersoneller] = useState<Personel[]>([]);
  const [filtrePersonel, setFiltrePersonel] = useState("");
  const [filtreForm, setFiltreForm] = useState("");
  const [ara, setAra] = useState("");
  const [loading, setLoading] = useState(true);

  // Rapor modal
  const [raporId, setRaporId] = useState<string | null>(null);
  const [raporData, setRaporData] = useState<Degerlendirme | null>(null);
  const [raporLoading, setRaporLoading] = useState(false);

  useEffect(() => {
    Promise.all([getDegerlendirmeler(), getFormlar(), getPersoneller()]).then(([d, f, p]) => {
      setListe(d); setFormlar(f); setPersoneller(p); setLoading(false);
    });
  }, []);

  async function applyFilter() {
    setLoading(true);
    const filters: { personelId?: string; formId?: string } = {};
    if (filtrePersonel) filters.personelId = filtrePersonel;
    else if (filtreForm) filters.formId = filtreForm;
    setListe(await getDegerlendirmeler(filters));
    setLoading(false);
  }

  async function clearFilter() {
    setFiltrePersonel(""); setFiltreForm("");
    setLoading(true);
    setListe(await getDegerlendirmeler());
    setLoading(false);
  }

  async function openRapor(id: string) {
    setRaporId(id);
    setRaporLoading(true);
    setRaporData(null);
    const d = await getDegerlendirme(id);
    setRaporData(d);
    setRaporLoading(false);
  }

  const filtrelenmis = liste.filter((d) =>
    d.personelAd.toLowerCase().includes(ara.toLowerCase()) ||
    d.formAd.toLowerCase().includes(ara.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Değerlendirmeler</h1>
          <p className="text-sm text-slate-500 mt-0.5">{liste.length} kayıt</p>
        </div>
        <Link href="/degerlendirmeler/yeni"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
          <Plus size={15} /> Yeni Değerlendirme
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-slate-100">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Personel veya form ara..." value={ara} onChange={(e) => setAra(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select value={filtrePersonel} onChange={(e) => { setFiltrePersonel(e.target.value); setFiltreForm(""); }}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50">
              <option value="">Tüm Personel</option>
              {personeller.map((p) => <option key={p.id} value={p.id}>{p.ad}</option>)}
            </select>
            <select value={filtreForm} onChange={(e) => { setFiltreForm(e.target.value); setFiltrePersonel(""); }}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50">
              <option value="">Tüm Formlar</option>
              {formlar.map((f) => <option key={f.id} value={f.id}>{f.ad}</option>)}
            </select>
            <button onClick={applyFilter} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">Filtrele</button>
            {(filtrePersonel || filtreForm) && (
              <button onClick={clearFilter} className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">Temizle</button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : filtrelenmis.length === 0 ? (
          <EmptyState icon={ClipboardList} title="Değerlendirme bulunamadı" description="Yeni bir değerlendirme başlatmak için sağ üstteki butona tıklayın." />
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80">
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider w-10">#</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider w-32">Tarih</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Personel</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Form</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold text-slate-400 uppercase tracking-wider w-24">Tip</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold text-slate-400 uppercase tracking-wider w-36">Puan</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold text-slate-400 uppercase tracking-wider w-20">Rapor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtrelenmis.map((d, i) => {
                const tarih = d.tarih?.toDate?.() ?? new Date();
                const yuzde = d.puanli && d.maxPuan && d.maxPuan > 0 && d.toplamPuan !== null
                  ? Math.round((d.toplamPuan / d.maxPuan) * 100) : null;
                return (
                  <tr key={d.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3.5 text-sm text-slate-400 tabular-nums">{i + 1}</td>
                    <td className="px-4 py-3.5 text-sm text-slate-500 whitespace-nowrap">{tarih.toLocaleDateString("tr-TR")}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                          <span className="text-[10px] font-bold text-indigo-600">{d.personelAd.charAt(0).toUpperCase()}</span>
                        </div>
                        <span className="text-sm font-medium text-slate-800">{d.personelAd}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-600">{d.formAd}</td>
                    <td className="px-4 py-3.5 text-center"><Badge variant={d.puanli ? "puanli" : "puansiz"} /></td>
                    <td className="px-4 py-3.5 text-center">
                      {d.puanli && d.toplamPuan !== null ? (
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-sm font-semibold text-slate-800">{d.toplamPuan} / {d.maxPuan}</span>
                          {yuzde !== null && (
                            <div className="flex items-center gap-1.5 w-full max-w-[80px]">
                              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${yuzde >= 80 ? "bg-emerald-500" : yuzde >= 50 ? "bg-amber-400" : "bg-red-400"}`} style={{ width: `${yuzde}%` }} />
                              </div>
                              <span className="text-[10px] font-semibold text-slate-500 shrink-0">%{yuzde}</span>
                            </div>
                          )}
                        </div>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end">
                        <button onClick={() => openRapor(d.id)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Raporu Görüntüle">
                          <Eye size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {!loading && filtrelenmis.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50">
            <p className="text-xs text-slate-400">{filtrelenmis.length} kayıt listeleniyor</p>
          </div>
        )}
      </div>

      {/* Rapor Modal */}
      <Modal open={!!raporId} onClose={() => { setRaporId(null); setRaporData(null); }} title="Değerlendirme Raporu" size="lg">
        {raporLoading ? (
          <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : raporData ? (
          <div className="space-y-4">
            {/* Özet */}
            <div className="bg-slate-50 rounded-xl p-4 flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900">{raporData.formAd}</p>
                  <Badge variant={raporData.puanli ? "puanli" : "puansiz"} />
                </div>
                <p className="text-sm text-slate-600"><span className="font-medium">Personel:</span> {raporData.personelAd}</p>
                <p className="text-sm text-slate-600">
                  <span className="font-medium">Tarih:</span> {(raporData.tarih?.toDate?.() ?? new Date()).toLocaleDateString("tr-TR")}
                </p>
              </div>
              {raporData.puanli && raporData.toplamPuan !== null && (
                <div className="text-right">
                  <p className="text-3xl font-bold text-indigo-600">{raporData.toplamPuan}</p>
                  <p className="text-xs text-slate-400">/ {raporData.maxPuan} puan</p>
                  {raporData.maxPuan && raporData.maxPuan > 0 && (
                    <p className="text-sm font-semibold text-slate-600 mt-0.5">
                      %{Math.round((raporData.toplamPuan / raporData.maxPuan) * 100)}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Bölümler */}
            <div className="space-y-3">
              {Object.keys(raporData.bolumSnapshot).map((bolumId) => {
                const bolum = raporData.bolumSnapshot[bolumId];
                const bolumPuan = bolum.soruIdleri.reduce((t, sid) => {
                  const c = raporData.cevaplar[sid];
                  const s = raporData.soruSnapshot[sid];
                  return c === "evet" && s ? t + s.puan : t;
                }, 0);
                const bolumMax = bolum.soruIdleri.reduce((t, sid) => {
                  const c = raporData.cevaplar[sid];
                  const s = raporData.soruSnapshot[sid];
                  return c !== "muaf" && s ? t + s.puan : t;
                }, 0);
                return (
                  <div key={bolumId} className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-800">{bolum.ad}</p>
                      {raporData.puanli && (
                        <p className="text-xs font-semibold text-indigo-600">{bolumPuan} / {bolumMax} p</p>
                      )}
                    </div>
                    <div className="divide-y divide-slate-50">
                      {bolum.soruIdleri.map((soruId, idx) => {
                        const soru = raporData.soruSnapshot[soruId];
                        const cevap = raporData.cevaplar[soruId];
                        const style = cevapStyle[cevap] ?? { label: "—", className: "bg-slate-100 text-slate-400" };
                        return (
                          <div key={soruId} className="flex items-center gap-3 px-4 py-3">
                            <span className="text-xs text-slate-400 w-5 shrink-0">{idx + 1}.</span>
                            <p className="flex-1 text-sm text-slate-700">{soru?.metin}</p>
                            {raporData.puanli && soru && (
                              <span className="text-xs text-slate-400 shrink-0">{soru.puan} p</span>
                            )}
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${style.className}`}>
                              {style.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
