import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas-pro";
import {
  pdfRaporBloklariOlustur,
  PdfTekSayfa,
  RaporBant,
  RAPOR_MONO,
  PDF_SAYFA_GENISLIK,
  RAPOR_RENK,
} from "@/components/degerlendirme/PdfRapor";
import { getRaporTasarim, getOncekiRaporPuanlari } from "@/lib/firestore";
import { tasarimBirlestir, type RaporTasarimAyarlari } from "@/lib/raporTasarim";
import type { Degerlendirme, PuansizCevapDegeri } from "@/types";

const A4_GENISLIK_MM = 210;
const PX_TO_MM = A4_GENISLIK_MM / PDF_SAYFA_GENISLIK;
/** Tarayıcı canvas boyut sınırına takılmamak için üst sınır (px). */
const MAX_CANVAS_KENARI = 30000;

function dosyaAdiTemizle(s: string): string {
  return s.replace(/[\\/:*?"<>|]+/g, " ").trim();
}

function viaProxy(url: string): string {
  return `/api/image-proxy?url=${encodeURIComponent(url)}`;
}

/** html2canvas'ın Firebase Storage görsellerini CORS hatası almadan çizebilmesi için,
 *  fotoğraf URL'lerini aynı origin üzerinden servis eden proxy'ye yönlendiren kopya üretir. */
function pdfGuvenliKopya(d: Degerlendirme): Degerlendirme {
  if (!d.puansizCevaplar) return d;
  const kopya: Record<string, PuansizCevapDegeri> = {};
  for (const [soruId, cevap] of Object.entries(d.puansizCevaplar)) {
    kopya[soruId] = {
      ...cevap,
      fotograflar: cevap.fotograflar?.map(viaProxy),
    };
  }
  return { ...d, puansizCevaplar: kopya };
}

async function gorsellerYuklenmesiniBekle(container: HTMLElement): Promise<void> {
  const imgs = Array.from(container.querySelectorAll("img"));
  await Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) return resolve();
          img.onload = () => resolve();
          img.onerror = () => resolve();
        })
    )
  );
}

function ikiFrameBekle(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}

/**
 * Puansız (tek seferlik) bir değerlendirmeyi, içerik kadar aşağı uzayan
 * TEK sayfalık PDF olarak indirir (genişlik A4, yükseklik özel — sayfa bölme yok).
 */
export async function degerlendirmePdfIndir(d: Degerlendirme): Promise<void> {
  const guvenli = pdfGuvenliKopya(d);

  // Kayıtlı tasarım ayarlarını (logo + yazı tipleri) yükle; okunamıyorsa varsayılanla devam et.
  let tasarim: RaporTasarimAyarlari;
  try {
    tasarim = tasarimBirlestir(await getRaporTasarim());
  } catch {
    tasarim = tasarimBirlestir(null);
  }
  if (tasarim.logoUrl) tasarim = { ...tasarim, logoUrl: viaProxy(tasarim.logoUrl) };

  // Personelin önceki son 3 rapor puanı — okunamazsa alan gösterilmeden devam edilir.
  let sonRaporlar: Degerlendirme[] = [];
  try {
    sonRaporlar = await getOncekiRaporPuanlari(d);
  } catch { /* alan opsiyonel */ }

  // Özel fontların (Playfair, Archivo, Spline Sans Mono) canvas'a doğru çizilmesi için yüklenmelerini bekle.
  await document.fonts.ready;

  const bloklar = pdfRaporBloklariOlustur(guvenli, tasarim, sonRaporlar);

  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "0";
  document.body.appendChild(container);

  const root = createRoot(container);

  try {
    const altBilgiTarih = new Date().toLocaleDateString("tr-TR", {
      day: "2-digit", month: "2-digit", year: "numeric",
    });

    flushSync(() => {
      root.render(
        <PdfTekSayfa altBilgiTarih={altBilgiTarih}>
          {bloklar.map((b, i) => (
            <div key={i}>{b.el}</div>
          ))}
        </PdfTekSayfa>
      );
    });
    await gorsellerYuklenmesiniBekle(container);
    await ikiFrameBekle();

    const sayfaEl = container.querySelector<HTMLElement>("[data-pdf-sayfa]");
    if (!sayfaEl) throw new Error("Rapor sayfası oluşturulamadı.");
    const yukseklikPx = sayfaEl.getBoundingClientRect().height;

    // Normalde 2x çözünürlük; çok uzun raporlarda canvas sınırına sığacak şekilde düşür.
    const olcek = Math.min(2, MAX_CANVAS_KENARI / yukseklikPx);

    const canvas = await html2canvas(sayfaEl, {
      scale: olcek,
      useCORS: true,
      allowTaint: true,
      backgroundColor: RAPOR_RENK.kagit,
      windowWidth: PDF_SAYFA_GENISLIK,
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    const yukseklikMm = +(yukseklikPx * PX_TO_MM).toFixed(2);

    const pdf = new jsPDF({
      unit: "mm",
      format: [A4_GENISLIK_MM, yukseklikMm],
      orientation: "portrait",
    });
    pdf.addImage(imgData, "JPEG", 0, 0, A4_GENISLIK_MM, yukseklikMm);

    const tarihEtiketi = d.izlenmeTarihi?.toDate().toLocaleDateString("tr-TR").replace(/\./g, "-") ?? "";
    const dosyaAdi = `${dosyaAdiTemizle(d.personelAd)} - ${dosyaAdiTemizle(d.formAd)}${tarihEtiketi ? ` - ${tarihEtiketi}` : ""}.pdf`;
    pdf.save(dosyaAdi);
  } finally {
    root.unmount();
    container.remove();
  }
}

/* ─── Liste PDF (filtrelenmiş / seçilmiş kayıtların özeti) ─────────────────── */

const LISTE_SAYFA_SATIR = 28;

function listeTarih(d: Degerlendirme): Date | null {
  const t = d.raporlamaTarihi?.toDate?.() ?? d.izlenmeTarihi?.toDate?.() ?? null;
  return t;
}

/**
 * Değerlendirmeler tablosundaki (filtrelenmiş veya seçilmiş) kayıtları, tablodaki
 * sütunlarla A4 sayfalara bölünmüş tek bir özet PDF olarak indirir.
 * Kameraman adı raporlarda gösterilmez (rapor tercihi).
 */
export async function degerlendirmeListesiPdfIndir(liste: Degerlendirme[], baslik = "Değerlendirmeler"): Promise<void> {
  if (liste.length === 0) return;

  let tasarim: RaporTasarimAyarlari;
  try {
    tasarim = tasarimBirlestir(await getRaporTasarim());
  } catch {
    tasarim = tasarimBirlestir(null);
  }
  if (tasarim.logoUrl) tasarim = { ...tasarim, logoUrl: viaProxy(tasarim.logoUrl) };

  await document.fonts.ready;

  const sirali = [...liste].sort((a, b) => (listeTarih(b)?.getTime() ?? 0) - (listeTarih(a)?.getTime() ?? 0));
  const sayfalar: Degerlendirme[][] = [];
  for (let i = 0; i < sirali.length; i += LISTE_SAYFA_SATIR) sayfalar.push(sirali.slice(i, i + LISTE_SAYFA_SATIR));

  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "0";
  document.body.appendChild(container);
  const root = createRoot(container);

  const altBilgiTarih = new Date().toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const hucre: React.CSSProperties = { padding: "5px 6px", borderBottom: `1px solid ${RAPOR_RENK.line}`, fontSize: 9.5, verticalAlign: "middle" };
  const basHucre: React.CSSProperties = { ...hucre, fontSize: 8.5, fontWeight: 700, color: RAPOR_RENK.onAccent, background: RAPOR_RENK.accent, borderBottom: "none", textTransform: "uppercase", letterSpacing: "0.04em" };

  try {
    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    for (let s = 0; s < sayfalar.length; s++) {
      flushSync(() => {
        root.render(
          <div
            data-pdf-sayfa
            style={{ width: PDF_SAYFA_GENISLIK, minHeight: 1123, padding: "40px 48px 22px", background: RAPOR_RENK.kagit, color: RAPOR_RENK.ink, display: "flex", flexDirection: "column" }}
          >
            <div style={{ flex: 1 }}>
              <RaporBant tasarim={tasarim} rozet="LİSTE" />
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "16px 0 10px" }}>
                <h1 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: RAPOR_RENK.accent }}>{baslik}</h1>
                <span style={{ fontSize: 9, color: RAPOR_RENK.faint, fontFamily: RAPOR_MONO }}>{liste.length} KAYIT · {altBilgiTarih}</span>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                <colgroup>
                  <col style={{ width: 62 }} /><col style={{ width: 62 }} /><col /><col style={{ width: 120 }} /><col style={{ width: 130 }} /><col style={{ width: 48 }} /><col style={{ width: 58 }} /><col style={{ width: 44 }} />
                </colgroup>
                <thead>
                  <tr>
                    {["Durum", "Tarih", "Personel", "Mağaza", "Form", "Tip", "Puan", "Yüzde"].map((h, i) => (
                      <th key={h} style={{ ...basHucre, textAlign: i >= 6 ? "center" : "left" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sayfalar[s].map((d, i) => {
                    const t = listeTarih(d);
                    const yuzde = d.puanli && d.maxPuan ? Math.round(((d.toplamPuan ?? 0) / d.maxPuan) * 100) : null;
                    const acik = d.durum === "acik";
                    return (
                      <tr key={d.id} style={{ background: i % 2 === 1 ? RAPOR_RENK.qBg : "transparent" }}>
                        <td style={{ ...hucre, color: acik ? "#b45309" : RAPOR_RENK.sub, fontWeight: acik ? 700 : 500 }}>{acik ? "Devam" : "Tamamlandı"}</td>
                        <td style={{ ...hucre, fontFamily: RAPOR_MONO, color: RAPOR_RENK.sub }}>{t ? t.toLocaleDateString("tr-TR") : "—"}</td>
                        <td style={{ ...hucre, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.magazaRaporu ? `${d.magazaAd} (Mağaza)` : d.personelAd}</td>
                        <td style={{ ...hucre, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.magazaAd || "—"}</td>
                        <td style={{ ...hucre, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: RAPOR_RENK.sub }}>{d.formAd}</td>
                        <td style={{ ...hucre, color: RAPOR_RENK.sub }}>{d.puanli ? "Puanlı" : "Puansız"}</td>
                        <td style={{ ...hucre, textAlign: "center", fontFamily: RAPOR_MONO }}>{d.puanli && d.maxPuan ? `${d.toplamPuan ?? 0}/${d.maxPuan}` : "—"}</td>
                        <td style={{ ...hucre, textAlign: "center", fontFamily: RAPOR_MONO, fontWeight: 700, color: yuzde === null ? RAPOR_RENK.faint : yuzde >= 80 ? "#15803d" : yuzde >= 60 ? "#b45309" : "#be123c" }}>{yuzde !== null ? `%${yuzde}` : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 10, marginTop: 12, borderTop: `1px solid ${RAPOR_RENK.line}`, fontFamily: RAPOR_MONO }}>
              <p style={{ margin: 0, fontSize: 9, color: RAPOR_RENK.faint }}>TUĞBA KURUYEMİŞ · DEĞERLENDİRME LİSTESİ · {altBilgiTarih}</p>
              <p style={{ margin: 0, fontSize: 9, fontWeight: 600, color: RAPOR_RENK.faint }}>SAYFA {s + 1} / {sayfalar.length}</p>
            </div>
          </div>
        );
      });
      await gorsellerYuklenmesiniBekle(container);
      await ikiFrameBekle();

      const sayfaEl = container.querySelector<HTMLElement>("[data-pdf-sayfa]");
      if (!sayfaEl) throw new Error("Liste sayfası oluşturulamadı.");
      const yukseklikPx = sayfaEl.getBoundingClientRect().height;
      const canvas = await html2canvas(sayfaEl, { scale: 2, useCORS: true, allowTaint: true, backgroundColor: RAPOR_RENK.kagit, windowWidth: PDF_SAYFA_GENISLIK });
      const imgData = canvas.toDataURL("image/jpeg", 0.92);
      const yukseklikMm = Math.min(297, +(yukseklikPx * PX_TO_MM).toFixed(2));
      if (s > 0) pdf.addPage("a4", "portrait");
      pdf.addImage(imgData, "JPEG", 0, 0, A4_GENISLIK_MM, yukseklikMm);
    }
    pdf.save(`${dosyaAdiTemizle(baslik)} - ${altBilgiTarih.replace(/\./g, "-")}.pdf`);
  } finally {
    root.unmount();
    container.remove();
  }
}
