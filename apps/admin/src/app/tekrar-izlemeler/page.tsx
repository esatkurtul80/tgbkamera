"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Repeat, Clock, CheckCircle2, Store, ArrowRight, Eye, Trash2, Play, AlertTriangle, StickyNote,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import DataTable, { type DataColumn } from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Badge from "@/components/ui/Badge";
import StatKart from "@/components/ui/StatKart";
import {
  getAktifTekrarIzlemeler,
  getDegerlendirmelerByIds,
  getFormlar,
  deleteTekrarIzleme,
  copeAtTekrarIzleme,
} from "@/lib/firestore";
import {
  PUAN_RENK_ESIGI, donemEtiketi, donemParamlariniCoz, oncekiAyDonemi,
  puanRenkSinifi, puanRozetSinifi, raporPuanYuzde,
} from "@/lib/puan";
import type { Degerlendirme, Form, TekrarIzleme } from "@/types";

type Sekme = "bekleyen" | "tamamlanan";

const ADMIN_ROLLER = ["admin", "sirketsahibi", "ust_yonetici"];

/** useSearchParams için Suspense sınırı gerekir (raporlar/aylik-izlenme deseni). */
export default function TekrarIzlemelerPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <TekrarIzlemelerIcerik />
    </Suspense>
  );
}

function TekrarIzlemelerIcerik() {
  const { user, kullanici } = useAuth();
  const searchParams = useSearchParams();
  const isKameraman = kullanici?.rol === "kameraman";
  const isAdmin = !!kullanici?.rol && ADMIN_ROLLER.includes(kullanici.rol);
  // Çöpe atma / geri getirme: kameraman ve admin roller (rapor çöp kutusuyla aynı yetki)
  const copYetkisi = isKameraman || isAdmin;

  // Dönem: tüm dönemlerin kayıtları yüklenir; seçim tablodaki "Dönem" sütunu filtresiyle yapılır.
  // Varsayılan filtre tamamlanan son ay (bir önceki ay) — yeni aya geçince liste kendiliğinden
  // yenilenir, eski dönemler filtreden açılır. ?ay=&yil= ile başka dönem varsayılan yapılabilir.
  // Sekme değişince tablo yeniden kurulduğu için seçim burada tutulur (null = tüm dönemler).
  const oncekiAy = useMemo(() => oncekiAyDonemi(), []);
  const [donemSecimi, setDonemSecimi] = useState<string[] | null>(() => {
    const d = donemParamlariniCoz(searchParams.get("ay"), searchParams.get("yil")) ?? oncekiAy;
    return [donemEtiketi(d.ay, d.yil)];
  });
  const filtreDegisti = useCallback((f: Record<string, string[]>) => setDonemSecimi(f.donem ?? null), []);
  const tabloFiltreleri = useMemo(() => (donemSecimi ? { donem: donemSecimi } : undefined), [donemSecimi]);
  const donemdeMi = useCallback(
    (t: TekrarIzleme) => !donemSecimi || donemSecimi.includes(donemEtiketi(t.ay, t.yil)),
    [donemSecimi]
  );
  const donemOzeti = !donemSecimi
    ? "tüm dönemler"
    : donemSecimi.length === 1
    ? donemSecimi[0]
    : `${donemSecimi.length} dönem`;

  const [sekme, setSekme] = useState<Sekme>("bekleyen");
  const [bekleyenler, setBekleyenler] = useState<TekrarIzleme[]>([]);
  /** Firestore'da durum=tamamlandi olan tüm kayıtlar (rapor açılmış) — UI'da devam eden / biten diye ayrılır. */
  const [raporlananlar, setRaporlananlar] = useState<TekrarIzleme[]>([]);
  const [takipRaporlari, setTakipRaporlari] = useState<Map<string, Degerlendirme>>(new Map());
  const [formlar, setFormlar] = useState<Form[]>([]);
  // Puan renklendirmesi: eski kayıtlarda saklanan eşik varsa o, yoksa sabit referans
  const esik = PUAN_RENK_ESIGI;
  const [loading, setLoading] = useState(true);
  const [hata, setHata] = useState<string | null>(null);

  // Raporla modalı — mağaza işaretleme anında kaydedilmiştir (takip.magazaId), yeniden seçilmez
  const [raporlanacak, setRaporlanacak] = useState<TekrarIzleme | null>(null);
  const [kaynakRaporlar, setKaynakRaporlar] = useState<Degerlendirme[]>([]);
  const [kaynakYukleniyor, setKaynakYukleniyor] = useState(false);

  const [kaldirilacak, setKaldirilacak] = useState<TekrarIzleme | null>(null);
  const [kaldiriliyor, setKaldiriliyor] = useState(false);
  const [copeAtilacak, setCopeAtilacak] = useState<TekrarIzleme | null>(null);
  const [copeAtiliyor, setCopeAtiliyor] = useState(false);

  const takipleriYukle = useCallback(async () => {
    // Tek sorgu: tüm dönemlerin işaretleri; çöpe atılanlar (silindi) sorguda elenir
    const hepsi = await getAktifTekrarIzlemeler();
    const b = hepsi.filter((t) => t.durum === "bekliyor");
    const t = hepsi.filter((t) => t.durum === "tamamlandi");
    setBekleyenler(b);
    setRaporlananlar(t);
    const idler = t.map((x) => x.takipDegerlendirmeId).filter((id): id is string => !!id);
    const raporlar = idler.length > 0 ? await getDegerlendirmelerByIds(idler) : [];
    setTakipRaporlari(new Map(raporlar.map((d) => [d.id, d])));
  }, []);

  useEffect(() => {
    if (!user) return;
    let iptal = false;
    (async () => {
      setLoading(true);
      setHata(null);
      try {
        const f = await getFormlar();
        if (iptal) return;
        setFormlar(f);
        await takipleriYukle();
      } catch (err) {
        console.error("Tekrar izlemeler yüklenemedi:", err);
        if (!iptal) setHata("Havuz yüklenemedi. Firestore kurallarının tekrarIzlemeler koleksiyonuna okuma izni verdiğinden emin olun.");
      } finally {
        if (!iptal) setLoading(false);
      }
    })();
    return () => { iptal = true; };
  }, [user, takipleriYukle]);

  // Rapor yeni sekmede açılır; bu sekmeye dönüldüğünde liste tazelenir
  useEffect(() => {
    if (!user) return;
    const onFocus = () => { takipleriYukle().catch(console.error); };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [user, takipleriYukle]);

  // Takip raporu yalnız admin'in "Zayıf Personel Formu" olarak işaretlediği formlarla açılır;
  // hiç işaretli form yoksa tüm formlara geri düşülmez, uyarı gösterilir.
  const takipFormlari = useMemo(() => formlar.filter((f) => f.zayifPersonelFormu && !f.magazaFormu), [formlar]);

  /** Takip raporu hâlâ sürüyor mu: rapor açık ya da puanlı olup puanı henüz oluşmamış. */
  const raporDevamEdiyorMu = useCallback((t: TekrarIzleme): boolean => {
    const r = t.takipDegerlendirmeId ? takipRaporlari.get(t.takipDegerlendirmeId) : undefined;
    if (!r) return false; // rapor silinmiş → tamamlananlarda "Rapor silinmiş" olarak görünür
    if (r.durum === "acik") return true;
    return r.puanli && raporPuanYuzde(r) === null;
  }, [takipRaporlari]);

  // İzlenecekler: henüz rapor açılmamışlar + raporu devam edenler. Tamamlananlar: raporu bitenler.
  const devamEdenler = useMemo(() => raporlananlar.filter(raporDevamEdiyorMu), [raporlananlar, raporDevamEdiyorMu]);
  const izlenecekler = useMemo(() => [...bekleyenler, ...devamEdenler], [bekleyenler, devamEdenler]);
  const tamamlananlar = useMemo(() => raporlananlar.filter((t) => !raporDevamEdiyorMu(t)), [raporlananlar, raporDevamEdiyorMu]);
  // Özet kartları tablodaki Dönem filtresiyle aynı dönemi sayar
  const donemBekleyen = useMemo(() => bekleyenler.filter(donemdeMi).length, [bekleyenler, donemdeMi]);
  const donemDevamEden = useMemo(() => devamEdenler.filter(donemdeMi).length, [devamEdenler, donemdeMi]);
  const donemTamamlanan = useMemo(() => tamamlananlar.filter(donemdeMi).length, [tamamlananlar, donemdeMi]);

  // ── Raporla akışı ─────────────────────────────────────────────────────────
  async function raporlaModaliniAc(t: TekrarIzleme) {
    setRaporlanacak(t);
    setKaynakRaporlar([]);
    if (t.kaynakDegerlendirmeIdleri?.length) {
      setKaynakYukleniyor(true);
      try {
        setKaynakRaporlar(await getDegerlendirmelerByIds(t.kaynakDegerlendirmeIdleri));
      } finally {
        setKaynakYukleniyor(false);
      }
    }
  }

  const kaynakFormIdleri = useMemo(() => new Set(kaynakRaporlar.map((d) => d.formId)), [kaynakRaporlar]);

  function handleFormSec(formId: string) {
    if (!raporlanacak) return;
    const url = `/degerlendirmeler/yeni?magazaId=${raporlanacak.magazaId}&personelId=${raporlanacak.personelId}&formId=${formId}&takipId=${raporlanacak.id}`;
    setRaporlanacak(null);
    window.open(url, "_blank");
  }

  function handleRaporaDevamEt(t: TekrarIzleme) {
    if (!t.takipDegerlendirmeId) return;
    window.open(`/degerlendirmeler/yeni?devam=${t.takipDegerlendirmeId}`, "_blank");
  }

  async function handleKaldir() {
    if (!kaldirilacak) return;
    setKaldiriliyor(true);
    try {
      await deleteTekrarIzleme(kaldirilacak.id);
      await takipleriYukle();
      setKaldirilacak(null);
    } catch (err) {
      console.error("İşaret kaldırılamadı:", err);
      alert("İşaret kaldırılamadı.");
    } finally {
      setKaldiriliyor(false);
    }
  }

  async function handleCopeAt() {
    if (!copeAtilacak || !user) return;
    setCopeAtiliyor(true);
    try {
      await copeAtTekrarIzleme(copeAtilacak, { id: user.uid, ad: kullanici?.displayName ?? user.displayName ?? "" });
      await takipleriYukle();
      setCopeAtilacak(null);
    } catch (err) {
      console.error("Çöpe atılamadı:", err);
      alert("Kayıt çöpe atılamadı. Yetkiniz olmayabilir ya da Firestore kuralları eksik olabilir.");
    } finally {
      setCopeAtiliyor(false);
    }
  }


  // ── Sütunlar ──────────────────────────────────────────────────────────────
  const personelHucre = (t: TekrarIzleme) => (
    <div className="flex items-center gap-2.5">
      <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
        <span className="text-[10px] font-bold text-orange-600">{t.personelAd.charAt(0).toUpperCase()}</span>
      </div>
      <span className="text-sm font-medium text-slate-800">{t.personelAd}</span>
    </div>
  );
  const magazaHucre = (t: TekrarIzleme) => (
    <span className="inline-flex items-center gap-1 text-xs text-teal-700 bg-teal-50 px-2 py-0.5 rounded font-medium">
      <Store size={10} /> {t.magazaAd}
    </span>
  );
  const donemHucre = (t: TekrarIzleme) => <span className="text-sm text-slate-600 whitespace-nowrap">{donemEtiketi(t.ay, t.yil)}</span>;
  const orijinalPuanHucre = (t: TekrarIzleme) => (
    <span
      title={`${t.raporSayisi} rapor ortalaması`}
      className={`text-base font-bold tabular-nums ${puanRenkSinifi(t.ortalamaPuan, t.esik ?? esik)}`}
    >
      {t.ortalamaPuan}
    </span>
  );

  const bekleyenSutunlar: DataColumn<TekrarIzleme>[] = [
    { key: "personel", header: "Personel", searchValue: (t) => t.personelAd, sortValue: (t) => t.personelAd, cell: personelHucre },
    { key: "magaza", header: "Mağaza", searchValue: (t) => t.magazaAd, sortValue: (t) => t.magazaAd, filterValue: (t) => t.magazaAd, cell: magazaHucre },
    { key: "donem", header: "Dönem", width: "120px", sortValue: (t) => t.yil * 12 + t.ay, filterValue: (t) => donemEtiketi(t.ay, t.yil), cell: donemHucre },
    { key: "puan", header: "Orijinal Puan", align: "center", width: "120px", sortValue: (t) => t.ortalamaPuan, filterNumber: (t) => t.ortalamaPuan, cell: orijinalPuanHucre },
    {
      key: "isaretleyen",
      header: "İşaretleyen",
      searchValue: (t) => t.isaretleyenAd,
      sortValue: (t) => t.isaretleyenAd,
      filterValue: (t) => t.isaretleyenAd || "—",
      cell: (t) => (
        <div>
          <p className="text-sm text-slate-700">{t.isaretleyenAd || "—"}</p>
          <p className="text-xs text-slate-400">{t.olusturmaTarihi?.toDate?.().toLocaleDateString("tr-TR") ?? ""}</p>
        </div>
      ),
    },
    {
      key: "not",
      header: "Not",
      searchValue: (t) => t.not ?? "",
      cell: (t) => t.not ? (
        <span className="inline-flex items-start gap-1.5 text-xs text-slate-600 max-w-[240px]" title={t.not}>
          <StickyNote size={12} className="text-amber-500 shrink-0 mt-0.5" /> <span className="line-clamp-2">{t.not}</span>
        </span>
      ) : <span className="text-slate-300 text-sm">—</span>,
    },
    {
      key: "durum",
      header: "Durum",
      width: "170px",
      sortValue: (t) => (t.durum === "bekliyor" ? 0 : 1),
      filterValue: (t) => (t.durum === "bekliyor" ? "Rapor bekliyor" : "Rapor devam ediyor"),
      cell: (t) =>
        t.durum === "bekliyor" ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full whitespace-nowrap">
            <Clock size={11} /> Rapor bekliyor
          </span>
        ) : (
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700 bg-sky-50 border border-sky-200 px-2.5 py-1 rounded-full whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse shrink-0" /> Rapor devam ediyor
            </span>
            <p className="text-[10px] text-slate-400 mt-0.5 truncate">{t.takipFormAd ?? ""}{t.tamamlayanAd ? ` · ${t.tamamlayanAd}` : ""}</p>
          </div>
        ),
    },
    {
      key: "aksiyon",
      header: "",
      align: "right",
      width: isKameraman ? "190px" : "40px",
      cell: (t) => (
        <div className="flex items-center justify-end gap-1">
          {t.durum === "bekliyor" ? (
            isKameraman && (
              <>
                <button
                  onClick={() => raporlaModaliniAc(t)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors whitespace-nowrap"
                >
                  <Play size={9} fill="currentColor" /> Raporla
                </button>
                <button
                  onClick={() => setKaldirilacak(t)}
                  title="İşareti kaldır"
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </>
            )
          ) : (
            <>
              {t.takipDegerlendirmeId && (
                <Link
                  href={`/degerlendirmeler/${t.takipDegerlendirmeId}`}
                  title="Ara raporu gör"
                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors inline-flex"
                >
                  <Eye size={14} />
                </Link>
              )}
              {isKameraman && (
                <button
                  onClick={() => handleRaporaDevamEt(t)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors whitespace-nowrap"
                >
                  <Play size={9} fill="currentColor" /> Rapora Devam Et
                </button>
              )}
            </>
          )}
        </div>
      ),
    },
  ];

  const tamamlananSutunlar: DataColumn<TekrarIzleme>[] = [
    { key: "personel", header: "Personel", searchValue: (t) => t.personelAd, sortValue: (t) => t.personelAd, cell: personelHucre },
    { key: "magaza", header: "Mağaza", searchValue: (t) => t.magazaAd, sortValue: (t) => t.magazaAd, filterValue: (t) => t.magazaAd, cell: magazaHucre },
    { key: "donem", header: "Dönem", width: "120px", sortValue: (t) => t.yil * 12 + t.ay, filterValue: (t) => donemEtiketi(t.ay, t.yil), cell: donemHucre },
    {
      key: "sonuc",
      header: "Orijinal → Takip",
      align: "center",
      width: "170px",
      sortValue: (t) => {
        const r = t.takipDegerlendirmeId ? takipRaporlari.get(t.takipDegerlendirmeId) : undefined;
        return r ? raporPuanYuzde(r) ?? -1 : -2;
      },
      cell: (t) => {
        const r = t.takipDegerlendirmeId ? takipRaporlari.get(t.takipDegerlendirmeId) : undefined;
        if (!r) return <span className="text-xs text-slate-400 italic">Rapor silinmiş</span>;
        if (!r.puanli) {
          return (
            <div className="flex flex-col items-center gap-0.5">
              <span className={`text-sm font-bold tabular-nums ${puanRenkSinifi(t.ortalamaPuan, t.esik ?? esik)}`}>{t.ortalamaPuan}</span>
              <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">Puansız takip</span>
            </div>
          );
        }
        const takipPuan = raporPuanYuzde(r);
        if (takipPuan === null) return <span className="text-xs text-slate-400">Puan yok</span>;
        const fark = takipPuan - t.ortalamaPuan;
        return (
          <div className="flex flex-col items-center gap-0.5">
            <span className={`text-sm font-bold tabular-nums border px-2 py-0.5 rounded-lg ${puanRozetSinifi(takipPuan, t.esik ?? esik)}`}>
              {t.ortalamaPuan} → {takipPuan}
            </span>
            <span className={`text-[10px] font-semibold tabular-nums ${fark > 0 ? "text-emerald-600" : fark < 0 ? "text-rose-600" : "text-slate-400"}`}>
              {fark > 0 ? `+${fark}` : fark === 0 ? "değişim yok" : fark}
            </span>
          </div>
        );
      },
    },
    {
      key: "form",
      header: "Takip Formu",
      searchValue: (t) => t.takipFormAd ?? "",
      filterValue: (t) => t.takipFormAd ?? "—",
      cell: (t) => {
        const r = t.takipDegerlendirmeId ? takipRaporlari.get(t.takipDegerlendirmeId) : undefined;
        return (
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-700">{t.takipFormAd ?? "—"}</span>
            {r && <Badge variant={!r.puanli ? "puansiz" : r.puanGirisTipi === "manuel" ? "yorumlu_puanli" : "puanli"} />}
          </div>
        );
      },
    },
    {
      key: "tamamlayan",
      header: "Tamamlayan",
      searchValue: (t) => t.tamamlayanAd ?? "",
      filterValue: (t) => t.tamamlayanAd || "—",
      cell: (t) => (
        <div>
          <p className="text-sm text-slate-700">{t.tamamlayanAd || "—"}</p>
          <p className="text-xs text-slate-400">{t.tamamlanmaTarihi?.toDate?.().toLocaleDateString("tr-TR") ?? ""}</p>
        </div>
      ),
    },
    {
      key: "aksiyon",
      header: "",
      align: "right",
      width: "90px",
      cell: (t) => (
        <div className="flex items-center justify-end gap-1">
          {t.takipDegerlendirmeId && (
            <Link
              href={`/degerlendirmeler/${t.takipDegerlendirmeId}`}
              title="Takip raporunu görüntüle"
              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors inline-flex"
            >
              <Eye size={14} />
            </Link>
          )}
          {copYetkisi && (
            <button
              onClick={() => setCopeAtilacak(t)}
              title="Çöpe at (takip raporuyla birlikte, 30 gün geri getirilebilir)"
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Repeat size={18} className="text-orange-600" />
          <h1 className="text-xl font-bold text-slate-900">İzlenecekler</h1>
        </div>
        <p className="text-sm text-slate-500">
          Tekrar izlemeye alınan personel. Liste tamamlanan son ay ({donemEtiketi(oncekiAy.ay, oncekiAy.yil)}) ile açılır;
          başka dönemler tablodaki <span className="font-medium text-slate-600">Dönem</span> sütunu filtresinden seçilir. {isKameraman
            ? "Bir personeli seçip zayıf personel formuyla takip raporu açabilirsiniz."
            : "Takip raporunu kameramanlar açar; burada durumu izleyebilirsiniz."}
        </p>
      </div>

      {loading ? (
        <div className="flex gap-3 flex-wrap w-full animate-pulse">
          {[1, 2, 3].map((i) => <div key={i} className="bg-white rounded-xl h-14 border border-slate-100 flex-1 min-w-[180px]" />)}
        </div>
      ) : (
        <div className="flex gap-3 flex-wrap w-full">
          <StatKart kucuk icon={Clock} title="Rapor Bekleyen" altMetin={donemOzeti} value={donemBekleyen} renk="bg-amber-500" />
          <StatKart kucuk icon={Play} title="Raporu Devam Eden" altMetin={donemOzeti} value={donemDevamEden} renk="bg-sky-500" />
          <StatKart kucuk icon={CheckCircle2} title="Tamamlanan" altMetin={donemOzeti} value={donemTamamlanan} renk="bg-emerald-500" />
        </div>
      )}

      {hata && (
        <div className="flex items-start gap-2 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" /> {hata}
        </div>
      )}

      {/* Sekmeler */}
      <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden self-start">
        <button
          onClick={() => setSekme("bekleyen")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${sekme === "bekleyen" ? "bg-amber-500 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
        >
          İzlenecekler ({donemBekleyen + donemDevamEden})
        </button>
        <button
          onClick={() => setSekme("tamamlanan")}
          className={`px-4 py-2 text-sm font-medium border-l border-slate-200 transition-colors ${sekme === "tamamlanan" ? "bg-emerald-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
        >
          Tamamlananlar ({donemTamamlanan})
        </button>
      </div>

      {sekme === "bekleyen" ? (
        <DataTable
          data={izlenecekler}
          columns={bekleyenSutunlar}
          rowKey={(t) => t.id}
          loading={loading}
          searchPlaceholder="Personel, mağaza veya not ara..."
          emptyIcon={CheckCircle2}
          emptyTitle="İzlenecek kayıt yok"
          emptyDescription="İşaretlenen personel yok ya da hepsinin raporu tamamlandı. Personel Seç sayfasından yeni personel işaretlenebilir."
          defaultPageSize={25}
          basliklariHerZamanGoster
          initialFilters={tabloFiltreleri}
          onFilterChange={filtreDegisti}
        />
      ) : (
        <DataTable
          data={tamamlananlar}
          columns={tamamlananSutunlar}
          rowKey={(t) => t.id}
          loading={loading}
          searchPlaceholder="Personel, mağaza veya form ara..."
          emptyIcon={Repeat}
          emptyTitle="Tamamlanan takip yok"
          emptyDescription="Takip raporu tamamlanmış personel bulunmuyor."
          defaultPageSize={25}
          basliklariHerZamanGoster
          initialFilters={tabloFiltreleri}
          onFilterChange={filtreDegisti}
        />
      )}

      {/* Raporla modalı */}
      <Modal open={!!raporlanacak} onClose={() => setRaporlanacak(null)} title={`${raporlanacak?.personelAd ?? ""} — Takip Raporu`} size="lg">
        {raporlanacak && (
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-3 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
              <div className="text-sm text-orange-900 min-w-0">
                <p className="font-semibold">{donemEtiketi(raporlanacak.ay, raporlanacak.yil)} ortalaması</p>
                <p className="text-xs text-orange-700 mt-0.5 inline-flex items-center gap-1 flex-wrap">
                  <Store size={11} /> {raporlanacak.magazaAd} · {raporlanacak.isaretleyenAd || "—"} tarafından işaretlendi
                  {raporlanacak.not && <> · <span className="italic">“{raporlanacak.not}”</span></>}
                </p>
              </div>
              <span className={`text-2xl font-bold tabular-nums ${puanRenkSinifi(raporlanacak.ortalamaPuan, raporlanacak.esik ?? esik)}`}>
                {raporlanacak.ortalamaPuan}
              </span>
            </div>

            {/* Orijinal raporlar */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Orijinal Raporlar</p>
              {kaynakYukleniyor ? (
                <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
                  <div className="w-3.5 h-3.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /> Yükleniyor...
                </div>
              ) : kaynakRaporlar.length === 0 ? (
                <p className="text-xs text-slate-400">Kaynak rapor bulunamadı.</p>
              ) : (
                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100">
                  {kaynakRaporlar.map((d) => {
                    const p = raporPuanYuzde(d);
                    return (
                      <Link
                        key={d.id}
                        href={`/degerlendirmeler/${d.id}`}
                        target="_blank"
                        className="flex items-center justify-between px-3 py-2 hover:bg-slate-50 transition-colors group"
                      >
                        <div className="min-w-0">
                          <p className="text-sm text-slate-800 truncate group-hover:text-indigo-700">{d.formAd}</p>
                          <p className="text-xs text-slate-400 inline-flex items-center gap-1"><Store size={10} /> {d.magazaAd}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          <Badge variant={d.puanGirisTipi === "manuel" ? "yorumlu_puanli" : "puanli"} />
                          <span className={`text-sm font-bold tabular-nums ${puanRenkSinifi(p, raporlanacak.esik ?? esik)}`}>{p ?? "—"}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Form seçimi */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Takip Formu Seç</p>
              <p className="text-xs text-slate-500">
                Takip raporu yalnız admin tarafından <span className="font-semibold">Zayıf Personel Formu</span> olarak işaretlenen
                formlarla, personelin işaretlendiği mağaza için açılır. Rapor yeni sekmede açılır; bitene kadar bu listede
                "Rapor devam ediyor" olarak kalır, sonra Tamamlananlar'a geçer.
              </p>
              {takipFormlari.length === 0 ? (
                <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-900">
                    <p className="font-semibold">Henüz zayıf personel formu tanımlanmamış.</p>
                    <p className="text-xs text-amber-800 mt-0.5">
                      Admin, Formlar sayfasında ilgili formun içinde <span className="font-semibold">Zayıf Personel Formu</span> seçeneğini
                      işaretlemelidir. İşaretlenene kadar havuzdan takip raporu açılamaz.
                    </p>
                    {!isKameraman && (
                      <Link href="/formlar" className="inline-block mt-2 text-xs font-semibold text-amber-900 underline hover:text-amber-700">
                        Formlar sayfasına git →
                      </Link>
                    )}
                  </div>
                </div>
              ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-64 overflow-y-auto">
                {takipFormlari.map((f) => {
                    const ayniForm = kaynakFormIdleri.has(f.id);
                    return (
                      <button
                        key={f.id}
                        onClick={() => handleFormSec(f.id)}
                        className="w-full text-left p-4 hover:bg-indigo-50/40 transition-colors flex items-center justify-between group"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-slate-800 group-hover:text-indigo-950">{f.ad}</p>
                            <Badge variant={!f.puanli ? "puansiz" : f.puanGirisTipi === "manuel" ? "yorumlu_puanli" : "puanli"} />
                          </div>
                          {f.aciklama && <p className="text-xs text-slate-400 mt-1 truncate">{f.aciklama}</p>}
                          {ayniForm && <p className="text-[10px] text-amber-600 mt-1">Orijinal raporla aynı form</p>}
                        </div>
                        <ArrowRight size={14} className="text-slate-400 group-hover:text-indigo-600 transition-transform group-hover:translate-x-1 shrink-0 ml-4" />
                      </button>
                    );
                  })}
              </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!kaldirilacak}
        title="İşareti Kaldır"
        description={`${kaldirilacak?.personelAd ?? ""} izlenecekler havuzundan çıkarılacak. Gerekirse Personel Seç sayfasından yeniden işaretleyebilirsiniz.`}
        confirmLabel="Kaldır"
        loading={kaldiriliyor}
        onConfirm={handleKaldir}
        onCancel={() => setKaldirilacak(null)}
      />

      <ConfirmDialog
        open={!!copeAtilacak}
        title="Çöpe At"
        description={`${copeAtilacak?.personelAd ?? ""} için tamamlanan kayıt ve bağlı takip raporu Çöp Kutusu'na taşınacak. Rapor Çöp Kutusu sayfasından 30 gün içinde geri getirilebilir; geri getirilince bu kayıt da Tamamlananlar'a döner. Süre dolunca kalıcı silinir.`}
        confirmLabel="Çöpe At"
        loading={copeAtiliyor}
        onConfirm={handleCopeAt}
        onCancel={() => setCopeAtilacak(null)}
      />
    </div>
  );
}
