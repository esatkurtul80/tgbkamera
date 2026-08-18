import { puansizCevapDoluMu } from "@/lib/puansiz";
import { fontCss, type RaporTasarimAyarlari } from "@/lib/raporTasarim";
import type {
  CevapSecenegi,
  Degerlendirme,
  PuansizCevapDegeri,
  SoruTipi,
} from "@/types";

/* ─── A4 sayfa geometrisi (96dpi CSS px) ──────────────────────────────────── */
export const PDF_SAYFA_GENISLIK = 794;
export const PDF_SAYFA_YUKSEKLIK = 1123;
const KENAR_BOSLUK = 48;
const UST_BOSLUK = 40;
const ALT_BOSLUK = 64; // altbilgi şeridi dahil
export const PDF_ICERIK_GENISLIK = PDF_SAYFA_GENISLIK - KENAR_BOSLUK * 2;
export const PDF_ICERIK_KAPASITE = PDF_SAYFA_YUKSEKLIK - UST_BOSLUK - ALT_BOSLUK;

/* ─── Tasarım paleti (bordo/krem) ─────────────────────────────────────────── */
export const RAPOR_RENK = {
  kagit: "#fffbfa",
  ink: "#2a1a1c",
  sub: "#55414a",
  faint: "#a08a8e",
  line: "#efe2e0",
  accent: "#6d1f31",
  accentSoft: "#f5e4e7",
  onAccent: "#fbf3f4",
  accentMuted: "#d9adb6",
  metaBg: "#faf3f2",
  qBg: "#f9f1f0",
  qBorder: "#f0e0de",
};

export const RAPOR_MONO = "var(--font-splinemono), monospace";
const MONO = RAPOR_MONO;

/** Sayfalamada bölünmez birim: rapor başlığı, bölüm başlığı, soru kartı veya fotoğraf satırı. */
export interface PdfBlok {
  tur: "baslik" | "bolum" | "soru" | "foto";
  el: React.ReactNode;
}

/* ─── Cevap gösterimleri ──────────────────────────────────────────────────── */
const EHM_STIL: Record<CevapSecenegi, { bg: string; renk: string }> = {
  evet: { bg: "#047857", renk: "#ffffff" },
  hayir: { bg: "#be123c", renk: "#ffffff" },
  muaf: { bg: "#e7e5e4", renk: "#57534e" },
};
const EHM_ETIKET: Record<CevapSecenegi, string> = { evet: "EVET", hayir: "HAYIR", muaf: "MUAF" };

function CevapsizChip() {
  return (
    <span
      className="text-[9.5px] font-semibold rounded-full px-2.5 py-1"
      style={{ color: RAPOR_RENK.faint, border: `1px solid ${RAPOR_RENK.line}`, fontFamily: MONO }}
    >
      CEVAPSIZ
    </span>
  );
}

/** Soru kartının sağ üstünde gösterilen kısa cevaplar (evet/hayır/muaf, sayı, tarih, saat). */
function KisaCevap({ tip, cevap }: { tip: SoruTipi; cevap: PuansizCevapDegeri | undefined }) {
  if (tip === "evet_hayir_muaf") {
    if (!cevap?.evetHayirMuaf) return <CevapsizChip />;
    const stil = EHM_STIL[cevap.evetHayirMuaf];
    return (
      <span
        className="text-[10px] font-bold rounded-full px-3 py-1"
        style={{ background: stil.bg, color: stil.renk, letterSpacing: "0.08em", fontFamily: MONO }}
      >
        {EHM_ETIKET[cevap.evetHayirMuaf]}
      </span>
    );
  }
  const deger =
    tip === "sayi" ? (cevap?.sayi !== undefined ? String(cevap.sayi) : undefined)
    : tip === "tarih" ? cevap?.tarih
    : tip === "saat" ? cevap?.saat
    : undefined;
  if (deger === undefined) return <CevapsizChip />;
  return (
    <span className="text-[13px] font-bold" style={{ color: RAPOR_RENK.accent, fontFamily: MONO }}>
      {deger}
    </span>
  );
}

/* ─── Rapor blokları ──────────────────────────────────────────────────────── */

export function RaporMetaAlan({ etiket, deger, kunyeFont, boyut = 13 }: {
  etiket: string; deger: string; kunyeFont: string; boyut?: number;
}) {
  return (
    <div>
      <p
        className="text-[9px] font-semibold uppercase mb-1"
        style={{ color: RAPOR_RENK.faint, letterSpacing: "0.12em", fontFamily: MONO }}
      >
        {etiket}
      </p>
      <p className="font-semibold leading-snug" style={{ color: RAPOR_RENK.ink, fontFamily: kunyeFont, fontSize: boyut }}>
        {deger || "—"}
      </p>
    </div>
  );
}

/** Bordo üst bant: logo + firma adı + rapor türü rozeti. Ekran önizlemeleri de kullanır. */
export function RaporBant({ tasarim, rozet }: { tasarim: RaporTasarimAyarlari; rozet: string }) {
  return (
    <div
      className="flex items-center justify-between gap-4 rounded-[10px] px-6 py-4"
      style={{ background: RAPOR_RENK.accent }}
    >
      <div className="flex items-center gap-3.5 min-w-0">
        {tasarim.logoUrl && (
          <div className="w-[46px] h-[46px] rounded-lg bg-white shrink-0 flex items-center justify-center overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={tasarim.logoUrl} alt="" className="max-w-full max-h-full object-contain p-1" />
          </div>
        )}
        <div className="flex items-baseline gap-2.5 flex-wrap min-w-0">
          <b
            className="font-extrabold text-white"
            style={{
              letterSpacing: tasarim.harfAraliklar.firma,
              fontFamily: fontCss(tasarim.fontlar.firma),
              fontSize: tasarim.boyutlar.firma,
            }}
          >
            TUĞBA KURUYEMİŞ
          </b>
          <span className="w-px h-3.5 self-center" style={{ background: RAPOR_RENK.accentMuted, opacity: 0.5 }} />
          <span
            className="font-semibold"
            style={{
              color: RAPOR_RENK.accentMuted,
              letterSpacing: tasarim.harfAraliklar.altBaslik,
              fontFamily: fontCss(tasarim.fontlar.altBaslik),
              fontSize: tasarim.boyutlar.altBaslik,
            }}
          >
            DEĞERLENDİRME RAPORU
          </span>
        </div>
      </div>
      <span
        className="text-[10px] font-semibold rounded-full px-3 py-1.5 whitespace-nowrap shrink-0"
        style={{
          color: RAPOR_RENK.onAccent,
          background: "rgba(251,243,244,.12)",
          border: "1px solid rgba(251,243,244,.4)",
          letterSpacing: "0.1em",
          fontFamily: MONO,
        }}
      >
        {rozet}
      </span>
    </div>
  );
}

function RaporBaslik({ d, tasarim }: { d: Degerlendirme; tasarim: RaporTasarimAyarlari }) {
  const isYorumluPuanli = d.puanli === true && d.puanGirisTipi === "manuel";
  const izlenme = d.izlenmeTarihi?.toDate().toLocaleDateString("tr-TR") ?? "—";
  const olusturma = d.olusturmaTarihi?.toDate().toLocaleDateString("tr-TR") ?? "—";
  const kunyeFont = fontCss(tasarim.fontlar.kunye);

  return (
    <div className="pb-5">
      <RaporBant tasarim={tasarim} rozet={isYorumluPuanli ? "YORUMLU PUANLI" : "PUANSIZ"} />

      {/* Belge başlığı */}
      <h1
        className="font-extrabold leading-tight pt-5 pb-4"
        style={{ color: RAPOR_RENK.ink, fontFamily: fontCss(tasarim.fontlar.baslik), fontSize: tasarim.boyutlar.baslik }}
      >
        {d.formAd}
      </h1>

      {/* Künye + puan paneli */}
      <div className="flex items-stretch gap-3.5">
        <div
          className="flex-1 grid grid-cols-4 gap-x-5 gap-y-4 rounded-xl px-6 py-5"
          style={{ background: RAPOR_RENK.metaBg, border: `1px solid ${RAPOR_RENK.line}` }}
        >
          <RaporMetaAlan etiket="Personel" deger={d.personelAd} kunyeFont={kunyeFont} boyut={tasarim.boyutlar.kunye} />
          <RaporMetaAlan etiket="Mağaza" deger={d.magazaAd ?? ""} kunyeFont={kunyeFont} boyut={tasarim.boyutlar.kunye} />
          <RaporMetaAlan etiket="İzlenme Tarihi" deger={izlenme} kunyeFont={kunyeFont} boyut={tasarim.boyutlar.kunye} />
          <RaporMetaAlan etiket="Raporlama Tarihi" deger={olusturma} kunyeFont={kunyeFont} boyut={tasarim.boyutlar.kunye} />
        </div>
        {isYorumluPuanli && d.toplamPuan !== null && (
          <div
            className="w-[130px] shrink-0 rounded-xl flex flex-col items-center justify-center gap-1.5"
            style={{ background: RAPOR_RENK.accent, color: RAPOR_RENK.onAccent }}
          >
            <b className="font-extrabold leading-none" style={{ fontFamily: fontCss(tasarim.fontlar.puan), fontSize: tasarim.boyutlar.puan }}>
              {d.toplamPuan}
            </b>
            <span className="text-[9px] uppercase" style={{ letterSpacing: "0.18em", opacity: 0.85, fontFamily: MONO }}>
              Puan
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function BolumBaslik({ sira, ad, cevaplanan, toplam, soruBaslikFont, boyut }: {
  sira: number; ad: string; cevaplanan: number; toplam: number; soruBaslikFont: string; boyut: number;
}) {
  return (
    <div className="pt-3 pb-4">
      <div
        className="flex items-center justify-between gap-4 py-3"
        style={{ borderTop: `2px solid ${RAPOR_RENK.accent}`, borderBottom: `1px solid ${RAPOR_RENK.line}` }}
      >
        <div className="flex items-baseline gap-3">
          <span className="text-[11px] font-semibold" style={{ color: RAPOR_RENK.accent, fontFamily: MONO }}>
            {String(sira).padStart(2, "0")}
          </span>
          <span
            className="font-bold uppercase"
            style={{ color: RAPOR_RENK.ink, letterSpacing: "0.04em", fontFamily: soruBaslikFont, fontSize: boyut }}
          >
            {ad}
          </span>
        </div>
        <span className="text-[10px]" style={{ color: RAPOR_RENK.faint, fontFamily: MONO }}>
          {cevaplanan}/{toplam} CEVAPLANDI
        </span>
      </div>
    </div>
  );
}

function SoruKarti({ sira, d, soruId, tasarim }: {
  sira: number; d: Degerlendirme; soruId: string; tasarim: RaporTasarimAyarlari;
}) {
  const soru = d.soruSnapshot[soruId];
  const tip = soru?.tip ?? "evet_hayir_muaf";
  const cevap = d.puansizCevaplar?.[soruId];
  const kisaTipli = tip === "evet_hayir_muaf" || tip === "sayi" || tip === "tarih" || tip === "saat";
  const uzunDeger = tip === "kisa_metin" ? cevap?.kisaMetin : tip === "yorum" ? cevap?.yorum : undefined;
  const metinFont = fontCss(tasarim.fontlar.metin);
  const metinBoyut = tasarim.boyutlar.metin;

  return (
    <div className="pb-3">
      <div
        className="flex gap-4 rounded-[10px] px-5 py-4"
        style={{ background: RAPOR_RENK.qBg, border: `1px solid ${RAPOR_RENK.qBorder}` }}
      >
        <span
          className="flex-none w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-semibold"
          style={{ background: RAPOR_RENK.accentSoft, color: RAPOR_RENK.accent, fontFamily: MONO }}
        >
          {sira}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <p
              className="font-bold leading-relaxed pt-1"
              style={{
                color: RAPOR_RENK.ink,
                letterSpacing: "0.02em",
                fontFamily: fontCss(tasarim.fontlar.soruBaslik),
                fontSize: tasarim.boyutlar.soruBaslik,
              }}
            >
              {soru?.metin}
            </p>
            {kisaTipli && <span className="shrink-0 pt-1"><KisaCevap tip={tip} cevap={cevap} /></span>}
          </div>

          {(tip === "kisa_metin" || tip === "yorum") && (
            <div className="pt-2.5">
              {uzunDeger ? (
                <p
                  className="leading-relaxed whitespace-pre-wrap m-0"
                  style={{ color: RAPOR_RENK.sub, fontFamily: metinFont, fontSize: metinBoyut }}
                >
                  {uzunDeger}
                </p>
              ) : (
                <CevapsizChip />
              )}
            </div>
          )}

          {tip !== "yorum" && cevap?.yorum && (
            <p
              className="leading-relaxed whitespace-pre-wrap mt-2.5 mb-0 px-3 py-2 rounded-r-md"
              style={{
                color: RAPOR_RENK.sub,
                background: "#ffffff",
                borderLeft: `2px solid ${RAPOR_RENK.accentMuted}`,
                fontFamily: metinFont,
                fontSize: Math.max(9, metinBoyut - 1.5),
              }}
            >
              <span className="font-semibold" style={{ color: RAPOR_RENK.faint }}>Not: </span>
              {cevap.yorum}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/** Soruya ait fotoğraf: her fotoğraf kendi satırında, kırpılmadan tam boyut gösterilir —
 *  içerik genişliğine sığar, sayfa yüksekliğini aşmaz (en-boy oranı korunur).
 *  Her fotoğraf ayrı sayfalama bloğu olduğu için çok fotoğraflı sorular sayfalara yayılabilir. */
function FotoBlok({ url }: { url: string }) {
  return (
    <div className="pb-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt=""
        className="block mx-auto rounded-lg"
        style={{
          maxWidth: "100%",
          maxHeight: 900,
          width: "auto",
          height: "auto",
          border: `1px solid ${RAPOR_RENK.qBorder}`,
        }}
      />
    </div>
  );
}

/**
 * Raporu, sayfalamada bölünmeden yerleştirilecek atomik bloklara (başlık,
 * bölüm başlıkları, soru kartları ve fotoğraf satırları) ayırarak üretir.
 */
export function pdfRaporBloklariOlustur(d: Degerlendirme, tasarim: RaporTasarimAyarlari): PdfBlok[] {
  const bloklar: PdfBlok[] = [{ tur: "baslik", el: <RaporBaslik d={d} tasarim={tasarim} /> }];
  const soruBaslikFont = fontCss(tasarim.fontlar.soruBaslik);

  Object.keys(d.bolumSnapshot).forEach((bolumId, bolumIdx) => {
    const bolum = d.bolumSnapshot[bolumId];
    const cevaplanan = bolum.soruIdleri.filter((sid) => {
      const soru = d.soruSnapshot[sid];
      return puansizCevapDoluMu(soru?.tip ?? "evet_hayir_muaf", d.puansizCevaplar?.[sid]);
    }).length;

    bloklar.push({
      tur: "bolum",
      el: (
        <BolumBaslik
          sira={bolumIdx + 1}
          ad={bolum.ad}
          cevaplanan={cevaplanan}
          toplam={bolum.soruIdleri.length}
          soruBaslikFont={soruBaslikFont}
          boyut={tasarim.boyutlar.soruBaslik}
        />
      ),
    });

    bolum.soruIdleri.forEach((soruId, i) => {
      bloklar.push({
        tur: "soru",
        el: <SoruKarti sira={i + 1} d={d} soruId={soruId} tasarim={tasarim} />,
      });
      (d.puansizCevaplar?.[soruId]?.fotograflar ?? []).forEach((url, fi) => {
        bloklar.push({ tur: "foto", el: <FotoBlok key={url + fi} url={url} /> });
      });
    });
  });

  return bloklar;
}

/* ─── Sayfa çerçevesi ─────────────────────────────────────────────────────── */

interface PdfSayfaProps {
  sayfaNo: number;
  toplamSayfa: number;
  altBilgiTarih: string;
  children: React.ReactNode;
}

/** Tam A4 boyutunda, altbilgili tek rapor sayfası. */
export function PdfSayfa({ sayfaNo, toplamSayfa, altBilgiTarih, children }: PdfSayfaProps) {
  return (
    <div
      data-pdf-sayfa
      className="relative"
      style={{
        width: PDF_SAYFA_GENISLIK,
        height: PDF_SAYFA_YUKSEKLIK,
        padding: `${UST_BOSLUK}px ${KENAR_BOSLUK}px ${ALT_BOSLUK}px`,
        background: RAPOR_RENK.kagit,
        color: RAPOR_RENK.ink,
      }}
    >
      {children}

      <div
        className="absolute flex items-center justify-between pt-2.5"
        style={{
          left: KENAR_BOSLUK,
          right: KENAR_BOSLUK,
          bottom: 22,
          borderTop: `1px solid ${RAPOR_RENK.line}`,
          fontFamily: MONO,
        }}
      >
        <p className="text-[9px] m-0" style={{ color: RAPOR_RENK.faint }}>
          TUĞBA KURUYEMİŞ · DEĞERLENDİRME RAPORU · {altBilgiTarih}
        </p>
        <p className="text-[9px] font-semibold m-0" style={{ color: RAPOR_RENK.faint }}>
          SAYFA {sayfaNo} / {toplamSayfa}
        </p>
      </div>
    </div>
  );
}
