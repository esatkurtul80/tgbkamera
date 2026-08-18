"use client";

import { useEffect, useRef, useState } from "react";
import { Timestamp } from "firebase/firestore";
import { Upload, RotateCcw, Check } from "lucide-react";
import {
  pdfRaporBloklariOlustur,
  PDF_SAYFA_GENISLIK,
  RAPOR_RENK,
} from "@/components/degerlendirme/PdfRapor";
import { getRaporTasarim, saveRaporTasarim } from "@/lib/firestore";
import { uploadRaporLogo } from "@/lib/storage";
import {
  FONT_SECENEKLERI,
  VARSAYILAN_RAPOR_FONTLARI,
  VARSAYILAN_RAPOR_BOYUTLARI,
  VARSAYILAN_RAPOR_HARF_ARALIKLARI,
  tasarimBirlestir,
  type RaporFontlari,
  type RaporFontBoyutlari,
  type RaporHarfAraliklari,
  type RaporTasarimAyarlari,
} from "@/lib/raporTasarim";
import type { Degerlendirme } from "@/types";

const FONT_ROLLERI: { key: keyof RaporFontlari; etiket: string }[] = [
  { key: "firma", etiket: "Firma Adı (üst bant)" },
  { key: "altBaslik", etiket: "\"Değerlendirme Raporu\" Yazısı (üst bant)" },
  { key: "baslik", etiket: "Rapor Başlığı" },
  { key: "kunye", etiket: "Künye Bilgileri" },
  { key: "puan", etiket: "Puan" },
  { key: "soruBaslik", etiket: "Bölüm ve Soru Başlıkları" },
  { key: "metin", etiket: "Cevap ve Yorum Metinleri" },
];

/** Önizlemede kullanılan örnek fotoğraf (gri kutu, harici istek gerektirmez). */
const ORNEK_FOTO =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="240"><rect width="400" height="240" fill="#e9dcda"/><text x="200" y="125" text-anchor="middle" font-family="sans-serif" font-size="15" fill="#a08a8e">Fotoğraf Örneği</text></svg>`
  );

function ornekDegerlendirme(): Degerlendirme {
  const simdi = Timestamp.now();
  return {
    id: "ONIZLEME1",
    formAd: "Mağaza Genel Değerlendirme Formu",
    personelAd: "Ayşe Yılmaz",
    magazaAd: "Kadıköy Şubesi",
    puanli: true,
    puanGirisTipi: "manuel",
    toplamPuan: 87,
    izlenmeTarihi: simdi,
    olusturmaTarihi: simdi,
    bolumSnapshot: {
      b1: { ad: "Hizmet Kalitesi", soruIdleri: ["s1", "s2", "s3"] },
      b2: { ad: "Genel Yorum", soruIdleri: ["s4"] },
    },
    soruSnapshot: {
      s1: { metin: "Müşterilerimizle olan iletişimi nasıl?", tip: "yorum" },
      s2: { metin: "Gelen müşterilerimize kuralları uyguluyor mu?", tip: "evet_hayir_muaf" },
      s3: { metin: "Vardiyaya kaçta başladı?", tip: "saat" },
      s4: { metin: "Diğer gözlemler", tip: "yorum" },
    },
    puansizCevaplar: {
      s1: { yorum: "Müşterilere karşı güler yüzlü ve ilgili; yoğun saatlerde bile sakin bir iletişim kurdu." },
      s2: { evetHayirMuaf: "evet", yorum: "Kurallara eksiksiz uyum gözlendi.", fotograflar: [ORNEK_FOTO, ORNEK_FOTO] },
      s3: { saat: "08:55" },
      s4: { yorum: "Reyon düzeni gün boyunca korundu." },
    },
  } as unknown as Degerlendirme;
}

export default function RaporTasarimiPage() {
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);
  const [logoDosya, setLogoDosya] = useState<File | null>(null);
  const [logoOnizleme, setLogoOnizleme] = useState<string | undefined>(undefined);
  const [fontlar, setFontlar] = useState<RaporFontlari>(VARSAYILAN_RAPOR_FONTLARI);
  const [boyutlar, setBoyutlar] = useState<RaporFontBoyutlari>(VARSAYILAN_RAPOR_BOYUTLARI);
  const [harfAraliklar, setHarfAraliklar] = useState<RaporHarfAraliklari>(VARSAYILAN_RAPOR_HARF_ARALIKLARI);
  const [kayitli, setKayitli] = useState<RaporTasarimAyarlari | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hata, setHata] = useState("");
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    getRaporTasarim()
      .then((kayit) => {
        const t = tasarimBirlestir(kayit);
        setLogoUrl(t.logoUrl);
        setFontlar(t.fontlar);
        setBoyutlar(t.boyutlar);
        setHarfAraliklar(t.harfAraliklar);
        setKayitli(t);
      })
      .finally(() => setLoading(false));
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  const gosterilenLogo = logoOnizleme ?? logoUrl;
  const dirty =
    kayitli !== null &&
    (logoDosya !== null ||
      (logoUrl ?? "") !== (kayitli.logoUrl ?? "") ||
      FONT_ROLLERI.some(({ key }) => fontlar[key] !== kayitli.fontlar[key]) ||
      FONT_ROLLERI.some(({ key }) => boyutlar[key] !== kayitli.boyutlar[key]) ||
      harfAraliklar.firma !== kayitli.harfAraliklar.firma ||
      harfAraliklar.altBaslik !== kayitli.harfAraliklar.altBaslik);

  function logoSec(file: File) {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setLogoDosya(file);
    setLogoOnizleme(url);
    setHata("");
  }

  function logoKaldir() {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = null;
    setLogoDosya(null);
    setLogoOnizleme(undefined);
    setLogoUrl(undefined);
  }

  async function kaydet() {
    if (!dirty || saving) return;
    setSaving(true);
    setHata("");
    try {
      let sonLogoUrl = logoUrl;
      if (logoDosya) sonLogoUrl = await uploadRaporLogo(logoDosya);
      const yeni: RaporTasarimAyarlari = { logoUrl: sonLogoUrl, fontlar, boyutlar, harfAraliklar };
      await saveRaporTasarim(yeni);
      setLogoUrl(sonLogoUrl);
      setLogoDosya(null);
      setLogoOnizleme(undefined);
      if (objectUrlRef.current) { URL.revokeObjectURL(objectUrlRef.current); objectUrlRef.current = null; }
      setKayitli(yeni);
    } catch (err) {
      setHata((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const onizlemeTasarim: RaporTasarimAyarlari = { logoUrl: gosterilenLogo, fontlar, boyutlar, harfAraliklar };
  const bloklar = pdfRaporBloklariOlustur(ornekDegerlendirme(), onizlemeTasarim);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Rapor Tasarımı</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          PDF raporlardaki firma logosunu ve yazı stillerini özelleştirin. Değişiklikler tüm yeni indirilen raporlara uygulanır.
        </p>
      </div>

      <div className="flex items-start gap-5 flex-col lg:flex-row">
        {/* ── Ayarlar ── */}
        <div className="w-full lg:w-72 shrink-0 lg:sticky lg:top-5 bg-white rounded-2xl border border-slate-100 p-5 space-y-6">
          <div>
            <p className="text-[10px] font-semibold text-slate-400 tracking-widest uppercase mb-3">Firma Logosu</p>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg border border-slate-200 bg-white flex items-center justify-center overflow-hidden shrink-0">
                {gosterilenLogo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={gosterilenLogo} alt="Logo" className="max-w-full max-h-full object-contain p-1" />
                ) : (
                  <span className="text-[9px] text-slate-300 text-center leading-tight">Logo yok</span>
                )}
              </div>
              <div className="flex-1 space-y-1.5">
                <label className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                  <Upload size={12} /> Bilgisayardan Yükle
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) logoSec(file);
                      e.target.value = "";
                    }}
                  />
                </label>
                {gosterilenLogo && (
                  <button onClick={logoKaldir} className="w-full text-[11px] text-slate-400 hover:text-red-500 underline transition-colors">
                    Logoyu kaldır
                  </button>
                )}
              </div>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-semibold text-slate-400 tracking-widest uppercase mb-3">Yazı Stilleri</p>
            <div className="space-y-3">
              {FONT_ROLLERI.map(({ key, etiket }) => (
                <div key={key}>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">{etiket}</label>
                  <div className="flex gap-1.5">
                    <select
                      value={fontlar[key]}
                      onChange={(e) => setFontlar((prev) => ({ ...prev, [key]: e.target.value }))}
                      className="flex-1 min-w-0 px-2.5 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {FONT_SECENEKLERI.map((f) => (
                        <option key={f.key} value={f.key}>{f.etiket}</option>
                      ))}
                    </select>
                    <div className="relative shrink-0">
                      <input
                        type="number"
                        min={8}
                        max={72}
                        step={0.5}
                        value={boyutlar[key]}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          if (!Number.isFinite(v)) return;
                          setBoyutlar((prev) => ({ ...prev, [key]: Math.min(72, Math.max(8, v)) }));
                        }}
                        title="Yazı boyutu (px)"
                        className="w-16 pl-2 pr-6 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-slate-400 pointer-events-none">px</span>
                    </div>
                  </div>
                  {(key === "firma" || key === "altBaslik") && (
                    <div className="flex items-center gap-2 mt-1.5">
                      <label className="text-[10px] text-slate-500 shrink-0">Harf aralığı</label>
                      <input
                        type="range"
                        min={0}
                        max={8}
                        step={0.1}
                        value={harfAraliklar[key]}
                        onChange={(e) => setHarfAraliklar((prev) => ({ ...prev, [key]: Number(e.target.value) }))}
                        className="flex-1 accent-indigo-600"
                      />
                      <span className="text-[10px] text-slate-500 w-9 text-right shrink-0">
                        {harfAraliklar[key].toFixed(1)} px
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={() => {
                setFontlar(VARSAYILAN_RAPOR_FONTLARI);
                setBoyutlar(VARSAYILAN_RAPOR_BOYUTLARI);
                setHarfAraliklar(VARSAYILAN_RAPOR_HARF_ARALIKLARI);
              }}
              className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <RotateCcw size={11} /> Yazı stillerini sıfırla
            </button>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <button
              onClick={kaydet}
              disabled={!dirty || saving}
              className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl transition-colors ${
                dirty ? "bg-indigo-600 text-white hover:bg-indigo-700" : "bg-slate-100 text-slate-400 cursor-default"
              } disabled:opacity-70`}
            >
              <Check size={14} />
              {saving ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
            </button>
            {dirty && !saving && (
              <p className="text-center text-[11px] text-amber-600 mt-2">Kaydedilmemiş değişiklikler var</p>
            )}
            {hata && <p className="text-center text-[11px] text-red-500 mt-2">{hata}</p>}
          </div>
        </div>

        {/* ── Canlı önizleme ── */}
        <div className="flex-1 min-w-0 overflow-x-auto">
          <div
            className="rounded-[10px] border shadow-sm mx-auto"
            style={{
              width: PDF_SAYFA_GENISLIK,
              maxWidth: "100%",
              background: RAPOR_RENK.kagit,
              borderColor: RAPOR_RENK.line,
              padding: "40px 48px 48px",
            }}
          >
            {bloklar.map((b, i) => (
              <div key={i}>{b.el}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
