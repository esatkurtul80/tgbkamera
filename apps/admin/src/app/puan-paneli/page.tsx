"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Gauge, Repeat, CheckCircle2, Clock, Eye, X,
  AlertTriangle, Store, Trash2, Camera,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import DataTable, { type DataColumn } from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import {
  getDegerlendirmelerByAyYil,
  getTekrarIzlemelerByAyYil,
  getDegerlendirmelerByIds,
  getAktifPersoneller,
  getMagazalar,
  createTekrarIzlemeler,
  deleteTekrarIzleme,
} from "@/lib/firestore";
import { puanPaneliHesapla, type PersonelPuanSatiri, type TakipDurumu } from "@/lib/puanPaneli";
import { AYLAR, PUAN_RENK_ESIGI, donemEtiketi, oncekiAyDonemi, puanRenkSinifi, puanRozetSinifi } from "@/lib/puan";
import type { Degerlendirme, Magaza, Personel, TekrarIzleme } from "@/types";

/** Puan renklendirmesi için sabit referans (sayfada eşik ayarı yok; tüm personel listelenir). */
const RENK_ESIGI = PUAN_RENK_ESIGI;

function TakipDurumRozeti({ durum, takip }: { durum: TakipDurumu; takip: TekrarIzleme | null }) {
  if (durum === "yok" || !takip) return <span className="text-slate-300 text-sm">—</span>;
  const tarih = takip.olusturmaTarihi?.toDate?.().toLocaleDateString("tr-TR") ?? "";
  const baslik = `${takip.isaretleyenAd || "—"} tarafından ${tarih} tarihinde işaretlendi${takip.not ? ` · Not: ${takip.not}` : ""}`;
  if (durum === "bekliyor") {
    return (
      <span title={baslik} className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full whitespace-nowrap">
        <Clock size={11} /> Bekliyor
      </span>
    );
  }
  if (durum === "devam") {
    return (
      <span title={baslik} className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700 bg-sky-50 border border-sky-200 px-2.5 py-1 rounded-full whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse shrink-0" /> Rapor devam ediyor
      </span>
    );
  }
  return (
    <span title={baslik} className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full whitespace-nowrap">
      <CheckCircle2 size={11} /> Tamamlandı
    </span>
  );
}

export default function PuanPaneliPage() {
  const { user, kullanici } = useAuth();
  const isKameraman = kullanici?.rol === "kameraman";

  // Varsayılan dönem: BİR ÖNCEKİ AY. Seçim, ay kapandıktan sonra o ayın puanları üzerinden
  // yapılır (ekim başında eylül zayıfları seçilir); içinde bulunulan ay henüz tamamlanmamıştır.
  const oncekiAy = useMemo(() => oncekiAyDonemi(), []);
  const [ay, setAy] = useState(oncekiAy.ay);
  const [yil, setYil] = useState(oncekiAy.yil);
  const yillar = useMemo(() => { const y = new Date().getFullYear(); return [y, y - 1, y - 2]; }, []);
  const oncekiAyMi = ay === oncekiAy.ay && yil === oncekiAy.yil;

  const [raporlar, setRaporlar] = useState<Degerlendirme[]>([]);
  const [takipler, setTakipler] = useState<TekrarIzleme[]>([]);
  const [takipRaporlari, setTakipRaporlari] = useState<Degerlendirme[]>([]);
  const [personeller, setPersoneller] = useState<Personel[]>([]);
  const [magazalar, setMagazalar] = useState<Magaza[]>([]);
  const [loading, setLoading] = useState(true);
  const [hata, setHata] = useState<string | null>(null);

  const [secilenler, setSecilenler] = useState<Set<string>>(new Set());
  const [gorunenListe, setGorunenListe] = useState<PersonelPuanSatiri[]>([]);
  const [isaretModalAcik, setIsaretModalAcik] = useState(false);
  const [isaretNotu, setIsaretNotu] = useState("");
  const [isaretleniyor, setIsaretleniyor] = useState(false);
  const [kaldirilacak, setKaldirilacak] = useState<TekrarIzleme | null>(null);
  const [kaldiriliyor, setKaldiriliyor] = useState(false);
  const [raporlarSatiri, setRaporlarSatiri] = useState<PersonelPuanSatiri | null>(null);

  /** Dönem değişince tüm veriyi, işaret değişince yalnız takipleri yeniler. */
  const takipleriYukle = useCallback(async (ayRaporlari: Degerlendirme[]) => {
    const t = await getTekrarIzlemelerByAyYil(ay, yil);
    const ayIdleri = new Set(ayRaporlari.map((d) => d.id));
    const eksik = t.map((x) => x.takipDegerlendirmeId).filter((id): id is string => !!id && !ayIdleri.has(id));
    const ekRaporlar = eksik.length > 0 ? await getDegerlendirmelerByIds(eksik) : [];
    setTakipler(t);
    setTakipRaporlari(ekRaporlar);
  }, [ay, yil]);

  useEffect(() => {
    if (!user) return;
    let iptal = false;
    setLoading(true);
    setHata(null);
    setSecilenler(new Set());
    (async () => {
      try {
        const [ayRaporlari, p, m] = await Promise.all([
          getDegerlendirmelerByAyYil(ay, yil),
          getAktifPersoneller(),
          getMagazalar(),
        ]);
        if (iptal) return;
        setRaporlar(ayRaporlari);
        setPersoneller(p);
        setMagazalar(m);
        await takipleriYukle(ayRaporlari);
      } catch (err) {
        console.error("Personel seç sayfası yüklenemedi:", err);
        if (!iptal) setHata("Veriler yüklenemedi. Tekrar izleme kayıtları için Firestore kurallarının eklendiğinden emin olun.");
      } finally {
        if (!iptal) setLoading(false);
      }
    })();
    return () => { iptal = true; };
  }, [user, ay, yil, takipleriYukle]);

  const { satirlar } = useMemo(
    () => puanPaneliHesapla({ raporlar, takipler, takipRaporlari, personeller, magazalar }),
    [raporlar, takipler, takipRaporlari, personeller, magazalar]
  );

  // ── Seçim (yalnız kameraman; henüz tekrar izlemeye alınmamış tüm personel) ──
  const secilebilirMi = (s: PersonelPuanSatiri) => isKameraman && s.takipDurumu === "yok";
  const gorunenSecilebilir = gorunenListe.filter(secilebilirMi);
  const gorunenTumuSecili = gorunenSecilebilir.length > 0 && gorunenSecilebilir.every((s) => secilenler.has(s.personelId));

  function toggleSecim(id: string) {
    setSecilenler((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function toggleTumu() {
    setSecilenler((prev) => {
      const next = new Set(prev);
      if (gorunenTumuSecili) gorunenSecilebilir.forEach((s) => next.delete(s.personelId));
      else gorunenSecilebilir.forEach((s) => next.add(s.personelId));
      return next;
    });
  }

  const seciliSatirlar = satirlar.filter((s) => secilenler.has(s.personelId) && secilebilirMi(s));

  function isaretModaliniAc(tekSatir?: PersonelPuanSatiri) {
    if (tekSatir) setSecilenler(new Set([tekSatir.personelId]));
    setIsaretNotu("");
    setIsaretModalAcik(true);
  }

  async function handleIsaretle() {
    if (!user || seciliSatirlar.length === 0) return;
    setIsaretleniyor(true);
    try {
      const ad = kullanici?.displayName ?? user.displayName ?? "";
      const not = isaretNotu.trim();
      await createTekrarIzlemeler(
        seciliSatirlar.map((s) => ({
          personelId: s.personelId,
          personelAd: s.personelAd,
          magazaId: s.enDusukMagazaId,
          magazaAd: s.enDusukMagazaAd,
          ay, yil,
          ortalamaPuan: s.ortalamaPuan,
          raporSayisi: s.raporSayisi,
          kaynakDegerlendirmeIdleri: s.puanlar.map((p) => p.degerlendirmeId),
          ...(not ? { not } : {}),
          isaretleyenId: user.uid,
          isaretleyenAd: ad,
        }))
      );
      await takipleriYukle(raporlar);
      setSecilenler(new Set());
      setIsaretModalAcik(false);
    } catch (err) {
      console.error("İşaretleme başarısız:", err);
      alert("İşaretleme kaydedilemedi. Yetkiniz olmayabilir ya da Firestore kuralları eksik olabilir.");
    } finally {
      setIsaretleniyor(false);
    }
  }

  async function handleKaldir() {
    if (!kaldirilacak) return;
    setKaldiriliyor(true);
    try {
      await deleteTekrarIzleme(kaldirilacak.id);
      await takipleriYukle(raporlar);
      setKaldirilacak(null);
    } catch (err) {
      console.error("İşaret kaldırılamadı:", err);
      alert("İşaret kaldırılamadı.");
    } finally {
      setKaldiriliyor(false);
    }
  }

  // ── Sütunlar ──────────────────────────────────────────────────────────────
  const columns: DataColumn<PersonelPuanSatiri>[] = [
    ...(isKameraman ? [{
      key: "sec",
      header: (
        <input
          type="checkbox"
          title="Görünen ve henüz işaretlenmemiş personelin tümünü seç"
          checked={gorunenTumuSecili}
          disabled={gorunenSecilebilir.length === 0}
          onChange={toggleTumu}
          className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
        />
      ) as React.ReactNode,
      width: "36px",
      align: "center" as const,
      cell: (s: PersonelPuanSatiri) => (
        <input
          type="checkbox"
          checked={secilenler.has(s.personelId)}
          disabled={!secilebilirMi(s)}
          onChange={() => toggleSecim(s.personelId)}
          title={s.takipDurumu !== "yok" ? "Bu personel zaten tekrar izlemede" : undefined}
          className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
        />
      ),
    }] : []),
    {
      key: "personel",
      header: "Personel",
      searchValue: (s) => s.personelAd,
      sortValue: (s) => s.personelAd,
      cell: (s) => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
            <span className="text-[10px] font-bold text-indigo-600">{s.personelAd.charAt(0).toUpperCase()}</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-800 truncate">{s.personelAd}</p>
            {s.takipSayisi > 1 && (
              <p className="text-[10px] text-amber-600 inline-flex items-center gap-1">
                <AlertTriangle size={10} /> {s.takipSayisi} işaret var (eşzamanlı işaretleme)
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "magaza",
      header: "Mağaza",
      searchValue: (s) => s.magazaAdlari.join(" "),
      sortValue: (s) => s.magazaAdlari.join(", "),
      filterValue: (s) => s.magazaAdlari.join(", ") || "—",
      cell: (s) => (
        <div className="flex flex-wrap gap-1">
          {s.magazaAdlari.map((ad) => (
            <span key={ad} className="inline-flex items-center gap-1 text-xs text-teal-700 bg-teal-50 px-2 py-0.5 rounded font-medium">
              <Store size={10} /> {ad}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: "kameraman",
      header: "Kamera Gözlem",
      searchValue: (s) => s.sonGozlemciAd ?? "",
      sortValue: (s) => s.sonGozlemciAd ?? "",
      filterValue: (s) => s.sonGozlemciAd ?? "—",
      cell: (s) =>
        s.sonGozlemciAd ? (
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 text-xs text-violet-700 bg-violet-50 px-2 py-0.5 rounded font-medium">
              <Camera size={10} /> {s.sonGozlemciAd}
            </span>
            {s.sonGozlemTarihi && (
              <p className="text-[10px] text-slate-400 mt-0.5">son gözlem {s.sonGozlemTarihi.toLocaleDateString("tr-TR")}</p>
            )}
          </div>
        ) : (
          <span className="text-slate-300 text-sm">—</span>
        ),
    },
    {
      key: "raporSayisi",
      header: "Rapor",
      align: "center",
      width: "80px",
      sortValue: (s) => s.raporSayisi,
      cell: (s) => (
        <button
          onClick={() => setRaporlarSatiri(s)}
          title="Puanlanan raporları gör"
          className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 hover:underline tabular-nums"
        >
          {s.raporSayisi}
        </button>
      ),
    },
    {
      key: "puan",
      header: "Ortalama Puan",
      align: "center",
      width: "130px",
      sortValue: (s) => s.ortalamaPuan,
      filterNumber: (s) => s.ortalamaPuan,
      cell: (s) => (
        <span className={`text-base font-bold tabular-nums ${puanRenkSinifi(s.ortalamaPuan, RENK_ESIGI)}`}>{s.ortalamaPuan}</span>
      ),
    },
    {
      key: "takipDurumu",
      header: "Takip Durumu",
      width: "170px",
      sortValue: (s) => ({ yok: 0, bekliyor: 1, devam: 2, tamamlandi: 3 }[s.takipDurumu]),
      filterValue: (s) => ({ yok: "—", bekliyor: "Bekliyor", devam: "Rapor devam ediyor", tamamlandi: "Tamamlandı" }[s.takipDurumu]),
      cell: (s) => <TakipDurumRozeti durum={s.takipDurumu} takip={s.takip} />,
    },
    {
      key: "takipSonucu",
      header: "Takip Sonucu",
      align: "center",
      width: "150px",
      sortValue: (s) => s.takipPuan ?? -1,
      cell: (s) => {
        if (s.takipDurumu === "yok" || s.takipDurumu === "bekliyor") return <span className="text-slate-300 text-sm">—</span>;
        if (!s.takipRaporu) return <span className="text-xs text-slate-400 italic">Rapor silinmiş</span>;
        const r = s.takipRaporu;
        return (
          <Link href={`/degerlendirmeler/${r.id}`} className="inline-flex flex-col items-center gap-0.5 group" title={r.formAd}>
            {r.puanli ? (
              s.takipPuan !== null ? (
                <span className={`text-sm font-bold tabular-nums border px-2 py-0.5 rounded-lg ${puanRozetSinifi(s.takipPuan, RENK_ESIGI)}`}>
                  {s.ortalamaPuan} → {s.takipPuan}
                </span>
              ) : (
                <span className="text-xs text-slate-400">Puan bekleniyor</span>
              )
            ) : (
              <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg">Puansız rapor</span>
            )}
            <span className="text-[10px] text-slate-400 group-hover:text-indigo-600 truncate max-w-[130px]">{r.formAd}</span>
          </Link>
        );
      },
    },
    {
      key: "aksiyon",
      header: "",
      align: "right",
      width: isKameraman ? "190px" : "60px",
      cell: (s) => (
        <div className="flex items-center justify-end gap-1">
          {secilebilirMi(s) && (
            <button
              onClick={() => isaretModaliniAc(s)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-orange-700 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors whitespace-nowrap"
            >
              <Repeat size={11} /> Tekrar İzlemeye Al
            </button>
          )}
          {isKameraman && s.takip?.durum === "bekliyor" && (
            <button
              onClick={() => setKaldirilacak(s.takip)}
              title="İşareti kaldır"
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 size={14} />
            </button>
          )}
          <button
            onClick={() => setRaporlarSatiri(s)}
            title="Puanlanan raporlar"
            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
          >
            <Eye size={14} />
          </button>
        </div>
      ),
    },
  ];

  const selectSinif = "px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white";

  return (
    <div className="flex flex-col gap-5">
      {/* Başlık */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Gauge size={18} className="text-indigo-600" />
            <h1 className="text-xl font-bold text-slate-900">Personel Seç</h1>
          </div>
          <p className="text-sm text-slate-500">
            {donemEtiketi(ay, yil)}{oncekiAyMi ? " (tamamlanan son ay)" : ""} · bu dönemde puanlı matris raporu olan tüm personel, ortalama puanıyla
            {isKameraman ? " · tekrar izlenmesini istediğiniz personeli seçin" : ""}
          </p>
        </div>
        {secilenler.size > 0 && isKameraman && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSecilenler(new Set())}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-full hover:bg-indigo-100 transition-colors"
            >
              {seciliSatirlar.length} seçili <X size={12} />
            </button>
            <button
              onClick={() => isaretModaliniAc()}
              disabled={seciliSatirlar.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
            >
              <Repeat size={14} /> Seçilenleri Tekrar İzlemeye Al ({seciliSatirlar.length})
            </button>
          </div>
        )}
      </div>

      {/* Dönem */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-end gap-4 flex-wrap">
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Ay</label>
          <select value={ay} onChange={(e) => setAy(Number(e.target.value))} className={selectSinif}>
            {AYLAR.map((ad, i) => <option key={i} value={i}>{ad}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Yıl</label>
          <select value={yil} onChange={(e) => setYil(Number(e.target.value))} className={selectSinif}>
            {yillar.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        {!oncekiAyMi && (
          <button
            onClick={() => { setAy(oncekiAy.ay); setYil(oncekiAy.yil); }}
            className="self-center px-3 py-2 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors whitespace-nowrap"
          >
            Son tamamlanan aya dön ({donemEtiketi(oncekiAy.ay, oncekiAy.yil)})
          </button>
        )}
        <p className="ml-auto text-xs text-slate-400 self-center">
          Seçim, tamamlanan son ayın puanları üzerinden yapılır. Puana göre daraltmak için Ortalama Puan sütunundaki filtreyi kullanabilirsiniz.
        </p>
      </div>

      {hata && (
        <div className="flex items-start gap-2 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" /> {hata}
        </div>
      )}

      {/* Tablo */}
      {!loading && satirlar.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200">
          <EmptyState
            icon={Gauge}
            title={`${donemEtiketi(ay, yil)} için puanlı matris raporu yok`}
            description="Bu dönemde puanlı matris raporu bulunmuyor (yorumlu puanlı raporlar ortalamaya girmez). Farklı bir ay seçin."
          />
        </div>
      ) : (
        <DataTable
          data={satirlar}
          columns={columns}
          rowKey={(s) => s.personelId}
          loading={loading}
          searchPlaceholder="Personel, mağaza veya kamera gözlem ara..."
          emptyIcon={CheckCircle2}
          emptyTitle="Kayıt yok"
          defaultPageSize={25}
          onVisibleRowsChange={setGorunenListe}
        />
      )}

      {/* İşaretleme modalı */}
      <Modal open={isaretModalAcik} onClose={() => !isaretleniyor && setIsaretModalAcik(false)} title="Tekrar İzlemeye Al">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Seçilen <span className="font-semibold text-slate-800">{seciliSatirlar.length}</span> personel İzlenecekler havuzuna
            eklenecek. Herhangi bir kameraman havuzdan seçip zayıf personel formuyla takip raporu açabilir.
          </p>
          <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-56 overflow-y-auto">
            {seciliSatirlar.map((s) => (
              <div key={s.personelId} className="flex items-center justify-between px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{s.personelAd}</p>
                  <p className="text-xs text-slate-400 truncate">{s.enDusukMagazaAd} · {s.raporSayisi} rapor</p>
                </div>
                <span className={`text-sm font-bold tabular-nums ${puanRenkSinifi(s.ortalamaPuan, RENK_ESIGI)}`}>{s.ortalamaPuan}</span>
              </div>
            ))}
          </div>
          <label className="block">
            <span className="text-xs font-medium text-slate-500">Not (isteğe bağlı, tüm seçilenlere yazılır)</span>
            <textarea
              value={isaretNotu}
              onChange={(e) => setIsaretNotu(e.target.value)}
              rows={2}
              placeholder="Örn. Kasa işlemlerine odaklanılsın"
              className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 resize-none"
            />
          </label>
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setIsaretModalAcik(false)}
              disabled={isaretleniyor}
              className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              İptal
            </button>
            <button
              onClick={handleIsaretle}
              disabled={isaretleniyor || seciliSatirlar.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-60"
            >
              <Repeat size={14} /> {isaretleniyor ? "Kaydediliyor..." : "Havuza Ekle"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Raporlar modalı */}
      <Modal open={!!raporlarSatiri} onClose={() => setRaporlarSatiri(null)} title={`${raporlarSatiri?.personelAd ?? ""} — ${donemEtiketi(ay, yil)} raporları`}>
        {raporlarSatiri && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Ortalama <span className={`font-bold ${puanRenkSinifi(raporlarSatiri.ortalamaPuan, RENK_ESIGI)}`}>{raporlarSatiri.ortalamaPuan}</span>
              {" "}· {raporlarSatiri.raporSayisi} puanlı rapor
              {raporlarSatiri.sonGozlemciAd && <> · son gözlem: <span className="font-medium text-slate-800">{raporlarSatiri.sonGozlemciAd}</span></>}
            </p>
            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100">
              {raporlarSatiri.puanlar.map((p) => (
                <Link
                  key={p.degerlendirmeId}
                  href={`/degerlendirmeler/${p.degerlendirmeId}`}
                  className="flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 transition-colors group"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate group-hover:text-indigo-700">{p.formAd}</p>
                    <p className="text-xs text-slate-400 truncate inline-flex items-center gap-1"><Store size={10} /> {p.magazaAd}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <Badge variant={p.tip === "matris" ? "puanli" : "yorumlu_puanli"} />
                    <span className={`text-sm font-bold tabular-nums ${puanRenkSinifi(p.puan, RENK_ESIGI)}`}>{p.puan}</span>
                  </div>
                </Link>
              ))}
            </div>
            {raporlarSatiri.takipRaporu && (
              <p className="text-xs text-slate-500">
                Takip raporu:{" "}
                <Link href={`/degerlendirmeler/${raporlarSatiri.takipRaporu.id}`} className="font-medium text-indigo-600 hover:underline">
                  {raporlarSatiri.takipRaporu.formAd}
                </Link>
                {raporlarSatiri.takipPuan !== null && <> · puan <span className="font-bold">{raporlarSatiri.takipPuan}</span></>}
              </p>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!kaldirilacak}
        title="İşareti Kaldır"
        description={`${kaldirilacak?.personelAd ?? ""} izlenecekler havuzundan çıkarılacak. Gerekirse yeniden işaretleyebilirsiniz.`}
        confirmLabel="Kaldır"
        loading={kaldiriliyor}
        onConfirm={handleKaldir}
        onCancel={() => setKaldirilacak(null)}
      />
    </div>
  );
}
