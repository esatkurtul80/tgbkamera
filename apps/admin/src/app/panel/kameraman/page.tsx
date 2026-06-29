"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, TrendingUp, CalendarDays, CheckCircle2, Store, Search, Users, UserPlus, UserMinus, Play, ArrowRight, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getDegerlendirmeler, getMagazalar, getAktifPersoneller, getPersonellerByMagaza, updatePersonel, getFormlar, getAcikDegerlendirmeler } from "@/lib/firestore";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import type { Degerlendirme, Magaza, Personel, Form } from "@/types";

interface KameramanStats {
  toplamDeg: number;
  buAyDeg: number;
  buHaftaDeg: number;
  puanliDeg: number;
}

function StatKart({ icon: Icon, title, value, renk }: {
  icon: React.ElementType; title: string; value: number; renk: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex-1 min-w-[200px]">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${renk}`}>
        <Icon size={16} className="text-white" />
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-sm text-slate-500 mt-0.5">{title}</p>
    </div>
  );
}

export default function KameramanPaneliPage() {
  const router = useRouter();
  const { user, kullanici } = useAuth();
  const [degerlendirmeler, setDegerlendirmeler] = useState<Degerlendirme[]>([]);
  const [stats, setStats] = useState<KameramanStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Store & Personnel States
  const [magazalar, setMagazalar] = useState<Magaza[]>([]);
  const [personellerMap, setPersonellerMap] = useState<Record<string, Personel[]>>({});
  const [tumAktifPersoneller, setTumAktifPersoneller] = useState<Personel[]>([]);
  const [formlar, setFormlar] = useState<Form[]>([]);
  
  // SPA Sub-navigation: Active Store for Detail View
  const [activeMagaza, setActiveMagaza] = useState<Magaza | null>(null);
  const [storeSearchQuery, setStoreSearchQuery] = useState("");

  // Pool Ingestion State
  const [isPoolModalOpen, setIsPoolModalOpen] = useState(false);
  const [poolSearchQuery, setPoolSearchQuery] = useState("");
  const [poolLoading, setPoolLoading] = useState(false);

  // Raporlama Modal State (unified: devam eden + yeni rapor)
  const [raporModalPersonel, setRaporModalPersonel] = useState<Personel | null>(null);
  const [acikRaporlar, setAcikRaporlar] = useState<Degerlendirme[]>([]);
  const [raporModalYukleniyor, setRaporModalYukleniyor] = useState(false);

  // Remove Personnel Confirmation State
  const [removePersonel, setRemovePersonel] = useState<Personel | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);

  async function refreshPersonnelForMagaza(magazaId: string) {
    try {
      const pList = await getPersonellerByMagaza(magazaId);
      setPersonellerMap((prev) => ({ ...prev, [magazaId]: pList }));
      const activeP = await getAktifPersoneller();
      setTumAktifPersoneller(activeP);
    } catch (err) {
      console.error("Error refreshing personnel for store:", err);
    }
  }

  useEffect(() => {
    if (!user) return;
    async function load() {
      setLoading(true);
      try {
        const [f, activeP, allM, list] = await Promise.all([
          getFormlar(),
          getAktifPersoneller(),
          getMagazalar(),
          getDegerlendirmeler({ kameramanId: user!.uid }),
        ]);

        setFormlar(f);
        setTumAktifPersoneller(activeP);
        setDegerlendirmeler(list);

        const authMagazaIdleri = kullanici?.magazaIdleri || [];
        const benimM = allM.filter((m) => authMagazaIdleri.includes(m.id));
        setMagazalar(benimM);

        const map: Record<string, Personel[]> = {};
        for (const m of benimM) {
          const pList = await getPersonellerByMagaza(m.id);
          map[m.id] = pList;
        }
        setPersonellerMap(map);

        const now = new Date();
        const ayBaslangic = new Date(now.getFullYear(), now.getMonth(), 1);
        const haftaBaslangic = new Date(now);
        haftaBaslangic.setDate(now.getDate() - now.getDay());
        haftaBaslangic.setHours(0, 0, 0, 0);

        setStats({
          toplamDeg: list.length,
          buAyDeg: list.filter((d) => {
            const t = d.izlenmeTarihi?.toDate?.();
            return t && t >= ayBaslangic;
          }).length,
          buHaftaDeg: list.filter((d) => {
            const t = d.izlenmeTarihi?.toDate?.();
            return t && t >= haftaBaslangic;
          }).length,
          puanliDeg: list.filter((d) => d.puanli).length,
        });
      } catch (err) {
        console.error("Error loading cameraman panel data:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user, kullanici]);

  // Ingestion handlers
  const handleHavuzTikla = () => {
    if (!activeMagaza) return;
    setPoolSearchQuery("");
    setIsPoolModalOpen(true);
  };

  const handleHavuzEkle = async (personel: Personel) => {
    if (!activeMagaza) return;
    setPoolLoading(true);
    try {
      const updatedMagazaIds = [...(personel.magazaIdleri || []), activeMagaza.id];
      await updatePersonel(personel.id, {
        ad: personel.ad,
        tc: personel.tc || "",
        magazaIdleri: updatedMagazaIds,
        aktif: personel.aktif,
      });
      await refreshPersonnelForMagaza(activeMagaza.id);
      setIsPoolModalOpen(false);
    } catch (err) {
      console.error("Error adding personnel to store:", err);
    } finally {
      setPoolLoading(false);
    }
  };

  // Removal handlers
  const handleCikarTikla = (personel: Personel) => {
    if (!activeMagaza) return;
    setRemovePersonel(personel);
    setIsConfirmOpen(true);
  };

  const handleCikarOnay = async () => {
    if (!removePersonel || !activeMagaza) return;
    setConfirmLoading(true);
    try {
      const updatedMagazaIds = (removePersonel.magazaIdleri || []).filter((id) => id !== activeMagaza.id);
      await updatePersonel(removePersonel.id, {
        ad: removePersonel.ad,
        tc: removePersonel.tc || "",
        magazaIdleri: updatedMagazaIds,
        aktif: removePersonel.aktif,
      });
      await refreshPersonnelForMagaza(activeMagaza.id);
      setIsConfirmOpen(false);
      setRemovePersonel(null);
    } catch (err) {
      console.error("Error removing personnel from store:", err);
    } finally {
      setConfirmLoading(false);
    }
  };

  // Evaluation launchers
  const handleDegeBaslat = (personel: Personel) => {
    if (!activeMagaza) return;
    setAcikRaporlar([]);
    setRaporModalPersonel(personel);
    setRaporModalYukleniyor(true);
    const simdi = new Date();
    getAcikDegerlendirmeler(personel.id, activeMagaza.id, simdi.getMonth(), simdi.getFullYear())
      .then(setAcikRaporlar)
      .catch(console.error)
      .finally(() => setRaporModalYukleniyor(false));
  };

  const handleFormSec = (formId: string) => {
    if (!raporModalPersonel || !activeMagaza) return;
    setRaporModalPersonel(null);
    router.push(`/degerlendirmeler/yeni?magazaId=${activeMagaza.id}&personelId=${raporModalPersonel.id}&formId=${formId}`);
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Üst Bilgi ve Başlık */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Merhaba, {kullanici?.displayName?.split(" ")[0]} 👋
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {new Date().toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
      </div>

      {/* Stat kartları */}
      {loading ? (
        <div className="flex gap-4 flex-wrap w-full animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl h-28 border border-slate-100 flex-1 min-w-[200px]" />
          ))}
        </div>
      ) : (
        <div className="flex gap-4 flex-wrap w-full">
          <StatKart icon={ClipboardList} title="Toplam Rapor" value={stats?.toplamDeg ?? 0} renk="bg-indigo-500" />
          <StatKart icon={CalendarDays} title="Bu Ay" value={stats?.buAyDeg ?? 0} renk="bg-blue-500" />
          <StatKart icon={TrendingUp} title="Bu Hafta" value={stats?.buHaftaDeg ?? 0} renk="bg-teal-500" />
          <StatKart icon={CheckCircle2} title="Puanlı Rapor" value={stats?.puanliDeg ?? 0} renk="bg-violet-500" />
        </div>
      )}

      {/* ANA GÖRÜNÜM TERCİHİ (SPA NAVİGASYON) */}
      {!activeMagaza ? (
        /* ════════ A. MAĞAZALARIM LİSTESİ GÖRÜNÜMÜ (TABLO FORMATI) ════════ */
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-slate-800">Mağazalarım</h2>
            <p className="text-xs text-slate-500 mt-0.5">Yönetmek ve personellerini görüntülemek istediğiniz mağazayı tablodan seçin.</p>
          </div>

          {loading ? (
            <div className="bg-white rounded-2xl h-48 border border-slate-100 animate-pulse" />
          ) : magazalar.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
              <Store className="text-slate-300 mx-auto mb-3" size={32} />
              <p className="text-sm font-semibold text-slate-700">Yetkili Mağaza Bulunmuyor</p>
              <p className="text-xs text-slate-400 mt-1">Yönetici tarafından size mağaza yetkilendirmesi yapılması gerekmektedir.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="px-6 py-4">Mağaza Adı</th>
                      <th className="px-6 py-4">Adres</th>
                      <th className="px-6 py-4 text-center">Çalışan Sayısı</th>
                      <th className="px-6 py-4 text-right">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {magazalar.map((magaza) => {
                      const pList = personellerMap[magaza.id] || [];
                      return (
                        <tr 
                          key={magaza.id}
                          onClick={() => {
                            setActiveMagaza(magaza);
                            setStoreSearchQuery("");
                          }}
                          className="hover:bg-slate-50/80 cursor-pointer transition-colors duration-150 group"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0 group-hover:bg-indigo-100 transition-colors">
                                <Store size={15} className="text-indigo-600" />
                              </div>
                              <span className="font-semibold text-slate-800 text-sm group-hover:text-indigo-950 transition-colors">
                                {magaza.ad}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate">
                            {magaza.adres || <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-6 py-4 text-center whitespace-nowrap">
                            <span className="inline-flex items-center justify-center bg-indigo-50 text-indigo-700 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                              {pList.length} Personel
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right whitespace-nowrap text-xs font-bold text-indigo-600 group-hover:translate-x-0.5 transition-transform">
                            Personel Listesi →
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      ) : (
        /* ════════ B. SEÇİLİ MAĞAZA / PERSONEL DETAY GÖRÜNÜMÜ ════════ */
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Mağaza Detay Başlığı */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3 min-w-0">
              <button 
                onClick={() => setActiveMagaza(null)}
                className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-xl border border-slate-200 shrink-0 transition-all"
                title="Mağazalarıma Geri Dön"
              >
                <ArrowLeft size={16} />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Mağaza Detayı</span>
                  <span className="bg-teal-50 text-teal-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {(personellerMap[activeMagaza.id] || []).length} Çalışan
                  </span>
                </div>
                <h2 className="text-lg font-bold text-slate-800 mt-0.5 truncate">{activeMagaza.ad}</h2>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleHavuzTikla}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-sm shadow-indigo-100"
              >
                <UserPlus size={14} /> Havuzdan Personel Çek
              </button>
            </div>
          </div>

          {/* Mağaza Personel Listesi */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <h3 className="font-bold text-slate-800 text-sm">Personel Listesi</h3>
              
              {/* Local Personnel Filter */}
              {(personellerMap[activeMagaza.id] || []).length > 0 && (
                <div className="relative w-64">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Mağaza personeli ara..."
                    value={storeSearchQuery}
                    onChange={(e) => setStoreSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
                  />
                </div>
              )}
            </div>

            {/* List Body */}
            {(() => {
              const pList = personellerMap[activeMagaza.id] || [];
              const filteredList = pList.filter((p) => p.ad.toLowerCase().includes(storeSearchQuery.toLowerCase()));

              if (pList.length === 0) {
                return (
                  <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center border border-dashed border-slate-100 rounded-xl">
                    <Users size={32} className="text-slate-300 mb-2" />
                    <p className="text-sm font-semibold text-slate-700">Bu Mağazada Personel Bulunmuyor</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm">
                      Kameraman olarak bu mağazada raporlamak istediğiniz personelleri sağ üstteki "Havuzdan Personel Çek" butonu ile ortak havuzdan buraya ekleyebilirsiniz.
                    </p>
                  </div>
                );
              }

              if (filteredList.length === 0) {
                return (
                  <div className="py-8 text-center text-slate-400 text-sm">
                    Aramaya uygun personel bulunamadı.
                  </div>
                );
              }

              return (
                <div className="border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-100">
                  {filteredList.map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-4 p-4 hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-indigo-600">{p.ad.charAt(0).toUpperCase()}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">{p.ad}</p>
                          {p.tc && <p className="text-xs text-slate-400 font-mono mt-0.5">{p.tc}</p>}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleDegeBaslat(p)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 active:scale-[0.97] transition-all shadow-sm shadow-emerald-50"
                        >
                          <Play size={10} fill="currentColor" /> Raporla
                        </button>
                        <button
                          onClick={() => handleCikarTikla(p)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-100 rounded-xl text-xs font-semibold transition-all"
                        >
                          <UserMinus size={12} /> Mağazadan Çıkar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Havuzdan Personel Çek Modalı */}
      <Modal open={isPoolModalOpen} onClose={() => setIsPoolModalOpen(false)} title={`${activeMagaza?.ad} - Havuzdan Personel Çek`}>
        <div className="space-y-4">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Personel adı veya TC ile ara..."
              value={poolSearchQuery}
              onChange={(e) => setPoolSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
            />
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-60 overflow-y-auto">
            {(() => {
              if (!activeMagaza) return null;
              const currentStorePersonnelIds = personellerMap[activeMagaza.id]?.map((p) => p.id) || [];
              const pool = tumAktifPersoneller.filter((p) => !currentStorePersonnelIds.includes(p.id));
              const filteredPool = pool.filter((p) => p.ad.toLowerCase().includes(poolSearchQuery.toLowerCase()) || (p.tc && p.tc.includes(poolSearchQuery)));

              if (filteredPool.length === 0) {
                return (
                  <div className="py-8 text-center text-slate-400 text-sm">
                    {poolSearchQuery ? "Aramaya uygun personel bulunamadı." : "Havuzda eklenebilecek aktif personel kalmadı."}
                  </div>
                );
              }

              return filteredPool.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 hover:bg-slate-50 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{p.ad}</p>
                    {p.tc && <p className="text-[10px] text-slate-400 font-mono mt-0.5">{p.tc}</p>}
                  </div>
                  <button
                    onClick={() => handleHavuzEkle(p)}
                    disabled={poolLoading}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg transition-colors disabled:opacity-60"
                  >
                    {poolLoading ? "Ekleniyor..." : "Mağazaya Ekle"}
                  </button>
                </div>
              ));
            })()}
          </div>
        </div>
      </Modal>

      {/* Raporlama Modalı — devam eden raporlar + yeni rapor */}
      <Modal
        open={!!raporModalPersonel}
        onClose={() => setRaporModalPersonel(null)}
        title={`${raporModalPersonel?.ad} — Raporlama`}
      >
        <div className="space-y-5">
          {raporModalYukleniyor ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Devam Eden Raporlar */}
              {acikRaporlar.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Devam Eden Raporlar</p>
                  <div className="border border-amber-200 rounded-xl overflow-hidden divide-y divide-amber-100">
                    {acikRaporlar.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => {
                          setRaporModalPersonel(null);
                          router.push(`/degerlendirmeler/yeni?devam=${r.id}`);
                        }}
                        className="w-full text-left p-4 hover:bg-amber-50 transition-colors flex items-center justify-between group"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                            <p className="text-sm font-bold text-slate-800 group-hover:text-amber-900">{r.formAd}</p>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5 ml-4">
                            Başlangıç: {r.olusturmaTarihi?.toDate?.().toLocaleDateString("tr-TR")}
                            {r.izlenmeler?.length > 0 && ` · ${r.izlenmeler.length} izlenme`}
                          </p>
                        </div>
                        <ArrowRight size={14} className="text-amber-400 group-hover:text-amber-600 transition-transform group-hover:translate-x-1 shrink-0 ml-4" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Yeni Rapor Başlat */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  {acikRaporlar.length > 0 ? "Yeni Rapor Başlat" : "Değerlendirme Formu Seç"}
                </p>
                {acikRaporlar.length === 0 && (
                  <p className="text-xs text-slate-500">
                    <span className="font-semibold text-slate-700">{raporModalPersonel?.ad}</span> personeli için başlatılacak denetim formunu seçin.
                  </p>
                )}
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-60 overflow-y-auto">
                  {formlar.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-sm">
                      Aktif değerlendirme formu bulunmuyor.
                    </div>
                  ) : (
                    formlar.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => handleFormSec(f.id)}
                        className="w-full text-left p-4 hover:bg-indigo-50/40 transition-colors flex items-center justify-between group"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-800 group-hover:text-indigo-950">{f.ad}</p>
                          {f.aciklama && <p className="text-xs text-slate-400 mt-1 truncate">{f.aciklama}</p>}
                        </div>
                        <ArrowRight size={14} className="text-slate-400 group-hover:text-indigo-600 transition-transform group-hover:translate-x-1 shrink-0 ml-4" />
                      </button>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Mağazadan Çıkarma Onay Modalı */}
      <ConfirmDialog
        open={isConfirmOpen}
        title="Personeli Mağazadan Çıkar"
        description={`${removePersonel?.ad} adlı personeli ${activeMagaza?.ad} mağazasından çıkarmak istediğinizden emin misiniz? (Geçmiş değerlendirme raporları silinmez)`}
        confirmLabel="Mağazadan Çıkar"
        onConfirm={handleCikarOnay}
        onCancel={() => setIsConfirmOpen(false)}
        loading={confirmLoading}
      />
    </div>
  );
}
