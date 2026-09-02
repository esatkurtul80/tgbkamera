"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, FileText, User, Store, Calendar, Check, Loader2, WifiOff } from "lucide-react";
import { Timestamp } from "firebase/firestore";
import { generateCustomId } from "@/lib/idUtils";
import { createDegerlendirme, updateDegerlendirme } from "@/lib/firestore";
import { uploadDegerlendirmeFoto } from "@/lib/storage";
import { puansizCevapDoluMu } from "@/lib/puansiz";
import { useOnlineStatus } from "@/lib/useOnlineStatus";
import { PuansizCevapInput, PuansizNotAlani } from "./PuansizCevapAlani";
import PuansizFotoStrip from "./PuansizFotoStrip";
import type { Bolum, Form, Magaza, Personel, PuansizCevapDegeri, Soru, SoruTipi, BolumSnapshot, SoruSnapshot } from "@/types";

interface BolumDetay extends Bolum {
  sorular: Soru[];
}

const TIP_LABEL: Record<SoruTipi, string> = {
  evet_hayir_muaf: "Çoktan Seçmeli",
  sayi: "Sayı",
  tarih: "Tarih",
  saat: "Saat",
  kisa_metin: "Kısa Yanıt",
  yorum: "Paragraf",
};

interface PuansizDegerlendirmeFormuProps {
  form: Form;
  bolumDetaylar: BolumDetay[];
  personel: Personel;
  magaza: Magaza;
  kameramanId: string;
  kameramanAd: string;
  /** Devam edilen açık bir raporun ID'si — verilirse yeni kayıt oluşturmak yerine bu kayıt tamamlanır (kapali). */
  mevcutId?: string;
  /** Devam edilen raporun daha önce girilmiş cevapları (varsa). */
  mevcutPuansizCevaplar?: Record<string, PuansizCevapDegeri>;
  mevcutIzlenmeTarihi?: string;
  /** Devam edilen "yorumlu puanlı" raporun daha önce girilmiş toplam puanı (varsa). */
  mevcutToplamPuan?: number | null;
  onGeri: () => void;
}

function bugunISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function PuansizDegerlendirmeFormu({
  form,
  bolumDetaylar,
  personel,
  magaza,
  kameramanId,
  kameramanAd,
  mevcutId,
  mevcutPuansizCevaplar,
  mevcutIzlenmeTarihi,
  mevcutToplamPuan,
  onGeri,
}: PuansizDegerlendirmeFormuProps) {
  const router = useRouter();
  const online = useOnlineStatus();
  const isManuel = form.puanli && form.puanGirisTipi === "manuel";
  const [izlenmeTarihi, setIzlenmeTarihi] = useState(mevcutIzlenmeTarihi ?? bugunISO());
  const [puansizCevaplar, setPuansizCevaplar] = useState<Record<string, PuansizCevapDegeri>>(mevcutPuansizCevaplar ?? {});
  const [pendingFotolar, setPendingFotolar] = useState<Record<string, { file: File; url: string; hata?: boolean }[]>>({});
  const [toplamPuanGiris, setToplamPuanGiris] = useState(mevcutToplamPuan != null ? String(mevcutToplamPuan) : "");
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [hata, setHata] = useState("");
  const [senkronBekliyor, setSenkronBekliyor] = useState(false);

  const bekleyenFotoVarMi = Object.values(pendingFotolar).some((list) => list.length > 0);

  const toplamPuanSayisi = Number(toplamPuanGiris);
  const toplamPuanGecerli =
    !isManuel ||
    (toplamPuanGiris.trim() !== "" && Number.isFinite(toplamPuanSayisi) && toplamPuanSayisi >= 0 && toplamPuanSayisi <= 100);

  const tumSorular = bolumDetaylar.flatMap((b) => b.sorular);

  // Cevaplar değiştikçe açık rapora otomatik kaydet (durum'a dokunmadan) —
  // böylece yarıda bırakılırsa rapor "devam eden" olarak tabloda görünür.
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ilkRenderRef = useRef(true);
  useEffect(() => {
    if (!mevcutId) return;
    if (ilkRenderRef.current) { ilkRenderRef.current = false; return; }

    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(() => {
      setSenkronBekliyor(true);
      const tarih = new Date(izlenmeTarihi + "T12:00:00");
      // Rapor sahibi (kameramanId/Ad) ilk oluşturan kişide sabit kalır —
      // devam eden raporu başka biri sürdürse de sahiplik değişmez.
      updateDegerlendirme(mevcutId, {
        puansizCevaplar,
        izlenmeTarihi: Timestamp.fromDate(tarih),
      })
        .then(() => setSenkronBekliyor(false))
        .catch((err) => {
          // Bağlantı kopukken (kısa süreli) yazma başarısız olur — veriler bileşen state'inde
          // kalmaya devam eder, `online` true olunca bu effect yeniden tetiklenip tekrar dener.
          console.error(err);
        });
    }, 800);

    return () => {
      if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    };
  }, [mevcutId, puansizCevaplar, izlenmeTarihi, online]);

  function setCevap(soruId: string, patch: Partial<PuansizCevapDegeri>) {
    setPuansizCevaplar((prev) => ({ ...prev, [soruId]: { ...prev[soruId], ...patch } }));
  }

  // Aynı önizleme URL'i için aynı anda birden fazla yükleme denemesi başlatılmasını engeller
  // (ör. tekrar bağlanınca retry effect'i ile elle "tekrar dene" çakışmasın diye).
  const yuklemeDevamEdenlerRef = useRef<Set<string>>(new Set());

  function yukleFoto(soruId: string, item: { file: File; url: string }, idx: number) {
    if (yuklemeDevamEdenlerRef.current.has(item.url)) return;
    if (!mevcutId) return;
    yuklemeDevamEdenlerRef.current.add(item.url);
    setPendingFotolar((prev) => ({
      ...prev,
      [soruId]: (prev[soruId] ?? []).map((f) => (f.url === item.url ? { ...f, hata: false } : f)),
    }));

    uploadDegerlendirmeFoto(
      { degerlendirmeId: mevcutId, soruId, magazaAd: magaza.ad, personelAd: personel.ad, tarih: izlenmeTarihi },
      item.file,
      idx
    )
      .then((url) => {
        setPuansizCevaplar((prev) => ({
          ...prev,
          [soruId]: { ...prev[soruId], fotograflar: [...(prev[soruId]?.fotograflar ?? []), url] },
        }));
        setPendingFotolar((prev) => ({
          ...prev,
          [soruId]: (prev[soruId] ?? []).filter((f) => f.url !== item.url),
        }));
        URL.revokeObjectURL(item.url);
      })
      .catch((err) => {
        // Bağlantı kopukken (kısa süreli) yükleme başarısız olur — fotoğraf önizlemesi
        // "hata" durumuyla listede kalır, `online` true olunca otomatik tekrar denenir.
        console.error("Fotoğraf yüklenemedi:", err);
        setPendingFotolar((prev) => ({
          ...prev,
          [soruId]: (prev[soruId] ?? []).map((f) => (f.url === item.url ? { ...f, hata: true } : f)),
        }));
      })
      .finally(() => {
        yuklemeDevamEdenlerRef.current.delete(item.url);
      });
  }

  function fotoEkle(soruId: string, files: File[]) {
    const yeni = files.map((file) => ({ file, url: URL.createObjectURL(file) }));
    setPendingFotolar((prev) => ({ ...prev, [soruId]: [...(prev[soruId] ?? []), ...yeni] }));

    // Fotoğrafı hemen yükle (Kaydet'e kadar beklemek yerine) — böylece "geri" ile
    // ekrandan çıkılıp geri dönülse bile fotoğraf kaybolmaz, tıpkı diğer cevaplar gibi
    // otomatik kayda dahil olur. Taslak henüz oluşmadıysa (nadir), yükleme Kaydet anında yapılır.
    yeni.forEach((item, idx) => yukleFoto(soruId, item, idx));
  }

  // Bağlantı geri geldiğinde, kısa kesinti sırasında yüklenemeyen fotoğrafları otomatik tekrar dene.
  useEffect(() => {
    if (!online) return;
    Object.entries(pendingFotolar).forEach(([soruId, items]) => {
      items.forEach((item, idx) => {
        if (item.hata) yukleFoto(soruId, item, idx);
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  function fotoSil(soruId: string, index: number) {
    setPendingFotolar((prev) => {
      const silinen = prev[soruId]?.[index];
      if (silinen) URL.revokeObjectURL(silinen.url);
      return { ...prev, [soruId]: (prev[soruId] ?? []).filter((_, i) => i !== index) };
    });
  }

  function mevcutFotoSil(soruId: string, url: string) {
    setPuansizCevaplar((prev) => ({
      ...prev,
      [soruId]: { ...prev[soruId], fotograflar: (prev[soruId]?.fotograflar ?? []).filter((u) => u !== url) },
    }));
  }

  function soruCevaplandiMi(soru: Soru): boolean {
    return puansizCevapDoluMu(soru.tip ?? "evet_hayir_muaf", puansizCevaplar[soru.id]);
  }

  const cevaplananSayisi = tumSorular.filter(soruCevaplandiMi).length;
  const tamamlandi = cevaplananSayisi === tumSorular.length && tumSorular.length > 0;

  async function handleKaydet() {
    setHata("");
    setKaydediliyor(true);
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    try {
      const soruSnapshot: Record<string, SoruSnapshot> = {};
      tumSorular.forEach((s) => {
        soruSnapshot[s.id] = { metin: s.metin, puan: s.puan, hedefYuzde: s.hedefYuzde, tip: s.tip };
      });
      const bolumSnapshot: Record<string, BolumSnapshot> = {};
      bolumDetaylar.forEach((b) => {
        bolumSnapshot[b.id] = { ad: b.ad, soruIdleri: b.soruIdleri };
      });

      const docId = mevcutId ?? generateCustomId(personel.ad);

      // Bekleyen fotoğrafları yükle (mevcut fotoğraflar zaten puansizCevaplar içinde tutuluyor)
      const entries = await Promise.all(
        Object.entries(pendingFotolar).map(async ([soruId, items]): Promise<[string, PuansizCevapDegeri]> => {
          if (items.length === 0) return [soruId, puansizCevaplar[soruId]];
          const yuklenenler = await Promise.all(
            items.map((it, i) =>
              uploadDegerlendirmeFoto(
                { degerlendirmeId: docId, soruId, magazaAd: magaza.ad, personelAd: personel.ad, tarih: izlenmeTarihi },
                it.file,
                i
              )
            )
          );
          const mevcutFotograflar = puansizCevaplar[soruId]?.fotograflar ?? [];
          return [soruId, { ...puansizCevaplar[soruId], fotograflar: [...mevcutFotograflar, ...yuklenenler] }];
        })
      );
      const uploadedPuansizCevaplar = { ...puansizCevaplar };
      entries.forEach(([soruId, cevap]) => {
        if (cevap) uploadedPuansizCevaplar[soruId] = cevap;
      });

      const tarih = new Date(izlenmeTarihi + "T12:00:00");

      const toplamPuan = isManuel ? Number(toplamPuanGiris) : null;

      if (mevcutId) {
        // Devam edilen açık rapor: mevcut kaydı güncelle ve kapat
        // (rapor sahibi kameramanId/Ad ilk oluşturan kişide sabit kalır)
        await updateDegerlendirme(mevcutId, {
          bolumSnapshot,
          soruSnapshot,
          puansizCevaplar: uploadedPuansizCevaplar,
          izlenmeTarihi: Timestamp.fromDate(tarih),
          durum: "kapali",
          puanGirisTipi: form.puanGirisTipi,
          toplamPuan,
          maxPuan: null,
        });
        router.push(`/degerlendirmeler/${mevcutId}`);
      } else {
        const id = await createDegerlendirme(
          {
            formId: form.id,
            formAd: form.ad,
            personelId: personel.id,
            personelAd: personel.ad,
            magazaId: magaza.id,
            magazaAd: magaza.ad,
            kameramanId,
            kameramanAd,
            ay: tarih.getMonth(),
            yil: tarih.getFullYear(),
            durum: "kapali",
            puanli: form.puanli,
            puanGirisTipi: form.puanGirisTipi,
            skorlamaSistemi: form.skorlamaSistemi,
            izlenmeler: [],
            toplamPuan,
            maxPuan: null,
            bolumSnapshot,
            soruSnapshot,
            cevaplar: {},
            puansizCevaplar: uploadedPuansizCevaplar,
            izlenmeTarihi: Timestamp.fromDate(tarih),
          },
          docId
        );
        router.push(`/degerlendirmeler/${id}`);
      }
    } catch (err) {
      console.error("Puansız değerlendirme kaydetme hatası:", err);
      setHata("Değerlendirme kaydedilemedi. Lütfen tekrar deneyin.");
      setKaydediliyor(false);
    }
  }

  const yuzde = tumSorular.length > 0 ? Math.round((cevaplananSayisi / tumSorular.length) * 100) : 0;

  // Kısa bağlantı kopmalarında ekrandan ayrılırken bekleyen (henüz senkronize olmamış) veri
  // varsa uyarı gösterilir — sekme kapatma/yenileme için beforeunload, uygulama içi geri için confirm.
  const bekleyenSenkronVarMi = senkronBekliyor || bekleyenFotoVarMi;
  useEffect(() => {
    function handler(e: BeforeUnloadEvent) {
      if (!online && bekleyenSenkronVarMi) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [online, bekleyenSenkronVarMi]);

  function handleGeriTikla() {
    if (!online && bekleyenSenkronVarMi) {
      const devamEt = window.confirm(
        "Çevrimdışısınız ve henüz kaydedilmemiş değişiklikler var. Bağlantı gelene kadar bu ekranda kalırsanız otomatik kaydedilecek. Yine de çıkmak istiyor musunuz?"
      );
      if (!devamEt) return;
    }
    onGeri();
  }

  return (
    <div className="w-full max-w-[1440px] mx-auto py-4 pb-2">
      <nav className="flex items-center gap-1.5 text-sm text-slate-500 mb-4">
        <button onClick={handleGeriTikla} className="hover:text-slate-800 transition-colors">Değerlendirmeler</button>
        <ChevronRight size={14} className="text-slate-300" />
        <span className="text-slate-800 font-medium">{mevcutId ? "Tamamla (Puansız)" : "Yeni (Puansız)"}</span>
      </nav>

      {!online && (
        <div className="mb-4 flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-sm font-medium px-4 py-2.5 rounded-xl">
          <WifiOff size={15} className="shrink-0" />
          Çevrimdışısınız. Cevaplarınız bu cihazda tutuluyor, bağlantı gelince otomatik kaydedilecek.
        </div>
      )}

      {/* ── Form başlığı ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
        <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600" />
        <div className="px-7 py-5 flex items-center justify-between gap-6 flex-wrap">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
              <FileText size={20} className="text-indigo-600" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-slate-900 leading-tight truncate">{form.ad}</h1>
              <div className="flex items-center gap-3.5 mt-1">
                <span className="flex items-center gap-1 text-xs text-slate-500">
                  <User size={12} /> {personel.ad}
                </span>
                <span className="flex items-center gap-1 text-xs text-slate-500">
                  <Store size={12} /> {magaza.ad}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 shrink-0">
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-slate-400 shrink-0" />
              <label className="text-sm text-slate-500 shrink-0">İzlenme Tarihi</label>
              <input
                type="date"
                value={izlenmeTarihi}
                onChange={(e) => setIzlenmeTarihi(e.target.value)}
                className="border-0 border-b-2 border-slate-200 bg-transparent px-1 py-1 text-sm text-slate-800 focus:outline-none focus:border-indigo-600 transition-colors"
              />
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-28 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                  style={{ width: `${yuzde}%` }}
                />
              </div>
              <span className="text-sm font-semibold text-slate-700 tabular-nums shrink-0">
                {cevaplananSayisi}/{tumSorular.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bölümler ve sorular ── */}
      <div className="space-y-8">
        {bolumDetaylar.map((bolum) => {
            const bolumCevaplanan = bolum.sorular.filter(soruCevaplandiMi).length;
            const bolumTamam = bolumCevaplanan === bolum.sorular.length && bolum.sorular.length > 0;
            return (
              <div key={bolum.id} id={`bolum-${bolum.id}`} className="space-y-3 scroll-mt-6">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="h-1.5 bg-indigo-500" />
                  <div className="px-6 py-4 flex items-center justify-between gap-3">
                    <h2 className="text-base font-bold text-slate-900 truncate">{bolum.ad}</h2>
                    <span className={`flex items-center gap-1 text-xs font-semibold shrink-0 ${bolumTamam ? "text-emerald-600" : "text-slate-400"}`}>
                      {bolumTamam && <Check size={13} />}
                      {bolumCevaplanan}/{bolum.sorular.length} tamamlandı
                    </span>
                  </div>
                </div>

                {bolum.sorular.map((soru, i) => {
                  const tip = soru.tip ?? "evet_hayir_muaf";
                  const cevaplandi = soruCevaplandiMi(soru);
                  return (
                    <div key={soru.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className={`h-1 transition-colors ${cevaplandi ? "bg-emerald-400" : "bg-slate-200"}`} />
                      <div className="px-6 py-5">
                        <div className="flex items-start justify-between gap-4 mb-4">
                          <p className="text-[15px] font-medium text-slate-800 leading-snug">
                            <span className="text-slate-400 font-normal mr-1.5">{i + 1}.</span>
                            {soru.metin}
                            <span className="text-rose-500 ml-1">*</span>
                          </p>
                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide shrink-0 mt-1 whitespace-nowrap">
                            {TIP_LABEL[tip]}
                          </span>
                        </div>

                        <PuansizCevapInput
                          tip={tip}
                          cevap={puansizCevaplar[soru.id]}
                          onChange={(patch) => setCevap(soru.id, patch)}
                        />

                        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-start gap-x-6 gap-y-3">
                          <div className="min-w-[160px]">
                            <PuansizFotoStrip
                              fotograflar={[
                                ...(puansizCevaplar[soru.id]?.fotograflar ?? []).map((url) => ({
                                  url,
                                  onSil: () => mevcutFotoSil(soru.id, url),
                                })),
                                ...(pendingFotolar[soru.id] ?? []).map((f, idx) => ({
                                  url: f.url,
                                  onSil: () => fotoSil(soru.id, idx),
                                  hata: f.hata,
                                  onTekrarDene: () => yukleFoto(soru.id, f, idx),
                                })),
                              ]}
                              onEkle={(files) => fotoEkle(soru.id, files)}
                            />
                          </div>
                          {tip !== "yorum" && (
                            <div className="flex-1 min-w-[220px]">
                              <PuansizNotAlani
                                deger={puansizCevaplar[soru.id]?.yorum}
                                onChange={(v) => setCevap(soru.id, { yorum: v })}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
        })}
      </div>

      {/* ── Toplam Puan (yorumlu puanlı) ── */}
      {isManuel && (
        <div className="mt-6 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="h-1.5 bg-violet-500" />
          <div className="px-6 py-5">
            <label className="block text-[15px] font-medium text-slate-800 mb-2">
              Toplam Puan <span className="text-slate-400 font-normal">(0-100 arası)</span>
              <span className="text-rose-500 ml-1">*</span>
            </label>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              max={100}
              value={toplamPuanGiris}
              onChange={(e) => setToplamPuanGiris(e.target.value)}
              placeholder="ör. 87"
              className="w-full max-w-[200px] px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            {toplamPuanGiris.trim() !== "" && !toplamPuanGecerli && (
              <p className="text-xs text-rose-500 mt-1.5">Puan 0 ile 100 arasında olmalıdır.</p>
            )}
          </div>
        </div>
      )}

      {/* ── Aksiyon çubuğu ── */}
      <div className="mt-6">
        <div className="flex items-center justify-between gap-3 bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-3.5">
          {hata && <p className="text-sm font-medium text-rose-600">{hata}</p>}
          <div className="ml-auto">
            <button
              onClick={handleKaydet}
              disabled={!tamamlandi || !toplamPuanGecerli || kaydediliyor || !online}
              title={!online ? "Kaydetmek için internet bağlantısı gerekiyor" : undefined}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100 shadow-sm shadow-indigo-100"
            >
              {kaydediliyor && <Loader2 size={15} className="animate-spin" />}
              {!online ? "Bağlantı yok" : kaydediliyor ? "Kaydediliyor..." : "Değerlendirmeyi Kaydet"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
