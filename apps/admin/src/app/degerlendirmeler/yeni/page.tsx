"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check } from "lucide-react";
import { getFormlar, getAktifPersoneller, getForm, getBolum, getSoru, createDegerlendirme } from "@/lib/firestore";
import { hesaplaPuan } from "@/lib/skorlama";
import { useAuth } from "@/contexts/AuthContext";
import type { Form, Personel, Bolum, Soru, CevapSecenegi, BolumSnapshot, SoruSnapshot } from "@/types";
import { Timestamp } from "firebase/firestore";

type Adim = "secim" | "cevapla";

interface BolumDetay extends Bolum {
  sorular: Soru[];
}

export default function YeniDegerlendirmePage() {
  const router = useRouter();
  const { user } = useAuth();

  const [adim, setAdim] = useState<Adim>("secim");
  const [formlar, setFormlar] = useState<Form[]>([]);
  const [personeller, setPersoneller] = useState<Personel[]>([]);
  const [seciliFormId, setSeciliFormId] = useState("");
  const [seciliPersonelId, setSeciliPersonelId] = useState("");
  const [tarih, setTarih] = useState(new Date().toISOString().split("T")[0]);

  const [seciliForm, setSeciliForm] = useState<Form | null>(null);
  const [bolumDetaylar, setBolumDetaylar] = useState<BolumDetay[]>([]);
  const [cevaplar, setCevaplar] = useState<Record<string, CevapSecenegi>>({});

  const [yukleniyor, setYukleniyor] = useState(true);
  const [baslaniyor, setBaslaniyor] = useState(false);
  const [kaydediliyor, setKaydediliyor] = useState(false);

  useEffect(() => {
    Promise.all([getFormlar(), getAktifPersoneller()]).then(([f, p]) => {
      setFormlar(f);
      setPersoneller(p);
      setYukleniyor(false);
    });
  }, []);

  async function handleBasla(e: React.FormEvent) {
    e.preventDefault();
    if (!seciliFormId || !seciliPersonelId) return;
    setBaslaniyor(true);

    const form = await getForm(seciliFormId);
    if (!form) { setBaslaniyor(false); return; }
    setSeciliForm(form);

    const detaylar: BolumDetay[] = [];
    for (const bolumId of form.bolumIdleri) {
      const bolum = await getBolum(bolumId);
      if (!bolum) continue;
      const sorular: Soru[] = [];
      for (const soruId of bolum.soruIdleri) {
        const soru = await getSoru(soruId);
        if (soru) sorular.push(soru);
      }
      detaylar.push({ ...bolum, sorular });
    }
    setBolumDetaylar(detaylar);
    setAdim("cevapla");
    setBaslaniyor(false);
  }

  function setCevap(soruId: string, cevap: CevapSecenegi) {
    setCevaplar((prev) => ({ ...prev, [soruId]: cevap }));
  }

  const tumSorular = bolumDetaylar.flatMap((b) => b.sorular);
  const cevaplananSayisi = tumSorular.filter((s) => cevaplar[s.id]).length;

  async function handleKaydet() {
    if (!seciliForm || !user) return;
    setKaydediliyor(true);

    const soruSnapshot: Record<string, SoruSnapshot> = {};
    tumSorular.forEach((s) => { soruSnapshot[s.id] = { metin: s.metin, puan: s.puan }; });

    const bolumSnapshot: Record<string, BolumSnapshot> = {};
    bolumDetaylar.forEach((b) => { bolumSnapshot[b.id] = { ad: b.ad, soruIdleri: b.soruIdleri }; });

    const personel = personeller.find((p) => p.id === seciliPersonelId)!;

    let toplamPuan: number | null = null;
    let maxPuan: number | null = null;
    if (seciliForm.puanli) {
      const hesap = hesaplaPuan(cevaplar, soruSnapshot);
      toplamPuan = hesap.toplamPuan;
      maxPuan = hesap.maxPuan;
    }

    const tarihDate = new Date(tarih);
    const id = await createDegerlendirme({
      formId: seciliForm.id,
      formAd: seciliForm.ad,
      personelId: seciliPersonelId,
      personelAd: personel.ad,
      degerlendiren: user.uid,
      tarih: Timestamp.fromDate(tarihDate),
      puanli: seciliForm.puanli,
      toplamPuan,
      maxPuan,
      cevaplar,
      bolumSnapshot,
      soruSnapshot,
    });

    router.push(`/degerlendirmeler/${id}`);
  }

  if (yukleniyor) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (adim === "secim") {
    return (
      <div className="max-w-lg">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/degerlendirmeler" className="text-sm text-slate-500 hover:text-slate-700">Değerlendirmeler</Link>
          <span className="text-slate-300">/</span>
          <span className="text-sm font-semibold text-slate-800">Yeni Değerlendirme</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-6">
          <h1 className="text-lg font-bold text-slate-900 mb-5">Yeni Değerlendirme</h1>
          <form onSubmit={handleBasla} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Form</label>
              <select
                value={seciliFormId}
                onChange={(e) => setSeciliFormId(e.target.value)}
                required
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="">Form seçin...</option>
                {formlar.map((f) => <option key={f.id} value={f.id}>{f.ad}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Personel</label>
              <select
                value={seciliPersonelId}
                onChange={(e) => setSeciliPersonelId(e.target.value)}
                required
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="">Personel seçin...</option>
                {personeller.map((p) => <option key={p.id} value={p.id}>{p.ad}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Tarih</label>
              <input
                type="date"
                value={tarih}
                onChange={(e) => setTarih(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={baslaniyor || !seciliFormId || !seciliPersonelId}
                className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-60"
              >
                {baslaniyor ? "Yükleniyor..." : "Başla →"}
              </button>
              <Link href="/degerlendirmeler" className="px-5 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                İptal
              </Link>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setAdim("secim")} className="text-sm text-slate-500 hover:text-slate-700">← Geri</button>
          <span className="text-slate-300">/</span>
          <span className="text-sm font-semibold text-slate-800">{seciliForm?.ad}</span>
        </div>
        <span className="text-xs text-slate-400">{cevaplananSayisi} / {tumSorular.length} cevaplandı</span>
      </div>

      {/* İlerleme çubuğu */}
      <div className="h-1.5 bg-slate-100 rounded-full mb-6 overflow-hidden">
        <div
          className="h-full bg-indigo-600 rounded-full transition-all"
          style={{ width: tumSorular.length ? `${(cevaplananSayisi / tumSorular.length) * 100}%` : "0%" }}
        />
      </div>

      <div className="space-y-4">
        {bolumDetaylar.map((bolum) => (
          <div key={bolum.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
              <p className="text-sm font-semibold text-slate-800">{bolum.ad}</p>
            </div>
            <div className="divide-y divide-slate-50">
              {bolum.sorular.map((soru, i) => {
                const cevap = cevaplar[soru.id];
                return (
                  <div key={soru.id} className="px-5 py-4">
                    <p className="text-sm text-slate-700 mb-3">
                      <span className="text-slate-400 mr-2">{i + 1}.</span>
                      {soru.metin}
                      {seciliForm?.puanli && <span className="ml-2 text-xs text-indigo-600 font-semibold">({soru.puan} puan)</span>}
                    </p>
                    <div className="flex items-center gap-2">
                      {(["evet", "hayir", "muaf"] as CevapSecenegi[]).map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setCevap(soru.id, opt)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 text-xs font-semibold transition-colors ${
                            cevap === opt
                              ? opt === "evet" ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                                : opt === "hayir" ? "border-red-400 bg-red-50 text-red-600"
                                : "border-slate-400 bg-slate-100 text-slate-600"
                              : "border-slate-200 text-slate-500 hover:bg-slate-50"
                          }`}
                        >
                          {cevap === opt && <Check size={11} />}
                          {opt === "evet" ? "Evet" : opt === "hayir" ? "Hayır" : "Muaf"}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={handleKaydet}
          disabled={kaydediliyor || cevaplananSayisi < tumSorular.length}
          className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-60"
        >
          {kaydediliyor ? "Kaydediliyor..." : "Değerlendirmeyi Tamamla"}
        </button>
        {cevaplananSayisi < tumSorular.length && (
          <p className="text-xs text-slate-400">{tumSorular.length - cevaplananSayisi} soru cevaplanmadı</p>
        )}
      </div>
    </div>
  );
}
