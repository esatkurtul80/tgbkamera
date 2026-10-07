"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Trophy, History, Store, ExternalLink, AlertTriangle, Users, ClipboardList,
  Gauge, CalendarRange, MapIcon, FileSpreadsheet,
} from "lucide-react";
import DataTable, { type DataColumn } from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import StatKart from "@/components/ui/StatKart";
import {
  getDegerlendirmelerByOlusturmaAraligi,
  getDegerlendirmeler,
  getAktifPersoneller,
  getMagazalar,
  getKullanicilar,
} from "@/lib/firestore";
import {
  puanRaporlamaHesapla,
  gecmisHesapla,
  type PuanRaporlamaSatiri,
  type PuanGecmisi,
} from "@/lib/puanRaporlama";
import { PUAN_RENK_ESIGI, donemEtiketi, puanRenkSinifi, puanRozetSinifi } from "@/lib/puan";
import type { Degerlendirme, Kullanici, Magaza, Personel } from "@/types";

const RENK_ESIGI = PUAN_RENK_ESIGI;

// ── Tarih yardımcıları ──────────────────────────────────────────────────────

/** Date → input[type=date] değeri (yerel saat, yyyy-MM-dd). */
function isoGun(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const g = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${g}`;
}

/** "yyyy-MM-dd" → yerel Date (saat 00:00). */
function gunParse(s: string): Date {
  const [y, m, g] = s.split("-").map(Number);
  return new Date(y, m - 1, g);
}

interface Aralik { from: string; to: string }

function buAy(): Aralik {
  const s = new Date();
  return {
    from: isoGun(new Date(s.getFullYear(), s.getMonth(), 1)),
    to: isoGun(new Date(s.getFullYear(), s.getMonth() + 1, 0)),
  };
}

function gecenAy(): Aralik {
  const s = new Date();
  return {
    from: isoGun(new Date(s.getFullYear(), s.getMonth() - 1, 1)),
    to: isoGun(new Date(s.getFullYear(), s.getMonth(), 0)),
  };
}

function sonUcAy(): Aralik {
  const s = new Date();
  return {
    from: isoGun(new Date(s.getFullYear(), s.getMonth() - 2, 1)),
    to: isoGun(new Date(s.getFullYear(), s.getMonth() + 1, 0)),
  };
}

function aralikEtiketi(a: Aralik): string {
  const f = gunParse(a.from).toLocaleDateString("tr-TR");
  const t = gunParse(a.to).toLocaleDateString("tr-TR");
  return `${f} – ${t}`;
}

function ayniAralik(a: Aralik, b: Aralik): boolean {
  return a.from === b.from && a.to === b.to;
}

// ── Sayfa ───────────────────────────────────────────────────────────────────

export default function PuanRaporlamalariPage() {
  const [aralik, setAralik] = useState<Aralik>(buAy);
  const [taslak, setTaslak] = useState<Aralik>(buAy);

  const [raporlar, setRaporlar] = useState<Degerlendirme[]>([]);
  const [personeller, setPersoneller] = useState<Personel[]>([]);
  const [magazalar, setMagazalar] = useState<Magaza[]>([]);
  const [kullanicilar, setKullanicilar] = useState<Kullanici[]>([]);
  const [sabitlerYuklendi, setSabitlerYuklendi] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hata, setHata] = useState<string | null>(null);

  // Excel: tablodaki filtre/arama uygulanmış satırlar indirilir
  const [gorunenSatirlar, setGorunenSatirlar] = useState<PuanRaporlamaSatiri[]>([]);
  const [excelIndiriliyor, setExcelIndiriliyor] = useState(false);
  const [gecmisExcelIndiriliyor, setGecmisExcelIndiriliyor] = useState(false);

  // Geçmiş modalı
  const [gecmisSatiri, setGecmisSatiri] = useState<PuanRaporlamaSatiri | null>(null);
  const [gecmis, setGecmis] = useState<PuanGecmisi | null>(null);
  const [gecmisYukleniyor, setGecmisYukleniyor] = useState(false);
  const gecmisOnbellek = useRef(new Map<string, Degerlendirme[]>());

  // Sabit veriler bir kez
  useEffect(() => {
    let iptal = false;
    (async () => {
      try {
        const [p, m, k] = await Promise.all([
          getAktifPersoneller(),
          getMagazalar(),
          // users okuma izni kameraman rolünde kuralla engellenebilir → bölge müdürü sütunu boş kalır
          getKullanicilar().catch(() => [] as Kullanici[]),
        ]);
        if (iptal) return;
        setPersoneller(p);
        setMagazalar(m);
        setKullanicilar(k);
      } catch (e) {
        if (!iptal) setHata(e instanceof Error ? e.message : "Veriler yüklenemedi");
      } finally {
        if (!iptal) setSabitlerYuklendi(true);
      }
    })();
    return () => { iptal = true; };
  }, []);

  // Aralık değişince yalnız değerlendirmeler
  useEffect(() => {
    let iptal = false;
    setLoading(true);
    setHata(null);
    const baslangic = gunParse(aralik.from);
    const bitis = gunParse(aralik.to);
    bitis.setHours(23, 59, 59, 999);
    getDegerlendirmelerByOlusturmaAraligi(baslangic, bitis)
      .then((d) => { if (!iptal) setRaporlar(d); })
      .catch((e) => { if (!iptal) setHata(e instanceof Error ? e.message : "Raporlar yüklenemedi"); })
      .finally(() => { if (!iptal) setLoading(false); });
    return () => { iptal = true; };
  }, [aralik]);

  const { satirlar, ozet } = useMemo(
    () => puanRaporlamaHesapla({ raporlar, personeller, magazalar, kullanicilar }),
    [raporlar, personeller, magazalar, kullanicilar]
  );

  const magazaAdMap = useMemo(() => new Map(magazalar.map((m) => [m.id, m.ad])), [magazalar]);

  const gecmisiAc = useCallback(async (s: PuanRaporlamaSatiri) => {
    setGecmisSatiri(s);
    setGecmis(null);
    const onbellek = gecmisOnbellek.current.get(s.personelId);
    if (onbellek) {
      setGecmis(gecmisHesapla(onbellek, magazaAdMap));
      return;
    }
    setGecmisYukleniyor(true);
    try {
      const tum = await getDegerlendirmeler({ personelId: s.personelId });
      gecmisOnbellek.current.set(s.personelId, tum);
      setGecmis(gecmisHesapla(tum, magazaAdMap));
    } catch {
      setGecmis(gecmisHesapla([], magazaAdMap));
    } finally {
      setGecmisYukleniyor(false);
    }
  }, [magazaAdMap]);

  async function handleExcelIndir() {
    if (gorunenSatirlar.length === 0) return;
    setExcelIndiriliyor(true);
    try {
      const { puanRaporlamaExcelIndir } = await import("@/lib/excelExport");
      await puanRaporlamaExcelIndir(gorunenSatirlar, aralikEtiketi(aralik));
    } finally {
      setExcelIndiriliyor(false);
    }
  }

  async function handleGecmisExcelIndir() {
    if (!gecmisSatiri || !gecmis) return;
    setGecmisExcelIndiriliyor(true);
    try {
      const { puanGecmisiExcelIndir } = await import("@/lib/excelExport");
      await puanGecmisiExcelIndir(gecmisSatiri.personelAd, gecmis);
    } finally {
      setGecmisExcelIndiriliyor(false);
    }
  }

  function uygula() {
    if (!taslak.from || !taslak.to) return;
    let { from, to } = taslak;
    if (from > to) [from, to] = [to, from];
    const yeni = { from, to };
    setTaslak(yeni);
    setAralik(yeni);
  }

  function hizliSec(a: Aralik) {
    setTaslak(a);
    setAralik(a);
  }

  const taslakGecerli = !!taslak.from && !!taslak.to;
  const taslakDegisti = !ayniAralik(taslak, aralik);

  // ── Sütunlar ─────────────────────────────────────────────────────────────
  const columns: DataColumn<PuanRaporlamaSatiri>[] = [
    {
      key: "bolgeMuduru",
      header: "Bölge Müdürü",
      searchValue: (s) => s.bolgeMudurAdlari.join(" "),
      sortValue: (s) => s.bolgeMudurAdlari.join(", "),
      filterValue: (s) => s.bolgeMudurAdlari.join(", ") || "—",
      cell: (s) =>
        s.bolgeMudurAdlari.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {s.bolgeMudurAdlari.map((ad) => (
              <span key={ad} className="inline-flex items-center gap-1 text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-medium">
                <MapIcon size={10} /> {ad}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-slate-300 text-sm">—</span>
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
            <p className="text-[10px] text-slate-400">
              {s.matrisSayisi > 0 && `${s.matrisSayisi} puanlı`}
              {s.matrisSayisi > 0 && s.yorumluSayisi > 0 && " · "}
              {s.yorumluSayisi > 0 && `${s.yorumluSayisi} yorumlu`}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "raporSayisi",
      header: "Rapor",
      align: "center",
      width: "80px",
      sortValue: (s) => s.raporSayisi,
      cell: (s) => <span className="text-sm font-semibold text-slate-700 tabular-nums">{s.raporSayisi}</span>,
    },
    {
      key: "puan",
      header: "Ortalama Puan",
      align: "center",
      width: "130px",
      sortValue: (s) => s.ortalamaPuan,
      filterNumber: (s) => s.ortalamaPuan,
      cell: (s) => (
        <span className={`inline-block text-sm font-bold tabular-nums border px-2.5 py-0.5 rounded-lg ${puanRozetSinifi(s.ortalamaPuan, RENK_ESIGI)}`}>
          {s.ortalamaPuan}
        </span>
      ),
    },
    {
      key: "gecmis",
      header: "",
      align: "right",
      width: "110px",
      cell: (s) => (
        <button
          onClick={() => gecmisiAc(s)}
          title="Personelin tüm puan geçmişi"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors whitespace-nowrap"
        >
          <History size={12} /> Geçmiş
        </button>
      ),
    },
  ];

  const inputSinif = "px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white";
  const hizliSinif = (aktif: boolean) =>
    `px-3 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
      aktif
        ? "text-white bg-indigo-600 border-indigo-600"
        : "text-indigo-700 bg-indigo-50 border-indigo-200 hover:bg-indigo-100"
    }`;

  return (
    <div className="flex flex-col gap-5">
      {/* Başlık */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Trophy size={18} className="text-indigo-600" />
            <h1 className="text-xl font-bold text-slate-900">Puan Raporlamaları</h1>
          </div>
          <p className="text-sm text-slate-500">
            {aralikEtiketi(aralik)} · puanlı matris ve yorumlu puanlı raporlardan personel başına ortalama puan
          </p>
        </div>
        {gorunenSatirlar.length > 0 && (
          <button
            onClick={handleExcelIndir}
            disabled={excelIndiriliyor || loading}
            title="Tablodaki (filtre uygulanmış) satırları ve raporlarını Excel olarak indir"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-60"
          >
            <FileSpreadsheet size={15} />
            {excelIndiriliyor ? "İndiriliyor..." : `Excel İndir (${gorunenSatirlar.length} personel)`}
          </button>
        )}
      </div>

      {/* Tarih aralığı */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-end gap-3 flex-wrap">
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Başlangıç</label>
          <input
            type="date"
            value={taslak.from}
            max={taslak.to || undefined}
            onChange={(e) => setTaslak((t) => ({ ...t, from: e.target.value }))}
            className={inputSinif}
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Bitiş</label>
          <input
            type="date"
            value={taslak.to}
            min={taslak.from || undefined}
            onChange={(e) => setTaslak((t) => ({ ...t, to: e.target.value }))}
            className={inputSinif}
          />
        </div>
        <button
          onClick={uygula}
          disabled={!taslakGecerli || !taslakDegisti}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <CalendarRange size={14} /> Uygula
        </button>
        <div className="flex items-center gap-2 sm:ml-2">
          <button onClick={() => hizliSec(buAy())} className={hizliSinif(ayniAralik(aralik, buAy()))}>Bu Ay</button>
          <button onClick={() => hizliSec(gecenAy())} className={hizliSinif(ayniAralik(aralik, gecenAy()))}>Geçen Ay</button>
          <button onClick={() => hizliSec(sonUcAy())} className={hizliSinif(ayniAralik(aralik, sonUcAy()))}>Son 3 Ay</button>
        </div>
        <p className="ml-auto text-xs text-slate-400 self-center">
          Rapor oluşturma tarihine göre süzülür. Takip raporları ortalamaya girmez.
        </p>
      </div>

      {hata && (
        <div className="flex items-start gap-2 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" /> {hata}
        </div>
      )}

      {/* Özet */}
      <div className="flex gap-3 flex-wrap">
        <StatKart kucuk icon={Users} title="Puanlanan Personel" value={loading ? "…" : ozet.personel} renk="bg-indigo-500" />
        <StatKart kucuk icon={ClipboardList} title="Puanlı Rapor" value={loading ? "…" : ozet.rapor} renk="bg-teal-500" />
        <StatKart
          kucuk
          icon={Gauge}
          title="Genel Ortalama"
          value={loading ? "…" : ozet.genelOrtalama ?? "—"}
          renk={ozet.genelOrtalama === null || ozet.genelOrtalama > RENK_ESIGI + 10 ? "bg-emerald-500" : ozet.genelOrtalama > RENK_ESIGI ? "bg-amber-500" : "bg-rose-500"}
        />
      </div>

      {/* Tablo */}
      <DataTable
        data={satirlar}
        columns={columns}
        rowKey={(s) => s.personelId}
        loading={loading || !sabitlerYuklendi}
        searchPlaceholder="Personel, mağaza veya bölge müdürü ara..."
        emptyIcon={Trophy}
        emptyTitle="Bu aralıkta puanlı rapor yok"
        emptyDescription="Seçilen tarih aralığında puanlı matris veya yorumlu puanlı rapor bulunmuyor. Farklı bir aralık seçin."
        basliklariHerZamanGoster
        defaultPageSize={25}
        onVisibleRowsChange={setGorunenSatirlar}
      />

      {/* Geçmiş modalı */}
      <Modal
        open={!!gecmisSatiri}
        onClose={() => setGecmisSatiri(null)}
        title={`${gecmisSatiri?.personelAd ?? ""} — Puan Geçmişi`}
        size="lg"
      >
        {gecmisYukleniyor || !gecmis ? (
          <div className="flex items-center justify-center py-12 text-sm text-slate-400">
            <span className="w-5 h-5 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mr-3" />
            Geçmiş yükleniyor…
          </div>
        ) : gecmis.kayitlar.length === 0 ? (
          <p className="text-sm text-slate-500 py-8 text-center">Bu personel için puanlı rapor bulunmuyor.</p>
        ) : (
          <div className="space-y-4">
            {/* Özet satırı */}
            <div className="flex items-center gap-x-4 gap-y-1 flex-wrap text-sm text-slate-600">
              <span>
                Genel ortalama{" "}
                <span className={`font-bold ${puanRenkSinifi(gecmis.ortalama, RENK_ESIGI)}`}>
                  {gecmis.ortalama ?? "—"}
                </span>
              </span>
              <span className="text-slate-300">·</span>
              <span>{gecmis.raporSayisi} puanlı rapor</span>
              {gecmis.matrisSayisi > 0 && <span className="text-xs text-slate-400">{gecmis.matrisSayisi} puanlı</span>}
              {gecmis.yorumluSayisi > 0 && <span className="text-xs text-slate-400">{gecmis.yorumluSayisi} yorumlu</span>}
              {gecmis.takipSayisi > 0 && (
                <span className="text-xs text-orange-600">{gecmis.takipSayisi} takip raporu (ortalamaya girmez)</span>
              )}
              <button
                onClick={handleGecmisExcelIndir}
                disabled={gecmisExcelIndiriliyor}
                className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-60"
              >
                <FileSpreadsheet size={13} />
                {gecmisExcelIndiriliyor ? "İndiriliyor..." : "Excel"}
              </button>
            </div>

            {/* Aylık gruplar */}
            {gecmis.aylar.map((g) => (
              <div key={`${g.yil}-${g.ay}`} className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-200">
                  <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">{donemEtiketi(g.ay, g.yil)}</span>
                  <span className="text-xs text-slate-500">
                    {g.kayitlar.length} rapor
                    {g.ortalama !== null && (
                      <> · ort. <span className={`font-bold ${puanRenkSinifi(g.ortalama, RENK_ESIGI)}`}>{g.ortalama}</span></>
                    )}
                  </span>
                </div>
                <div className="divide-y divide-slate-100">
                  {g.kayitlar.map((k) => (
                    <Link
                      key={k.degerlendirmeId}
                      href={`/degerlendirmeler/${k.degerlendirmeId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Rapor detayını yeni sekmede aç"
                      className="flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-slate-50 transition-colors group"
                    >
                      <div className="min-w-0 flex items-center gap-3">
                        <span className="text-xs text-slate-400 tabular-nums shrink-0 w-18">
                          {k.tarih.toLocaleDateString("tr-TR")}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate group-hover:text-indigo-700">{k.formAd}</p>
                          <p className="text-xs text-slate-400 truncate inline-flex items-center gap-1">
                            <Store size={10} /> {k.magazaAd}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {k.takip && <Badge variant="tekrar_izleme" />}
                        <Badge variant={k.tip === "matris" ? "puanli" : "yorumlu_puanli"} />
                        <span className={`text-sm font-bold tabular-nums border px-2 py-0.5 rounded-lg ${puanRozetSinifi(k.puan, RENK_ESIGI)}`}>
                          {k.puan}
                        </span>
                        <ExternalLink size={13} className="text-slate-300 group-hover:text-indigo-500" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
