"use client";

import React, { useEffect, useState, useMemo, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Plus, X, Trash2, Check, ChevronRight, Calendar, User, Store, FileText, Clock, Layers } from "lucide-react";
import {
  getFormlar, getAktifPersoneller, getMagazalar,
  getForm, getBolum, getSoru, createDegerlendirme,
  getDegerlendirme, updateDegerlendirmeIzlenmeler, finalizeDegerlendirme,
} from "@/lib/firestore";
import { hesaplaPuanFromIzlenmeler, soruPuanHesapla } from "@/lib/skorlama";
import { useAuth } from "@/contexts/AuthContext";
import type { Form, Personel, Bolum, Soru, CevapSecenegi, BolumSnapshot, SoruSnapshot, Magaza } from "@/types";
import { Timestamp } from "firebase/firestore";

/* ─── Types ─────────────────────────────────────────────────────────────────── */
interface BolumDetay extends Bolum { sorular: Soru[] }
interface IzlenmeLocal { id: string; tarih: Date; cevaplar: Record<string, CevapSecenegi | undefined> }

/* ─── Constants ─────────────────────────────────────────────────────────────── */
const AYLAR   = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
const GUN_TR  = ["Paz","Pzt","Sal","Çar","Per","Cum","Cmt"];

/*
 * Gün renk sistemi — sitenin indigo/slate paletine dayalı, haftanın gününe göre
 * Sade, kurumsal ama her gün farklı ton
 */
const DAY_PALETTE = [
  { head: "bg-rose-700",    subHead: "bg-rose-50",    border: "border-rose-200"   }, // Pazar
  { head: "bg-slate-800",   subHead: "bg-slate-50",   border: "border-slate-200"  }, // Pazartesi
  { head: "bg-indigo-700",  subHead: "bg-indigo-50",  border: "border-indigo-200" }, // Salı
  { head: "bg-slate-700",   subHead: "bg-slate-50",   border: "border-slate-200"  }, // Çarşamba
  { head: "bg-blue-700",    subHead: "bg-blue-50",    border: "border-blue-200"   }, // Perşembe
  { head: "bg-violet-700",  subHead: "bg-violet-50",  border: "border-violet-200" }, // Cuma
  { head: "bg-purple-700",  subHead: "bg-purple-50",  border: "border-purple-200" }, // Cumartesi
];
const TODAY_HEAD  = "bg-indigo-600 ring-2 ring-inset ring-amber-400";
const TODAY_SUB   = "bg-indigo-50";

/* Cevap renkleri — site paletine uyumlu */
const CEVAP = {
  evet:  { label: "EVET",  symbol: "E", bg: "bg-emerald-500", hover: "hover:bg-emerald-600", text: "text-white", ghost: "text-emerald-700 bg-emerald-50 hover:bg-emerald-500 hover:text-white" },
  hayir: { label: "HAYIR", symbol: "H", bg: "bg-rose-500",    hover: "hover:bg-rose-600",    text: "text-white", ghost: "text-rose-600   bg-rose-50   hover:bg-rose-500   hover:text-white" },
  muaf:  { label: "MUAF",  symbol: "M", bg: "bg-slate-400",   hover: "hover:bg-slate-500",   text: "text-white", ghost: "text-slate-500  bg-slate-100 hover:bg-slate-400  hover:text-white" },
} as const;

const CEVAP_CYCLE: Record<CevapSecenegi, CevapSecenegi | undefined> = {
  evet: "hayir", hayir: "muaf", muaf: undefined,
};

/* ─── CevapCell bileşeni ─────────────────────────────────────────────────────── */
function CevapCell({ cevap, onSet }: { cevap: CevapSecenegi | undefined; onSet(c: CevapSecenegi | undefined): void }) {
  if (cevap) {
    const isEvet = cevap === "evet";
    const isHayir = cevap === "hayir";
    const bg = isEvet ? "bg-[#10b981]" : isHayir ? "bg-[#ef4444]" : "bg-[#94a3b8]";
    const hoverBg = isEvet ? "hover:bg-emerald-600" : isHayir ? "hover:bg-rose-600" : "hover:bg-slate-500";
    const label = isEvet ? "EVET" : isHayir ? "HAYIR" : "MUAF";

    return (
      <button
        onClick={() => onSet(CEVAP_CYCLE[cevap])}
        className={`w-full h-[44px] flex items-center justify-center rounded-[4px] text-white text-[11px] font-bold tracking-[0.05em] uppercase transition-colors ${bg} ${hoverBg}`}>
        {label}
      </button>
    );
  }

  return (
    <div className="w-full h-[44px] relative group/cell">
      <div className="absolute inset-0 flex border border-dashed border-slate-200 bg-transparent rounded-[4px] group-hover/cell:opacity-0 transition-opacity"></div>
      <div className="absolute inset-0 flex opacity-0 group-hover/cell:opacity-100 transition-opacity">
        <button onClick={() => onSet("evet")} className="flex-1 flex items-center justify-center bg-emerald-50 hover:bg-emerald-500 hover:text-white text-emerald-600 font-bold text-[10px] rounded-l-[4px]">E</button>
        <button onClick={() => onSet("hayir")} className="flex-1 flex items-center justify-center bg-rose-50 hover:bg-rose-500 hover:text-white text-rose-600 font-bold text-[10px]">H</button>
        <button onClick={() => onSet("muaf")} className="flex-1 flex items-center justify-center bg-slate-50 hover:bg-slate-500 hover:text-white text-slate-600 font-bold text-[10px] rounded-r-[4px]">M</button>
      </div>
    </div>
  );
}

/* ─── SaatInput — tam manuel metin girişi ───────────────────────────────────── */
function SaatInput({ izId, tarih, onCommit }: { izId: string; tarih: Date; onCommit(id: string, saat: string): void }) {
  const initial = `${String(tarih.getHours()).padStart(2,"0")}:${String(tarih.getMinutes()).padStart(2,"0")}`;
  const [val, setVal] = useState(initial);

  function normalize(raw: string) {
    const clean = raw.replace(/[^\d:]/g, "");
    const parts  = clean.includes(":") ? clean.split(":") : [clean.slice(0,2), clean.slice(2,4)];
    const h = Math.min(23, Math.max(0, parseInt(parts[0] || "0") || 0));
    const m = Math.min(59, Math.max(0, parseInt(parts[1] || "0") || 0));
    return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      placeholder="09:00"
      value={val}
      onChange={e => setVal(e.target.value)}
      onBlur={() => {
        const normalized = normalize(val);
        setVal(normalized);
        onCommit(izId, normalized);
      }}
      onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
      className="w-[30px] text-[10px] font-bold text-slate-500 bg-transparent border-none outline-none p-0 text-center focus:ring-0 focus:text-indigo-600 transition-colors"
    />
  );
}

/* ─── Main ───────────────────────────────────────────────────────────────────── */
function YeniDegerlendirmeIcerik() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, kullanici } = useAuth();
  const now = new Date();

  const paramMagazaId = searchParams.get("magazaId") || searchParams.get("magazald") || searchParams.get("magazaıd") || searchParams.get("magazaid") || "";
  const paramPersonelId = searchParams.get("personelId") || searchParams.get("personelld") || searchParams.get("personelıd") || searchParams.get("personelid") || "";
  const paramFormId = searchParams.get("formId") || searchParams.get("formld") || searchParams.get("formıd") || searchParams.get("formid") || "";
  const devamId = searchParams.get("devam") || "";

  /* Step 1 */
  const [adim, setAdim]           = useState<"secim" | "tablo">("secim");
  const [formlar, setFormlar]     = useState<Form[]>([]);
  const [personeller, setPereler] = useState<Personel[]>([]);
  const [magazalar, setMagazalar] = useState<Magaza[]>([]);
  const [seciliFormId, setFormId] = useState("");
  const [seciliPerId,  setPerId]  = useState("");
  const [seciliMagId,  setMagId]  = useState("");
  const [seciliAy,     setAy]     = useState(now.getMonth());
  const [seciliYil,    setYil]    = useState(now.getFullYear());
  const [yukleniyor, setYukleniyor] = useState(true);
  const [baslaniyor, setBaslaniyor] = useState(false);

  /* Step 2 */
  const [seciliForm,   setForm]       = useState<Form | null>(null);
  const [bolumDetaylar, setBolumlar]  = useState<BolumDetay[]>([]);
  const [izlenmeler,   setIzlenmeler] = useState<IzlenmeLocal[]>([]);
  const [onaylaId,     setOnaylaId]   = useState<string | null>(null); // silme onay
  const [hoverCol,     setHoverCol]   = useState<string | null>(null);
  const [kaydediliyor, setKaydediliyor] = useState(false);

  // Firestore'daki açık rapor ID'si (kameraman akışında set edilir)
  const [degId, setDegId] = useState<string | null>(null);
  // Otomatik kayıt debounce timer ref
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user) return;

    async function yukle() {
      setYukleniyor(true);
      try {
        const [f, p, m] = await Promise.all([getFormlar(), getAktifPersoneller(), getMagazalar()]);
        setFormlar(f);
        setPereler(p);
        setMagazalar(m);

        if (devamId) {
          /* ── DEVAM MODU: mevcut açık raporu yükle ── */
          const deg = await getDegerlendirme(devamId);
          if (!deg || deg.durum === "kapali") {
            router.replace(kullanici?.rol === "kameraman" ? "/panel/kameraman" : "/degerlendirmeler");
            return;
          }
          setMagId(deg.magazaId);
          setPerId(deg.personelId);
          setFormId(deg.formId);
          setAy(deg.ay);
          setYil(deg.yil);

          const form = f.find(x => x.id === deg.formId) || await getForm(deg.formId);
          if (!form) return;
          setForm(form);

          const detaylar: BolumDetay[] = [];
          for (const bid of form.bolumIdleri) {
            const b = await getBolum(bid); if (!b) continue;
            const sorular: Soru[] = [];
            for (const sid of b.soruIdleri) { const s = await getSoru(sid); if (s) sorular.push(s); }
            detaylar.push({ ...b, sorular });
          }
          setBolumlar(detaylar);

          // Firestore'dan gelen izlenmeleri local state'e çevir
          const localIzlenmeler: IzlenmeLocal[] = (deg.izlenmeler || []).map(iz => ({
            id: iz.id,
            tarih: iz.tarih.toDate(),
            cevaplar: iz.cevaplar as Record<string, CevapSecenegi | undefined>,
          }));
          setIzlenmeler(localIzlenmeler);
          setDegId(devamId);
          setAdim("tablo");

        } else if (paramMagazaId && paramPersonelId && paramFormId) {
          /* ── YENİ RAPOR (panel'den params ile gelindiğinde) ── */
          setMagId(paramMagazaId);
          setPerId(paramPersonelId);
          setFormId(paramFormId);
          setBaslaniyor(true);

          const form = f.find(x => x.id === paramFormId) || await getForm(paramFormId);
          if (!form) { setBaslaniyor(false); return; }
          setForm(form);

          const detaylar: BolumDetay[] = [];
          for (const bid of form.bolumIdleri) {
            const b = await getBolum(bid); if (!b) continue;
            const sorular: Soru[] = [];
            for (const sid of b.soruIdleri) { const s = await getSoru(sid); if (s) sorular.push(s); }
            detaylar.push({ ...b, sorular });
          }
          setBolumlar(detaylar);

          // Firestore'da açık raporu hemen oluştur
          const bolumSnap: Record<string, BolumSnapshot> = {};
          detaylar.forEach(b => { bolumSnap[b.id] = { ad: b.ad, soruIdleri: b.soruIdleri }; });
          const soruSnapObj: Record<string, SoruSnapshot> = {};
          detaylar.flatMap(bd => bd.sorular).forEach(q => {
            soruSnapObj[q.id] = { metin: q.metin, puan: q.puan, hedefYuzde: q.hedefYuzde };
          });

          const personelObj = p.find(x => x.id === paramPersonelId);
          const magazaObj = m.find(x => x.id === paramMagazaId);

          const newId = await createDegerlendirme({
            formId: form.id, formAd: form.ad,
            personelId: paramPersonelId, personelAd: personelObj?.ad ?? "",
            magazaId: paramMagazaId, magazaAd: magazaObj?.ad ?? "",
            kameramanId: user!.uid, kameramanAd: kullanici?.displayName ?? user!.displayName ?? "",
            ay: now.getMonth(), yil: now.getFullYear(),
            puanli: form.puanli, skorlamaSistemi: form.skorlamaSistemi,
            izlenmeler: [], toplamPuan: null, maxPuan: null,
            bolumSnapshot: bolumSnap, soruSnapshot: soruSnapObj,
            durum: "acik",
          });

          setIzlenmeler([]);
          setDegId(newId);
          setBaslaniyor(false);
          setAdim("tablo");

        } else {
          /* ── Params yok, secim adımına düş ── */
          if (kullanici?.rol === "kameraman") {
            router.replace("/panel/kameraman");
          }
          // Admin için secim adımı gösterilmeye devam eder
        }
      } catch (err) {
        console.error("Değerlendirme yükleme hatası:", err);
      } finally {
        setYukleniyor(false);
      }
    }

    yukle();
  }, [devamId, paramMagazaId, paramPersonelId, paramFormId, user, kullanici, router]);

  const isKameraman = kullanici?.rol === "kameraman";
  const authMagazaIdleri = kullanici?.magazaIdleri || [];
  
  const gosterilecekMagazalar = useMemo(() => {
    if (!isKameraman) return magazalar;
    return magazalar.filter(m => authMagazaIdleri.includes(m.id));
  }, [magazalar, isKameraman, authMagazaIdleri]);

  const gosterilecekPersoneller = useMemo(() => {
    if (!seciliMagId) return [];
    return personeller.filter(p => p.magazaIdleri?.includes(seciliMagId));
  }, [personeller, seciliMagId]);

  async function handleBasla(e: React.FormEvent) {
    e.preventDefault();
    if (!seciliFormId || !seciliPerId || !seciliMagId) return;
    setBaslaniyor(true);
    const form = await getForm(seciliFormId);
    if (!form) { setBaslaniyor(false); return; }
    setForm(form);
    const detaylar: BolumDetay[] = [];
    for (const bid of form.bolumIdleri) {
      const b = await getBolum(bid); if (!b) continue;
      const sorular: Soru[] = [];
      for (const sid of b.soruIdleri) { const s = await getSoru(sid); if (s) sorular.push(s); }
      detaylar.push({ ...b, sorular });
    }
    setBolumlar(detaylar);

    setIzlenmeler([]);
    setAdim("tablo");
    setBaslaniyor(false);
  }

  /* Ay/gün */
  const gunSayisi   = useMemo(() => new Date(seciliYil, seciliAy + 1, 0).getDate(), [seciliAy, seciliYil]);
  const ayinGunleri = useMemo(() => Array.from({ length: gunSayisi }, (_, i) => i + 1), [gunSayisi]);

  const gunlukMap = useMemo(() => {
    const map = new Map<number, IzlenmeLocal[]>();
    for (let g = 1; g <= gunSayisi; g++) map.set(g, []);
    for (const iz of izlenmeler)
      if (iz.tarih.getMonth() === seciliAy && iz.tarih.getFullYear() === seciliYil)
        map.get(iz.tarih.getDate())?.push(iz);
    for (const [g, list] of map.entries())
      map.set(g, [...list].sort((a, b) => a.tarih.getTime() - b.tarih.getTime()));
    return map;
  }, [izlenmeler, seciliAy, seciliYil, gunSayisi]);

  function izlenmeEkle(gun: number) {
    const t = new Date(seciliYil, seciliAy, gun, now.getHours(), now.getMinutes());
    setIzlenmeler(p => [...p, { id: crypto.randomUUID(), tarih: t, cevaplar: {} }]);
  }
  function izlenmeSil(id: string) { setIzlenmeler(p => p.filter(i => i.id !== id)); }
  const setCevap = useCallback((izId: string, soruId: string, cevap: CevapSecenegi | undefined) => {
    setIzlenmeler(p => p.map(i => i.id !== izId ? i : { ...i, cevaplar: { ...i.cevaplar, [soruId]: cevap } }));
  }, []);
  function setSaat(izId: string, v: string) {
    const [h, m] = v.split(":").map(Number);
    setIzlenmeler(p => p.map(i => {
      if (i.id !== izId) return i;
      const t = new Date(i.tarih); t.setHours(h, m); return { ...i, tarih: t };
    }));
  }

  /* Skor */
  const soruSnap = useMemo<Record<string, SoruSnapshot>>(() => {
    const s: Record<string, SoruSnapshot> = {};
    bolumDetaylar.flatMap(b => b.sorular).forEach(q => {
      s[q.id] = { metin: q.metin, puan: q.puan, hedefYuzde: q.hedefYuzde };
    });
    return s;
  }, [bolumDetaylar]);

  /* ── Otomatik kayıt: izlenmeler her değiştiğinde 800ms debounce ile Firestore'a yaz ── */
  useEffect(() => {
    if (!degId || adim !== "tablo") return;

    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(async () => {
      const izlenmelerFS = izlenmeler.map(i => ({
        id: i.id,
        tarih: Timestamp.fromDate(i.tarih),
        cevaplar: Object.fromEntries(
          Object.entries(i.cevaplar).filter(([, v]) => v)
        ) as Record<string, CevapSecenegi>,
      }));
      let tp: number | null = null, mp: number | null = null;
      if (seciliForm?.puanli && Object.keys(soruSnap).length > 0) {
        const h = hesaplaPuanFromIzlenmeler(
          izlenmelerFS.map(i => ({ cevaplar: i.cevaplar })),
          soruSnap, seciliForm.skorlamaSistemi ?? "oran"
        );
        tp = h.toplamPuan; mp = h.maxPuan;
      }
      await updateDegerlendirmeIzlenmeler(degId, izlenmelerFS, tp, mp).catch(console.error);
    }, 800);
  }, [izlenmeler, degId, adim, seciliForm, soruSnap]);

  const puan = useMemo(() => {
    if (!seciliForm?.puanli) return null;
    return hesaplaPuanFromIzlenmeler(
      izlenmeler.map(i => ({ cevaplar: i.cevaplar as Record<string, CevapSecenegi> })),
      soruSnap, seciliForm.skorlamaSistemi ?? "oran"
    );
  }, [izlenmeler, soruSnap, seciliForm]);

  const sistem = seciliForm?.skorlamaSistemi ?? "oran";

  /* Kaydet */
  async function handleKaydet() {
    if (!seciliForm || !user) return;
    setKaydediliyor(true);

    // Bekleyen otomatik kayıt varsa iptal et
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);

    const izlenmelerFS = izlenmeler
      .filter(i => Object.values(i.cevaplar).some(v => v !== undefined))
      .map(i => ({
        id: i.id, tarih: Timestamp.fromDate(i.tarih),
        cevaplar: Object.fromEntries(Object.entries(i.cevaplar).filter(([, v]) => v)) as Record<string, CevapSecenegi>,
      }));

    let toplamPuan: number | null = null, maxPuan: number | null = null;
    if (seciliForm.puanli) {
      const h = hesaplaPuanFromIzlenmeler(
        izlenmelerFS.map(i => ({ cevaplar: i.cevaplar })),
        soruSnap, seciliForm.skorlamaSistemi ?? "oran"
      );
      toplamPuan = h.toplamPuan; maxPuan = h.maxPuan;
    }

    if (degId) {
      // Kameraman akışı: açık raporu finalize et (durum → 'kapali')
      await finalizeDegerlendirme(degId, izlenmelerFS, toplamPuan, maxPuan);
      router.push(`/degerlendirmeler/${degId}`);
    } else {
      // Admin / manuel akış: yeni doc oluştur
      const bolumSnapshot: Record<string, BolumSnapshot> = {};
      bolumDetaylar.forEach(b => { bolumSnapshot[b.id] = { ad: b.ad, soruIdleri: b.soruIdleri }; });
      const personelObj = personeller.find(p => p.id === seciliPerId)!;
      const magazaObj   = magazalar.find(m => m.id === seciliMagId);
      const id = await createDegerlendirme({
        formId: seciliForm.id, formAd: seciliForm.ad,
        personelId: seciliPerId, personelAd: personelObj.ad,
        magazaId: seciliMagId, magazaAd: magazaObj?.ad ?? "",
        kameramanId: user.uid, kameramanAd: kullanici?.displayName ?? user.displayName ?? "",
        ay: seciliAy, yil: seciliYil,
        puanli: seciliForm.puanli, skorlamaSistemi: seciliForm.skorlamaSistemi,
        izlenmeler: izlenmelerFS, toplamPuan, maxPuan,
        bolumSnapshot, soruSnapshot: soruSnap,
        durum: "kapali",
      });
      router.push(`/degerlendirmeler/${id}`);
    }
  }

  /* ─── Loading ─────────────────────────────────────────────────────────────── */
  if (yukleniyor) return (
    <div className="flex justify-center items-center h-48">
      <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const personel = personeller.find(p => p.id === seciliPerId);
  const magaza   = magazalar.find(m => m.id === seciliMagId);

  /* ════════ ADIM 1 — SEÇİM ════════════════════════════════════════════════════ */
  if (adim === "secim") return (
    <div className="max-w-lg mx-auto py-4">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-slate-500 mb-6">
        <Link href="/degerlendirmeler" className="hover:text-slate-800 transition-colors">
          Değerlendirmeler
        </Link>
        <ChevronRight size={14} className="text-slate-300" />
        <span className="text-slate-800 font-medium">Yeni</span>
      </nav>

      {/* Kart */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

        {/* Header */}
        <div className="bg-indigo-600 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
              <FileText size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white leading-tight">Yeni Aylık Değerlendirme</h1>
              <p className="text-xs text-indigo-200 mt-0.5">Formu, personeli ve dönemi seçin</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleBasla} className="p-6 space-y-5">

          {/* Form seçimi */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <FileText size={11} /> Form
            </label>
            <select value={seciliFormId} onChange={e => setFormId(e.target.value)} required
              disabled={!!paramFormId}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 text-slate-800
                focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition-all disabled:opacity-50">
              <option value="">Seçin...</option>
              {formlar.map(f => <option key={f.id} value={f.id}>{f.ad}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Store size={11} /> Mağaza
              </label>
              <select value={seciliMagId} onChange={e => { setMagId(e.target.value); setPerId(""); }} required
                disabled={!!paramMagazaId}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 text-slate-800
                  focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition-all disabled:opacity-50">
                <option value="">Seçin...</option>
                {gosterilecekMagazalar.map(m => <option key={m.id} value={m.id}>{m.ad}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <User size={11} /> Personel
              </label>
              <select value={seciliPerId} onChange={e => setPerId(e.target.value)} required disabled={!seciliMagId || !!paramPersonelId}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 text-slate-800
                  focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition-all disabled:opacity-50">
                <option value="">{seciliMagId ? "Seçin..." : "Önce mağaza seçin"}</option>
                {gosterilecekPersoneller.map(p => <option key={p.id} value={p.id}>{p.ad}</option>)}
              </select>
            </div>
          </div>



          {/* Aksiyon butonları */}
          <div className="flex gap-2 pt-1">
            <button type="submit"
              disabled={baslaniyor || !seciliFormId || !seciliPerId || !seciliMagId}
              className="flex-1 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-xl
                hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none
                shadow-sm shadow-indigo-100">
              {baslaniyor ? "Yükleniyor..." : "Değerlendirmeyi Başlat →"}
            </button>
            <Link href="/degerlendirmeler"
              className="px-4 py-2.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl
                hover:bg-slate-50 transition-colors">
              İptal
            </Link>
          </div>
        </form>
      </div>
    </div>
  );

  /* ════════ ADIM 2 — MATRİS ════════════════════════════════════════════════════ */
  const puanYuzdesi = puan && puan.maxPuan > 0 ? Math.round((puan.toplamPuan / puan.maxPuan) * 100) : 0;
  const puanColor   = puanYuzdesi >= 80
    ? "text-emerald-600 bg-emerald-50 border-emerald-200"
    : puanYuzdesi >= 60
    ? "text-amber-600 bg-amber-50 border-amber-200"
    : "text-rose-600 bg-rose-50 border-rose-200";

  return (
    <div className="flex flex-col h-screen">

      {/* ── Üst bilgi ve geri butonu ───────────────────────────────────────── */}
      <div className="shrink-0 bg-slate-900 text-white px-8 py-4 flex items-center justify-between z-10 shadow-sm">
        <div className="flex items-center gap-6 min-w-0">
          <h1 className="text-lg font-bold uppercase tracking-tight truncate">
            {personel?.ad} <span className="text-slate-400 font-normal text-sm ml-3">{magaza?.ad} / {bolumDetaylar.map(b => b.ad).join(", ")}</span>
          </h1>
          <div className="h-8 w-px bg-white/20 shrink-0"></div>
          {puan && puan.maxPuan > 0 && (
            <div className="flex gap-6 items-center shrink-0">
              <div className="text-[11px] uppercase text-slate-400 font-bold tracking-widest">Genel Başarı</div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-emerald-400">{puan.toplamPuan}</span>
                <span className="text-sm text-emerald-400/60">/ {puan.maxPuan} Puan</span>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-white transition-colors">
            <ChevronRight size={14} className="rotate-180" /> Geri
          </button>
        </div>
      </div>

      {/* ── Matris tablosu ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto border-t border-slate-200 bg-white shadow-sm">
        <table className="border-collapse" style={{ tableLayout: "fixed" }}>

          {/* Thead — sticky */}
          <thead className="sticky top-0 z-30">

            {/* Satır 1 — kimlik + gün başlıkları */}
            <tr>
              <th rowSpan={2}
                className="sticky left-0 z-40 bg-slate-50 border-b border-r border-slate-200 p-4 text-left shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] align-bottom"
                style={{ width: 320, minWidth: 320, maxWidth: 320 }}>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Denetim Soruları</span>
              </th>

              {ayinGunleri.map(gun => {
                const d       = new Date(seciliYil, seciliAy, gun);
                const obs     = gunlukMap.get(gun) ?? [];
                return (
                  <th key={gun} colSpan={Math.max(1, obs.length)}
                    className="border-b border-slate-200 p-0 text-center"
                    style={{ minWidth: Math.max(1, obs.length) * 85 }}>
                    <div className="py-2.5 flex flex-col items-center justify-center border-l border-slate-200/50 bg-slate-50/50">
                      <span className="text-[11px] font-bold text-slate-700">{String(gun).padStart(2,"0")}</span>
                      <span className="text-[9px] text-slate-400 font-medium uppercase">{GUN_TR[d.getDay()]}</span>
                    </div>
                  </th>
                );
              })}

              {/* Sağ Sabit Sütun Başlığı */}
              <th rowSpan={2}
                className="sticky right-0 z-40 bg-slate-50 border-b border-l border-slate-200 p-3 shadow-[-4px_0_10px_-2px_rgba(0,0,0,0.05)] text-center align-middle"
                style={{ width: 240, minWidth: 240, maxWidth: 240 }}>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block text-center">İSTATİSTİK ÖZET</span>
              </th>
            </tr>

            {/* Satır 2 — saat + ekle */}
            <tr>
              {ayinGunleri.flatMap(gun => {
                const obs     = gunlukMap.get(gun) ?? [];

                if (obs.length === 0) {
                  return [
                    <th key={`empty-${gun}`}
                      className="bg-slate-100/50 py-2 border-t border-l border-slate-200/50 px-2 transition-colors"
                      style={{ width: 85, minWidth: 85, borderBottom: "1px solid #e2e8f0" }}>
                      <div className="flex items-center justify-center w-full">
                        <button onClick={() => izlenmeEkle(gun)} 
                          className="text-blue-500 hover:text-blue-700 transition-colors"
                          title="Bu güne saat ekle">
                          <Plus size={16} strokeWidth={2.5} />
                        </button>
                      </div>
                    </th>
                  ];
                }

                const cells = obs.map(iz => (
                  <th key={iz.id}
                    onMouseEnter={() => setHoverCol(iz.id)}
                    onMouseLeave={() => setHoverCol(null)}
                    className="bg-slate-100/50 py-2 border-t border-l border-slate-200/50 px-1 transition-colors"
                    style={{ width: 85, minWidth: 85, borderBottom: "1px solid #e2e8f0" }}>
                    <div className="flex items-center justify-center gap-1.5 w-full">
                      <SaatInput izId={iz.id} tarih={iz.tarih} onCommit={setSaat} />
                      <button onClick={() => setOnaylaId(iz.id)} 
                        className="text-rose-500 hover:text-rose-700 transition-colors shrink-0"
                        title="Bu Saati Sil">
                        <Trash2 size={13} strokeWidth={2.5} />
                      </button>
                      <button onClick={() => izlenmeEkle(gun)} 
                        className="text-blue-500 hover:text-blue-700 transition-colors shrink-0"
                        title="Yeni Saat Ekle">
                        <Plus size={14} strokeWidth={2.5} />
                      </button>
                    </div>
                  </th>
                ));
                
                return cells;
              })}
            </tr>
          </thead>

          {/* Tbody */}
          <tbody>
            {bolumDetaylar.map(bolum => (
              <React.Fragment key={bolum.id}>

                {/* Bölüm başlık satırı kaldırıldı */}

                {/* Soru satırları */}
                {bolum.sorular.map((soru, qIdx) => {
                  const zebra   = qIdx % 2 === 0;
                  const rowBg   = zebra ? "bg-white" : "bg-slate-50/40";
                  const stickyB = zebra ? "bg-white" : "bg-slate-50";

                  const sonuc = soruPuanHesapla(
                    soru.id,
                    soruSnap[soru.id],
                    izlenmeler.map(i => ({ cevaplar: i.cevaplar as Record<string, CevapSecenegi> })),
                    sistem
                  );

                  return (
                    <tr key={soru.id} className="group">

                      {/* Soru sütunu sticky */}
                      <td className="sticky left-0 z-10 p-4 border-r border-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.03)] bg-white align-middle"
                        style={{ width: 420, minWidth: 420, maxWidth: 420 }}>
                        <div className="flex gap-4">
                          <span className="text-slate-300 font-bold min-w-[20px]">{qIdx + 1}</span>
                          <p className="text-sm font-medium text-slate-700 leading-snug">{soru.metin}</p>
                        </div>
                      </td>

                      {/* Cevap hücreleri */}
                      {ayinGunleri.flatMap(gun => {
                        const obs = gunlukMap.get(gun) ?? [];
                        
                        if (obs.length === 0) {
                          return [
                            <td key={`empty-${gun}`}
                              className={`border-l border-b border-slate-100 p-2 align-middle bg-white group-hover:bg-slate-50 transition-colors`}
                              style={{ width: 85, minWidth: 85, height: 60 }} />
                          ];
                        }

                        const cells = obs.map(iz => (
                          <td key={iz.id} 
                            onMouseEnter={() => setHoverCol(iz.id)}
                            onMouseLeave={() => setHoverCol(null)}
                            className={`border-l border-b border-slate-100 p-2 align-middle transition-colors bg-white group-hover:bg-slate-50 ${hoverCol === iz.id ? "bg-slate-50" : ""}`}
                            style={{ width: 85, minWidth: 85, height: 60 }}>
                            <CevapCell
                              cevap={iz.cevaplar[soru.id]}
                              onSet={c => setCevap(iz.id, soru.id, c)}
                            />
                          </td>
                        ));
                        return cells;
                      })}

                      {/* Sağ Sabit Sütun Gövdesi */}
                      <td className="sticky right-0 z-20 p-3 bg-blue-50/80 shadow-[-4px_0_10px_-2px_rgba(0,0,0,0.05)] border-l border-b border-blue-100 backdrop-blur-sm"
                        style={{ width: 240, minWidth: 240, maxWidth: 240 }}>
                        {sonuc && sonuc.toplamIzlenme > 0 ? (
                          <div className="flex flex-col gap-2 w-full animate-in fade-in duration-300">
                            {/* Top Row Layout */}
                            <div className="flex items-center justify-between w-full gap-2">
                              <div className="flex items-center gap-[6px]">
                                <span className="text-[9px] font-bold text-blue-500 whitespace-nowrap">{sonuc.toplamIzlenme} İZL</span>
                                <div className="flex gap-[2px] items-center">
                                  <div className="flex items-center justify-center w-[20px] h-[16px] rounded-[3px] text-[9px] font-bold text-white bg-emerald-500">{sonuc.evetSayisi}E</div>
                                  <div className="flex items-center justify-center w-[20px] h-[16px] rounded-[3px] text-[9px] font-bold text-white bg-rose-500">{sonuc.hayirSayisi}H</div>
                                  <div className="flex items-center justify-center w-[20px] h-[16px] rounded-[3px] text-[9px] font-bold text-white bg-slate-400">{sonuc.muafSayisi}M</div>
                                </div>
                                {soruSnap[soru.id]?.hedefYuzde !== undefined && (
                                  <div className="inline-flex items-center justify-center px-1 h-[16px] rounded-[3px] text-[9px] font-bold bg-white border border-emerald-500 text-emerald-800 whitespace-nowrap">
                                    HEDEF: %{soruSnap[soru.id].hedefYuzde}
                                  </div>
                                )}
                              </div>
                              {seciliForm?.puanli && (
                                <span className="px-1 py-[1px] bg-blue-100 text-blue-900 rounded-[2px] text-[9px] font-bold border border-blue-200 whitespace-nowrap">
                                  {sonuc.kazanilanPuan}/{soru.puan}P
                                </span>
                              )}
                            </div>
                            {/* Bottom Row Layout */}
                            <div className="flex items-center gap-2 w-full">
                              <div className="flex-1 h-[6px] bg-slate-200/50 rounded-full overflow-hidden">
                                <div className={`h-full ${sonuc.oran === 100 ? 'bg-emerald-500' : sonuc.oran > 0 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${sonuc.oran}%` }}></div>
                              </div>
                              <span className={`text-[11px] font-bold min-w-[32px] text-right ${sonuc.oran === 100 ? 'text-emerald-600' : sonuc.oran > 0 ? 'text-amber-600' : 'text-rose-600'}`}>
                                %{sonuc.oran}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center text-[10px] font-medium text-blue-300/50">-</div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Alt kaydet çubuğu ──────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center justify-between pt-3">
        <div className="flex items-center gap-4">
          {puan && puan.maxPuan > 0 ? (
            <div>
              <p className="text-xs text-slate-400 font-medium">Genel Başarı</p>
              <p className={`text-xl font-bold leading-tight ${puanYuzdesi >= 80 ? "text-emerald-600" : puanYuzdesi >= 60 ? "text-amber-600" : "text-rose-600"}`}>
                {puan.toplamPuan}
                <span className="text-sm font-normal text-slate-400 ml-1">/ {puan.maxPuan} Puan</span>
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-400">{izlenmeler.length} izlenme</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => router.back()}
            className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
            ← Geri
          </button>
          <button onClick={handleKaydet} disabled={kaydediliyor}
            className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-xl
              hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-50
              shadow-sm shadow-indigo-100">
            {kaydediliyor ? "Kaydediliyor..." : "Değerlendirmeyi Kaydet"}
          </button>
        </div>
      </div>

      {/* ── Silme Onay Modalı ──────────────────────────────────────────────── */}
      {onaylaId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 text-center">
              <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={24} strokeWidth={2} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Sütunu Sil</h3>
              <p className="text-sm text-slate-500">
                Bu saate ait tüm cevaplar kalıcı olarak silinecektir. Onaylıyor musunuz?
              </p>
            </div>
            <div className="bg-slate-50 px-5 py-4 flex gap-3">
              <button onClick={() => setOnaylaId(null)}
                className="flex-1 px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                İptal
              </button>
              <button onClick={() => { izlenmeSil(onaylaId); setOnaylaId(null); }}
                className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-rose-600 rounded-xl hover:bg-rose-700 transition-colors shadow-sm shadow-rose-200">
                Evet, Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function YeniDegerlendirmePage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center py-16">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <YeniDegerlendirmeIcerik />
    </Suspense>
  );
}
