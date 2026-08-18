import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas-pro";
import {
  pdfRaporBloklariOlustur,
  PdfSayfa,
  PDF_ICERIK_GENISLIK,
  PDF_ICERIK_KAPASITE,
  PDF_SAYFA_GENISLIK,
  RAPOR_RENK,
  type PdfBlok,
} from "@/components/degerlendirme/PdfRapor";
import { getRaporTasarim } from "@/lib/firestore";
import { tasarimBirlestir, type RaporTasarimAyarlari } from "@/lib/raporTasarim";
import type { Degerlendirme, PuansizCevapDegeri } from "@/types";

const A4_GENISLIK_MM = 210;
const A4_YUKSEKLIK_MM = 297;

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
 * Blokları A4 sayfalarına dağıtır: hiçbir blok ortadan bölünmez; rapor ve bölüm
 * başlıkları, altındaki ilk satırla birlikte sığmıyorsa yeni sayfaya taşınır
 * (sayfa sonunda yalnız kalmış başlık olmaz).
 */
function sayfalaraDagit(bloklar: PdfBlok[], yukseklikler: number[]): number[][] {
  const sayfalar: number[][] = [];
  let aktif: number[] = [];
  let doluluk = 0;

  for (let i = 0; i < bloklar.length; i++) {
    const h = yukseklikler[i];
    const baslikTuru = bloklar[i].tur === "baslik" || bloklar[i].tur === "bolum";
    const gerekli = baslikTuru && i + 1 < bloklar.length ? h + yukseklikler[i + 1] : h;

    if (aktif.length > 0 && doluluk + gerekli > PDF_ICERIK_KAPASITE) {
      sayfalar.push(aktif);
      aktif = [];
      doluluk = 0;
    }
    aktif.push(i);
    doluluk += h;
  }
  if (aktif.length > 0) sayfalar.push(aktif);
  return sayfalar;
}

/**
 * Puansız (tek seferlik) bir değerlendirmeyi profesyonel rapor düzeninde
 * (antet, künye, sayfa numarası; satırlar sayfa sonunda bölünmeden) çok
 * sayfalı PDF olarak indirir.
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

  // Özel fontların (Playfair, Archivo, Spline Sans Mono) canvas'a doğru çizilmesi için yüklenmelerini bekle.
  await document.fonts.ready;

  const bloklar = pdfRaporBloklariOlustur(guvenli, tasarim);

  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "0";
  document.body.appendChild(container);

  const root = createRoot(container);

  try {
    // 1) Ölçüm: tüm blokları içerik genişliğinde çiz, tek tek yüksekliklerini al.
    flushSync(() => {
      root.render(
        <div style={{ width: PDF_ICERIK_GENISLIK, background: RAPOR_RENK.kagit }}>
          {bloklar.map((b, i) => (
            <div key={i} data-olcum-blok>
              {b.el}
            </div>
          ))}
        </div>
      );
    });
    await gorsellerYuklenmesiniBekle(container);
    await ikiFrameBekle();

    const yukseklikler = Array.from(container.querySelectorAll("[data-olcum-blok]")).map(
      (el) => el.getBoundingClientRect().height
    );

    // 2) Blokları sayfalara dağıt.
    const sayfalar = sayfalaraDagit(bloklar, yukseklikler);

    // 3) Sayfaları gerçek A4 çerçevesinde (antet + altbilgi) yeniden çiz.
    const altBilgiTarih = new Date().toLocaleDateString("tr-TR", {
      day: "2-digit", month: "2-digit", year: "numeric",
    });

    flushSync(() => {
      root.render(
        <div style={{ width: PDF_SAYFA_GENISLIK }}>
          {sayfalar.map((blokIdxleri, s) => (
            <PdfSayfa key={s} sayfaNo={s + 1} toplamSayfa={sayfalar.length} altBilgiTarih={altBilgiTarih}>
              {blokIdxleri.map((i) => (
                <div key={i}>{bloklar[i].el}</div>
              ))}
            </PdfSayfa>
          ))}
        </div>
      );
    });
    await gorsellerYuklenmesiniBekle(container);
    await ikiFrameBekle();

    // 4) Her sayfayı ayrı ayrı yakala ve PDF'e bas.
    const sayfaElleri = Array.from(container.querySelectorAll<HTMLElement>("[data-pdf-sayfa]"));
    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

    for (let i = 0; i < sayfaElleri.length; i++) {
      const canvas = await html2canvas(sayfaElleri[i], {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: RAPOR_RENK.kagit,
        windowWidth: PDF_SAYFA_GENISLIK,
      });
      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      if (i > 0) pdf.addPage("a4", "portrait");
      pdf.addImage(imgData, "JPEG", 0, 0, A4_GENISLIK_MM, A4_YUKSEKLIK_MM);
    }

    const tarihEtiketi = d.izlenmeTarihi?.toDate().toLocaleDateString("tr-TR").replace(/\./g, "-") ?? "";
    const dosyaAdi = `${dosyaAdiTemizle(d.personelAd)} - ${dosyaAdiTemizle(d.formAd)}${tarihEtiketi ? ` - ${tarihEtiketi}` : ""}.pdf`;
    pdf.save(dosyaAdi);
  } finally {
    root.unmount();
    container.remove();
  }
}
