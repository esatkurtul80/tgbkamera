import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas-pro";
import PuansizRaporIcerik from "@/components/degerlendirme/PuansizRaporIcerik";
import type { Degerlendirme, PuansizCevapDegeri } from "@/types";

const A4_GENISLIK_PX = 794; // A4 genişliği, 96dpi CSS px
const A4_YUKSEKLIK_PX = 1123; // A4 yüksekliği, 96dpi CSS px
const A4_GENISLIK_MM = 210;
const PX_TO_MM = 0.264583;

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

/**
 * Puansız (tek seferlik) bir değerlendirmeyi, ekrandaki görsel raporla birebir
 * aynı görünümde çok sayfalı PDF olarak indirir (html2canvas + jsPDF).
 */
export async function degerlendirmePdfIndir(d: Degerlendirme): Promise<void> {
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.style.width = `${A4_GENISLIK_PX}px`;
  container.style.background = "#f8fafc";
  container.style.padding = "24px";
  document.body.appendChild(container);

  const root = createRoot(container);

  try {
    flushSync(() => {
      root.render(<PuansizRaporIcerik d={pdfGuvenliKopya(d)} />);
    });

    await gorsellerYuklenmesiniBekle(container);
    // Layout'un oturması için bir sonraki frame'i bekle
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

    const toplamYukseklik = container.scrollHeight;
    const sayfaSayisi = Math.max(1, Math.ceil(toplamYukseklik / A4_YUKSEKLIK_PX));

    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

    for (let i = 0; i < sayfaSayisi; i++) {
      const yStart = i * A4_YUKSEKLIK_PX;
      const parcaYukseklik = Math.min(A4_YUKSEKLIK_PX, toplamYukseklik - yStart);

      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#f8fafc",
        y: yStart,
        height: parcaYukseklik,
        windowWidth: A4_GENISLIK_PX,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const parcaMm = +(parcaYukseklik * PX_TO_MM).toFixed(2);

      if (i > 0) pdf.addPage("a4", "portrait");
      pdf.addImage(imgData, "JPEG", 0, 0, A4_GENISLIK_MM, parcaMm);
    }

    const tarihEtiketi = d.izlenmeTarihi?.toDate().toLocaleDateString("tr-TR").replace(/\./g, "-") ?? "";
    const dosyaAdi = `${dosyaAdiTemizle(d.personelAd)} - ${dosyaAdiTemizle(d.formAd)}${tarihEtiketi ? ` - ${tarihEtiketi}` : ""}.pdf`;
    pdf.save(dosyaAdi);
  } finally {
    root.unmount();
    container.remove();
  }
}
