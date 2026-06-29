"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { BarChart2, Target, CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import { getPersoneller, getMagazalar, getDegerlendirmeler } from "@/lib/firestore";
import { hesaplaAylikPuan } from "@/lib/skorlama";
import type { Personel, Magaza, Degerlendirme, SkorlamaSistemi } from "@/types";

interface SoruSatir {
  soruId: string;
  metin: string;
  puan: number;
  hedefYuzde?: number;
  evetSayisi: number;
  hayirSayisi: number;
  muafSayisi: number;
  toplamIzlenme: number;
  gerceklesenYuzde: number;
  kazanilanPuan: number;
}

interface BolumSonuc {
  bolumId: string;
  bolumAd: string;
  sorular: SoruSatir[];
  bolumPuani: number;
}

const AYLAR = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

function IzlenmeRaporuIcerik() {
  const searchParams = useSearchParams();
  const [personeller, setPersoneller] = useState<Personel[]>([]);
  const [magazalar, setMagazalar] = useState<Magaza[]>([]);
  const [loading, setLoading] = useState(true);
  const [hesaplaniyor, setHesaplaniyor] = useState(false);

  const now = new Date();
  const [seciliPersonelId, setSeciliPersonelId] = useState(searchParams.get("personelId") ?? "");
  const [seciliMagazaId, setSeciliMagazaId] = useState(searchParams.get("magazaId") ?? "");
  const [seciliAy, setSeciliAy] = useState(now.getMonth());
  const [seciliYil, setSeciliYil] = useState(now.getFullYear());

  const [degerlendirmeler, setDegerlendirmeler] = useState<Degerlendirme[]>([]);
  const [bolumSonuclar, setBolumSonuclar] = useState<BolumSonuc[]>([]);
  const [skorlamaSistemi, setSkorlamaSistemi] = useState<SkorlamaSistemi | null>(null);
  const [toplamIzlenme, setToplamIzlenme] = useState(0);

  useEffect(() => {
    Promise.all([getPersoneller(), getMagazalar()]).then(([p, m]) => {
      setPersoneller(p); setMagazalar(m); setLoading(false);
    });
  }, []);

  const hesapla = useCallback(async () => {
    if (!seciliPersonelId) return;
    setHesaplaniyor(true);
    setBolumSonuclar([]);

    const filters: Parameters<typeof getDegerlendirmeler>[0] = { personelId: seciliPersonelId };
    if (seciliMagazaId) filters.magazaId = seciliMagazaId;

    const liste = await getDegerlendirmeler(filters);

    // Ay filtresi
    const ayBaslangic = new Date(seciliYil, seciliAy, 1);
    const ayBitis = new Date(seciliYil, seciliAy + 1, 0, 23, 59, 59);

    const aylikListe = liste.filter((d) => {
      const t = d.izlenmeTarihi?.toDate?.();
      return t && t >= ayBaslangic && t <= ayBitis;
    });

    setDegerlendirmeler(aylikListe);
    setToplamIzlenme(aylikListe.length);

    if (aylikListe.length === 0) {
      setHesaplaniyor(false);
      return;
    }

    const ilkDeg = aylikListe[0];
    const sistem: SkorlamaSistemi = ilkDeg.skorlamaSistemi ?? "oran";
    setSkorlamaSistemi(sistem);

    const sonuclar = hesaplaAylikPuan(aylikListe, sistem);

    // BolumSonuclar'ı SoruSatir formatına dönüştür
    const duzenlenmis: BolumSonuc[] = sonuclar.map((b) => ({
      bolumId: b.bolumId,
      bolumAd: b.bolumAd,
      bolumPuani: b.bolumPuani,
      sorular: b.sorular.map((s) => ({
        soruId: s.soruId,
        metin: s.metin,
        puan: s.puan,
        hedefYuzde: s.hedefYuzde,
        evetSayisi: s.evetSayisi,
        hayirSayisi: s.hayirSayisi,
        muafSayisi: s.muafSayisi,
        toplamIzlenme: s.toplamIzlenme,
        gerceklesenYuzde: s.gerceklesenYuzde,
        kazanilanPuan: sistem === "esik"
          ? (s.hedefYuzde !== undefined
            ? (s.gerceklesenYuzde >= s.hedefYuzde ? s.puan : 0)
            : s.puan)
          : s.gerceklesenYuzde,
      })),
    }));

    setBolumSonuclar(duzenlenmis);
    setHesaplaniyor(false);
  }, [seciliPersonelId, seciliMagazaId, seciliAy, seciliYil]);

  const yillar = Array.from({ length: 3 }, (_, i) => now.getFullYear() - i);

  const seciliPersonel = personeller.find((p) => p.id === seciliPersonelId);
  const seciliMagaza = magazalar.find((m) => m.id === seciliMagazaId);

  const genelPuan = bolumSonuclar.length > 0
    ? Math.round(bolumSonuclar.reduce((t, b) => t + b.bolumPuani, 0) / bolumSonuclar.length)
    : null;

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Başlık */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <BarChart2 size={18} className="text-indigo-600" />
          <h1 className="text-xl font-bold text-slate-900">Aylık İzlenme Raporu</h1>
        </div>
        <p className="text-sm text-slate-500">Personel bazında aylık değerlendirme özeti ve soru analizi</p>
      </div>

      {/* Filtre paneli */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Personel</label>
            <select
              value={seciliPersonelId}
              onChange={(e) => setSeciliPersonelId(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="">Personel seçin...</option>
              {personeller.map((p) => <option key={p.id} value={p.id}>{p.ad}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Mağaza</label>
            <select
              value={seciliMagazaId}
              onChange={(e) => setSeciliMagazaId(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="">Tümü</option>
              {magazalar.map((m) => <option key={m.id} value={m.id}>{m.ad}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Ay</label>
            <select
              value={seciliAy}
              onChange={(e) => setSeciliAy(Number(e.target.value))}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              {AYLAR.map((ad, i) => <option key={i} value={i}>{ad}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Yıl</label>
            <select
              value={seciliYil}
              onChange={(e) => setSeciliYil(Number(e.target.value))}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              {yillar.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={hesapla}
            disabled={!seciliPersonelId || hesaplaniyor || loading}
            className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {hesaplaniyor && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {hesaplaniyor ? "Hesaplanıyor..." : "Raporu Göster"}
          </button>
          {degerlendirmeler.length > 0 && (
            <p className="text-sm text-slate-500">
              <span className="font-semibold text-slate-800">{toplamIzlenme}</span> değerlendirme bulundu
            </p>
          )}
        </div>
      </div>

      {/* Özet kartı */}
      {bolumSonuclar.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">{seciliPersonel?.ad}</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                {AYLAR[seciliAy]} {seciliYil}
                {seciliMagaza && <span className="ml-2">· {seciliMagaza.ad}</span>}
                <span className="ml-2">· {toplamIzlenme} değerlendirme</span>
                {skorlamaSistemi && (
                  <span className={`ml-2 px-1.5 py-0.5 rounded text-xs font-medium ${
                    skorlamaSistemi === "esik" ? "bg-amber-100 text-amber-700" : "bg-sky-100 text-sky-700"
                  }`}>
                    {skorlamaSistemi === "esik" ? "Eşik Bazlı" : "Oran Bazlı"}
                  </span>
                )}
              </p>
            </div>
            {genelPuan !== null && (
              <div className="text-right">
                <p className={`text-4xl font-bold ${genelPuan >= 80 ? "text-emerald-600" : genelPuan >= 60 ? "text-amber-500" : "text-red-500"}`}>
                  {genelPuan}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">genel puan</p>
              </div>
            )}
          </div>

          {/* Bölüm puanları özet */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            {bolumSonuclar.map((b) => (
              <div key={b.bolumId} className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs font-semibold text-slate-600 truncate mb-1">{b.bolumAd}</p>
                <div className="flex items-center gap-2">
                  <p className={`text-xl font-bold ${b.bolumPuani >= 80 ? "text-emerald-600" : b.bolumPuani >= 60 ? "text-amber-500" : "text-red-500"}`}>
                    {b.bolumPuani}
                  </p>
                  <div className="flex-1">
                    <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${b.bolumPuani >= 80 ? "bg-emerald-500" : b.bolumPuani >= 60 ? "bg-amber-400" : "bg-red-400"}`}
                        style={{ width: `${Math.min(100, b.bolumPuani)}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Soru detayları */}
          <div className="space-y-4">
            {bolumSonuclar.map((bolum) => (
              <div key={bolum.bolumId} className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-800">{bolum.bolumAd}</p>
                  <span className={`text-sm font-bold ${bolum.bolumPuani >= 80 ? "text-emerald-600" : bolum.bolumPuani >= 60 ? "text-amber-500" : "text-red-500"}`}>
                    {bolum.bolumPuani} puan
                  </span>
                </div>

                <div className="divide-y divide-slate-50">
                  {/* Tablo başlığı */}
                  <div className="grid grid-cols-12 gap-3 px-4 py-2 bg-slate-50/50 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    <div className="col-span-4">Soru</div>
                    <div className="col-span-1 text-center">Evet</div>
                    <div className="col-span-1 text-center">Hayır</div>
                    <div className="col-span-1 text-center">Muaf</div>
                    <div className="col-span-2 text-center">Oran</div>
                    {skorlamaSistemi === "esik" && <div className="col-span-1 text-center">Hedef</div>}
                    <div className={`${skorlamaSistemi === "esik" ? "col-span-2" : "col-span-3"} text-right`}>Puan</div>
                  </div>

                  {bolum.sorular.map((soru) => {
                    const gecti = skorlamaSistemi === "esik" && soru.hedefYuzde !== undefined
                      ? soru.gerceklesenYuzde >= soru.hedefYuzde
                      : null;
                    return (
                      <div key={soru.soruId} className="grid grid-cols-12 gap-3 px-4 py-3 items-center">
                        <div className="col-span-4">
                          <p className="text-sm text-slate-700 line-clamp-2">{soru.metin}</p>
                          {soru.toplamIzlenme > 0 && (
                            <div className="mt-1.5 h-1 bg-slate-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${
                                soru.gerceklesenYuzde >= 80 ? "bg-emerald-500" :
                                soru.gerceklesenYuzde >= 60 ? "bg-amber-400" : "bg-red-400"
                              }`} style={{ width: `${soru.gerceklesenYuzde}%` }} />
                            </div>
                          )}
                        </div>
                        <div className="col-span-1 text-center">
                          <div className="inline-flex items-center gap-1">
                            <CheckCircle2 size={11} className="text-emerald-500" />
                            <span className="text-sm font-semibold text-emerald-700">{soru.evetSayisi}</span>
                          </div>
                        </div>
                        <div className="col-span-1 text-center">
                          <div className="inline-flex items-center gap-1">
                            <XCircle size={11} className="text-red-400" />
                            <span className="text-sm font-semibold text-red-600">{soru.hayirSayisi}</span>
                          </div>
                        </div>
                        <div className="col-span-1 text-center">
                          <div className="inline-flex items-center gap-1">
                            <MinusCircle size={11} className="text-slate-400" />
                            <span className="text-sm text-slate-400">{soru.muafSayisi}</span>
                          </div>
                        </div>
                        <div className="col-span-2 text-center">
                          {soru.toplamIzlenme > 0 ? (
                            <span className={`text-sm font-bold ${
                              soru.gerceklesenYuzde >= 80 ? "text-emerald-600" :
                              soru.gerceklesenYuzde >= 60 ? "text-amber-500" : "text-red-500"
                            }`}>%{soru.gerceklesenYuzde}</span>
                          ) : <span className="text-slate-300 text-xs">—</span>}
                        </div>
                        {skorlamaSistemi === "esik" && (
                          <div className="col-span-1 text-center">
                            {soru.hedefYuzde !== undefined ? (
                              <span className="inline-flex items-center gap-0.5 text-xs font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                                <Target size={9} /> %{soru.hedefYuzde}
                              </span>
                            ) : <span className="text-slate-300 text-xs">—</span>}
                          </div>
                        )}
                        <div className={`${skorlamaSistemi === "esik" ? "col-span-2" : "col-span-3"} text-right`}>
                          {soru.toplamIzlenme > 0 ? (
                            <div className="flex items-center justify-end gap-1.5">
                              {gecti !== null && (
                                gecti
                                  ? <CheckCircle2 size={12} className="text-emerald-500" />
                                  : <XCircle size={12} className="text-red-400" />
                              )}
                              <span className={`text-sm font-bold ${
                                gecti === false ? "text-red-500" :
                                soru.kazanilanPuan >= soru.puan * 0.8 ? "text-emerald-600" :
                                soru.kazanilanPuan > 0 ? "text-amber-500" : "text-red-500"
                              }`}>
                                {Math.round(soru.kazanilanPuan)}{skorlamaSistemi === "esik" ? `/${soru.puan}` : " p"}
                              </span>
                            </div>
                          ) : <span className="text-slate-300 text-xs">—</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Boş durum */}
      {!hesaplaniyor && seciliPersonelId && degerlendirmeler.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 py-16 text-center">
          <BarChart2 size={28} className="text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-600">Bu dönemde değerlendirme bulunamadı</p>
          <p className="text-xs text-slate-400 mt-1">
            {AYLAR[seciliAy]} {seciliYil} ayında bu personel için kayıt yok.
          </p>
        </div>
      )}

      {/* İlk açılış durumu */}
      {!seciliPersonelId && !hesaplaniyor && (
        <div className="bg-white rounded-xl border border-slate-200 py-16 text-center">
          <BarChart2 size={28} className="text-slate-200 mx-auto mb-3" />
          <p className="text-sm text-slate-400">Raporu görmek için personel seçin ve butona tıklayın.</p>
        </div>
      )}
    </div>
  );
}

export default function AylikIzlenmePage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center py-16">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <IzlenmeRaporuIcerik />
    </Suspense>
  );
}
