"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TrendingUp, CalendarDays, Store, Search, Users, UserPlus, UserMinus, Play, ArrowRight, ArrowLeft, ChevronLeft, ChevronRight, Star, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getDegerlendirmeler, getDegerlendirmelerByAyYil, getMagazalar, getAktifPersoneller, updatePersonel, getFormlar, getAcikDegerlendirmeler, getBolgeler, updateKullaniciFavoriMagazalar } from "@/lib/firestore";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import type { Degerlendirme, Magaza, Personel, Form, Bolge } from "@/types";

interface KameramanStats {
  buAyDeg: number;
  acikDeg: number;
  buHaftaDeg: number;
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
  const [bolgeler, setBolgeler] = useState<Bolge[]>([]);
  // Bu ay, herhangi bir kameraman tarafından oluşturulmuş tüm raporlar — havuzda
  // bir personelin başka mağazada da bulunup bulunmadığını göstermek için.
  const [buAyTumRaporlar, setBuAyTumRaporlar] = useState<Degerlendirme[]>([]);

  // Mağazalarım Tablosu: Favoriler, Arama, Bölge Müdürü Filtresi & Sayfalama
  const [favoriMagazaIdleri, setFavoriMagazaIdleri] = useState<string[]>([]);
  const [magazaGorunumu, setMagazaGorunumu] = useState<"favoriler" | "tumu">("favoriler");
  const [magazaSearchQuery, setMagazaSearchQuery] = useState("");
  const [filtreBolgeMuduru, setFiltreBolgeMuduru] = useState("");
  const [magazaPage, setMagazaPage] = useState(1);
  const MAGAZA_PAGE_SIZE = 10;

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
      const activeP = await getAktifPersoneller();
      setTumAktifPersoneller(activeP);
      setPersonellerMap((prev) => ({
        ...prev,
        [magazaId]: activeP.filter((p) => p.magazaIdleri?.includes(magazaId)),
      }));
    } catch (err) {
      console.error("Error refreshing personnel for store:", err);
    }
  }

  useEffect(() => {
    // `kullanici` (Firestore profili, favoriler dahil) `user`'dan bir adım sonra
    // hazır olur — ikisi de hazır olmadan yüklemeye başlarsak favoriler/mağazalar
    // geçici olarak boş verilerle set edilip, hangi isteğin geç döneceğine bağlı
    // olarak bu yanlış boş hâl kalıcı kalabilir (yenilemede favorilerin kaybolması buydu).
    if (!user || !kullanici) return;
    async function load() {
      setLoading(true);
      try {
        const now0 = new Date();
        const [f, activeP, allM, list, allBolgeler, ayRaporlari] = await Promise.all([
          getFormlar(),
          getAktifPersoneller(),
          getMagazalar(),
          getDegerlendirmeler({ kameramanId: user!.uid }),
          getBolgeler(),
          getDegerlendirmelerByAyYil(now0.getMonth(), now0.getFullYear()),
        ]);

        setFormlar(f);
        setTumAktifPersoneller(activeP);
        setDegerlendirmeler(list);
        setBolgeler(allBolgeler);
        setBuAyTumRaporlar(ayRaporlari);
        setFavoriMagazaIdleri(kullanici?.favoriMagazaIdleri || []);

        const authMagazaIdleri = kullanici?.magazaIdleri || [];
        const benimM = allM.filter((m) => authMagazaIdleri.includes(m.id));
        setMagazalar(benimM);

        // Mağaza başına ayrı sorgu atmak yerine (132 mağazada ~21sn'ye kadar
        // sürüyordu), tek seferde çekilen aktif personel listesi mağazalara göre
        // istemci tarafında gruplanır — tek sorgu, anlık render.
        const map: Record<string, Personel[]> = {};
        for (const m of benimM) {
          map[m.id] = activeP.filter((p) => p.magazaIdleri?.includes(m.id));
        }
        setPersonellerMap(map);

        const now = new Date();
        const ayBaslangic = new Date(now.getFullYear(), now.getMonth(), 1);
        const haftaBaslangic = new Date(now);
        haftaBaslangic.setDate(now.getDate() - now.getDay());
        haftaBaslangic.setHours(0, 0, 0, 0);

        setStats({
          buAyDeg: list.filter((d) => {
            const t = d.izlenmeTarihi?.toDate?.();
            return t && t >= ayBaslangic;
          }).length,
          acikDeg: list.filter((d) => d.durum === "acik").length,
          buHaftaDeg: list.filter((d) => {
            const t = d.izlenmeTarihi?.toDate?.();
            return t && t >= haftaBaslangic;
          }).length,
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
      const updatedMagazaIds = Array.from(new Set([...(personel.magazaIdleri || []), activeMagaza.id]));
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

  // Mağaza → Bölge Müdürü çözümlemesi: bu organizasyonda her "Bölge" kaydı,
  // bölge müdürünün adıyla oluşturulmuş (örn. "ERMAN CELEP" adlı bir bölge) —
  // yani Bölge.ad, doğrudan bölge müdürünün adıdır.
  const bolgeAdMap = useMemo(() => Object.fromEntries(bolgeler.map((b) => [b.id, b.ad])), [bolgeler]);

  function getBolgeMuduruAdi(magaza: Magaza): string | null {
    if (!magaza.bolgeId) return null;
    return bolgeAdMap[magaza.bolgeId] ?? null;
  }

  const bolgeMuduruSecenekleri = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of magazalar) {
      if (!m.bolgeId) continue;
      const ad = bolgeAdMap[m.bolgeId];
      if (ad) map.set(m.bolgeId, ad);
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1], "tr"));
  }, [magazalar, bolgeAdMap]);

  const toplamPersonelSayisi = useMemo(() => {
    const ids = new Set<string>();
    for (const m of magazalar) {
      for (const p of personellerMap[m.id] || []) ids.add(p.id);
    }
    return ids.size;
  }, [magazalar, personellerMap]);

  // Personel → bu ay rapor edildiği mağazalar (kim raporladıysa fark etmez).
  // Havuzdan çekerken "bu personel bu ay başka mağazada da bulundu" uyarısı için.
  const personelBuAyMagazalari = useMemo(() => {
    const map: Record<string, { magazaId: string; magazaAd: string }[]> = {};
    for (const d of buAyTumRaporlar) {
      if (!d.magazaId) continue;
      const list = map[d.personelId] ?? (map[d.personelId] = []);
      if (!list.some((m) => m.magazaId === d.magazaId)) {
        list.push({ magazaId: d.magazaId, magazaAd: d.magazaAd ?? "" });
      }
    }
    return map;
  }, [buAyTumRaporlar]);

  async function toggleFavori(magazaId: string) {
    if (!user) return;
    const isFavori = favoriMagazaIdleri.includes(magazaId);
    const next = isFavori
      ? favoriMagazaIdleri.filter((id) => id !== magazaId)
      : [...favoriMagazaIdleri, magazaId];
    setFavoriMagazaIdleri(next);
    try {
      await updateKullaniciFavoriMagazalar(user.uid, next);
    } catch (err) {
      console.error("Error updating favorite stores:", err);
      setFavoriMagazaIdleri(favoriMagazaIdleri);
    }
  }

  const goruntulenecekMagazalar = useMemo(() => {
    return magazaGorunumu === "favoriler"
      ? magazalar.filter((m) => favoriMagazaIdleri.includes(m.id))
      : magazalar;
  }, [magazalar, magazaGorunumu, favoriMagazaIdleri]);

  const filtrelenmisMagazalar = useMemo(() => {
    const q = magazaSearchQuery.trim().toLowerCase();
    return goruntulenecekMagazalar.filter((m) => {
      if (q && !m.ad.toLowerCase().includes(q) && !(m.adres ?? "").toLowerCase().includes(q)) return false;
      if (filtreBolgeMuduru && m.bolgeId !== filtreBolgeMuduru) return false;
      return true;
    });
  }, [goruntulenecekMagazalar, magazaSearchQuery, filtreBolgeMuduru]);

  useEffect(() => {
    setMagazaPage(1);
  }, [magazaSearchQuery, filtreBolgeMuduru, magazaGorunumu]);

  const magazaToplamSayfa = Math.max(1, Math.ceil(filtrelenmisMagazalar.length / MAGAZA_PAGE_SIZE));
  const magazaGuvenliSayfa = Math.min(magazaPage, magazaToplamSayfa);
  const magazaSayfaBaslangic = (magazaGuvenliSayfa - 1) * MAGAZA_PAGE_SIZE;
  const sayfalanmisMagazalar = filtrelenmisMagazalar.slice(magazaSayfaBaslangic, magazaSayfaBaslangic + MAGAZA_PAGE_SIZE);

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
          <StatKart icon={CalendarDays} title="Bu Ay Toplam Rapor" value={stats?.buAyDeg ?? 0} renk="bg-blue-500" />
          <StatKart icon={Play} title="Devam Eden Rapor" value={stats?.acikDeg ?? 0} renk="bg-amber-500" />
          <StatKart icon={TrendingUp} title="Bu Hafta Rapor" value={stats?.buHaftaDeg ?? 0} renk="bg-teal-500" />
          <StatKart icon={Users} title="Toplam Personel" value={toplamPersonelSayisi} renk="bg-violet-500" />
        </div>
      )}

      {/* ANA GÖRÜNÜM TERCİHİ (SPA NAVİGASYON) */}
      {!activeMagaza ? (
        /* ════════ A. MAĞAZALARIM LİSTESİ GÖRÜNÜMÜ (TABLO FORMATI) ════════ */
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-base font-semibold text-slate-800">Mağazalarım</h2>
              <p className="text-xs text-slate-500 mt-0.5">Yönetmek ve personellerini görüntülemek istediğiniz mağazayı tablodan seçin.</p>
            </div>

            {!loading && magazalar.length > 0 && (
              <div className="inline-flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                <button
                  onClick={() => setMagazaGorunumu("favoriler")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                    magazaGorunumu === "favoriler" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <Star size={12} className={magazaGorunumu === "favoriler" ? "fill-indigo-500 text-indigo-500" : ""} />
                  Favorilerim
                  <span className="text-[10px] text-slate-400">{favoriMagazaIdleri.length}</span>
                </button>
                <button
                  onClick={() => setMagazaGorunumu("tumu")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                    magazaGorunumu === "tumu" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <Store size={12} />
                  Tüm Mağazalar
                  <span className="text-[10px] text-slate-400">{magazalar.length}</span>
                </button>
              </div>
            )}
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
              {/* Tablo İçi Arama & Filtre Barı */}
              <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100 flex-wrap bg-slate-50/40">
                <div className="relative flex-1 min-w-50 max-w-xs">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Mağaza adı veya adres ara..."
                    value={magazaSearchQuery}
                    onChange={(e) => setMagazaSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                </div>
                {bolgeMuduruSecenekleri.length > 0 && (
                  <select
                    value={filtreBolgeMuduru}
                    onChange={(e) => setFiltreBolgeMuduru(e.target.value)}
                    className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-600"
                  >
                    <option value="">Tüm Bölge Müdürleri</option>
                    {bolgeMuduruSecenekleri.map(([id, ad]) => (
                      <option key={id} value={id}>{ad}</option>
                    ))}
                  </select>
                )}
                {(magazaSearchQuery || filtreBolgeMuduru) && (
                  <span className="text-xs text-slate-400 ml-auto whitespace-nowrap">
                    {filtrelenmisMagazalar.length} sonuç
                  </span>
                )}
              </div>

              {magazaGorunumu === "favoriler" && favoriMagazaIdleri.length === 0 ? (
                <div className="py-16 text-center px-6">
                  <Star className="text-slate-300 mx-auto mb-3" size={32} />
                  <p className="text-sm font-semibold text-slate-700">Henüz Favori Mağaza Eklemediniz</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    "Tüm Mağazalar" listesinden yıldız ikonuna tıklayarak sık kullandığınız mağazaları favorilerinize ekleyebilirsiniz.
                  </p>
                  <button
                    onClick={() => setMagazaGorunumu("tumu")}
                    className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-lg hover:bg-indigo-100 transition-colors"
                  >
                    <Store size={13} /> Tüm Mağazaları Görüntüle
                  </button>
                </div>
              ) : filtrelenmisMagazalar.length === 0 ? (
                <div className="py-16 text-center">
                  <Search className="text-slate-300 mx-auto mb-3" size={32} />
                  <p className="text-sm font-semibold text-slate-700">Aramaya Uygun Mağaza Bulunamadı</p>
                  <p className="text-xs text-slate-400 mt-1">Farklı bir arama terimi veya filtre deneyin.</p>
                </div>
              ) : (
                <>
                  <div>
                    <table className="w-full text-left border-collapse table-fixed">
                      <colgroup>
                        <col className="w-11" />
                        <col />
                        <col />
                        <col className="w-40" />
                        <col className="w-36" />
                        <col className="w-40" />
                      </colgroup>
                      <thead>
                        <tr className="bg-slate-50/70 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          <th className="px-4 py-4"></th>
                          <th className="px-6 py-4">Mağaza Adı</th>
                          <th className="px-6 py-4">Adres</th>
                          <th className="px-6 py-4">Bölge Müdürü</th>
                          <th className="px-6 py-4 text-center">Çalışan Sayısı</th>
                          <th className="px-6 py-4 text-right">İşlem</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {sayfalanmisMagazalar.map((magaza) => {
                          const pList = personellerMap[magaza.id] || [];
                          const bolgeMuduruAdi = getBolgeMuduruAdi(magaza);
                          const isFavori = favoriMagazaIdleri.includes(magaza.id);
                          return (
                            <tr
                              key={magaza.id}
                              onClick={() => {
                                setActiveMagaza(magaza);
                                setStoreSearchQuery("");
                              }}
                              className="hover:bg-slate-50/80 cursor-pointer transition-colors duration-150 group"
                            >
                              <td className="px-4 py-4 text-center">
                                <button
                                  onClick={(e) => { e.stopPropagation(); toggleFavori(magaza.id); }}
                                  title={isFavori ? "Favorilerden çıkar" : "Favorilere ekle"}
                                  className="p-1 text-slate-300 hover:text-amber-400 transition-colors"
                                >
                                  <Star size={16} className={isFavori ? "fill-amber-400 text-amber-400" : ""} />
                                </button>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0 group-hover:bg-indigo-100 transition-colors">
                                    <Store size={15} className="text-indigo-600" />
                                  </div>
                                  <span className="font-semibold text-slate-800 text-sm truncate group-hover:text-indigo-950 transition-colors">
                                    {magaza.ad}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-slate-500 truncate">
                                {magaza.adres || <span className="text-slate-300">—</span>}
                              </td>
                              <td className="px-6 py-4 text-sm text-slate-500 truncate">
                                {bolgeMuduruAdi || <span className="text-slate-300">—</span>}
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

                  {magazaToplamSayfa > 1 && (
                    <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex-wrap gap-3">
                      <p className="text-xs text-slate-400">
                        {magazaSayfaBaslangic + 1}–{Math.min(magazaSayfaBaslangic + MAGAZA_PAGE_SIZE, filtrelenmisMagazalar.length)} / <span className="font-medium text-slate-600">{filtrelenmisMagazalar.length}</span> mağaza
                      </p>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setMagazaPage((p) => Math.max(1, p - 1))}
                          disabled={magazaGuvenliSayfa === 1}
                          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronLeft size={14} />
                        </button>
                        {Array.from({ length: magazaToplamSayfa }, (_, i) => i + 1).map((p) => (
                          <button
                            key={p}
                            onClick={() => setMagazaPage(p)}
                            className={`min-w-7 h-7 px-2 rounded-lg text-xs font-medium transition-colors ${
                              p === magazaGuvenliSayfa ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            {p}
                          </button>
                        ))}
                        <button
                          onClick={() => setMagazaPage((p) => Math.min(magazaToplamSayfa, p + 1))}
                          disabled={magazaGuvenliSayfa === magazaToplamSayfa}
                          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
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
              // Havuzda tüm aktif personel gösterilir — başka mağazada veya bu mağazada
              // zaten kayıtlı olsa dahi gizlenmez, istenildiği zaman tekrar seçilebilir.
              const currentStorePersonnelIds = personellerMap[activeMagaza.id]?.map((p) => p.id) || [];
              const filteredPool = tumAktifPersoneller.filter((p) => p.ad.toLowerCase().includes(poolSearchQuery.toLowerCase()) || (p.tc && p.tc.includes(poolSearchQuery)));

              if (filteredPool.length === 0) {
                return (
                  <div className="py-8 text-center text-slate-400 text-sm">
                    {poolSearchQuery ? "Aramaya uygun personel bulunamadı." : "Havuzda aktif personel bulunmuyor."}
                  </div>
                );
              }

              return filteredPool.map((p) => {
                const zatenEkli = currentStorePersonnelIds.includes(p.id);
                const digerMagazalar = (personelBuAyMagazalari[p.id] || []).filter((m) => m.magazaId !== activeMagaza.id);
                return (
                  <div key={p.id} className="flex items-center justify-between p-3 hover:bg-slate-50 transition-colors">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold text-slate-800 truncate">{p.ad}</p>
                        {digerMagazalar.length > 0 && (
                          <span
                            title={`Bu ay ayrıca şu mağazalarda bulundu: ${digerMagazalar.map((m) => m.magazaAd).join(", ")}`}
                            className="shrink-0 text-amber-500 cursor-help"
                          >
                            <AlertTriangle size={13} />
                          </span>
                        )}
                      </div>
                      {p.tc && <p className="text-[10px] text-slate-400 font-mono mt-0.5">{p.tc}</p>}
                    </div>
                    <button
                      onClick={() => handleHavuzEkle(p)}
                      disabled={poolLoading}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors disabled:opacity-60 ${
                        zatenEkli
                          ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-700"
                          : "bg-indigo-50 hover:bg-indigo-100 text-indigo-700"
                      }`}
                    >
                      {poolLoading ? "Ekleniyor..." : zatenEkli ? "Bu Mağazada ✓" : "Mağazaya Ekle"}
                    </button>
                  </div>
                );
              });
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
