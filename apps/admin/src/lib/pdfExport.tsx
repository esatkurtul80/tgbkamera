import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas-pro";
import {
  pdfRaporBloklariOlustur,
  PdfTekSayfa,
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
