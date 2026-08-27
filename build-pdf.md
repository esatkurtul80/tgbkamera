# PDF Raporlama Sistemi Entegrasyon Kılavuzu

Bu kılavuz, mevcut **AuditPro** sisteminde denetim tamamlandıktan sonra çalışan PDF üretim mekanizmasını başka bir web uygulamasına nasıl entegre edeceğinizi adım adım açıklamaktadır.

Mevcut sistemde **iki farklı** PDF oluşturma yöntemi kullanılmaktadır:

1. **Tablo Tabanlı PDF Üretimi (`jsPDF` + `jspdf-autotable`)**: Performanslı, tablo yapısındaki veriler için ideal ve doğrudan JavaScript nesnelerinden üretilir.
2. **HTML'den PDF'e Dönüştürme (`html2pdf.js` + `html2canvas`)**: Web arayüzündeki zengin tasarımların birebir piksel kopyasını çıkarmak ve PDF olarak indirmek için kullanılır.

---

## 1. Gereksinimler ve Bağımlılıklar

Entegrasyon yapılacak yeni web uygulamasında aşağıdaki kütüphanelerin yüklü olması gerekir:

```bash
npm install jspdf jspdf-autotable
```

Zengin HTML tasarımları PDF'e dönüştürmek için ise `html2pdf.js` kütüphanesini CDN üzerinden yükleyebilir veya paket yöneticisi ile kurabilirsiniz:

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
```

---

## 2. Yöntem 1: Tablo Tabanlı PDF Üretimi (`jspdf-autotable`)

Bu yaklaşım, [pdf-generator.ts](file:///c:/Users/PC/Desktop/ai/lib/pdf-generator.ts) ve [audit-summary.tsx](file:///c:/Users/PC/Desktop/ai/components/audit-summary.tsx) dosyalarında kullanılır. JavaScript nesnelerinden doğrudan yapılandırılmış tablolar oluşturur.

### Temel Akış ve Kod Yapısı

```typescript
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export async function generateReportPDF(reportData: any, fontBase64?: string) {
  const doc = new jsPDF("p", "mm", "a4");

  // 1. Türkçe Karakter Desteği için Özel Font Ekleme (Örn: Roboto)
  if (fontBase64) {
    doc.addFileToVFS("Roboto-Regular.ttf", fontBase64);
    doc.addFont("Roboto-Regular.ttf", "Roboto", "normal", "Identity-H");
    doc.addFont("Roboto-Regular.ttf", "Roboto", "bold", "Identity-H");
    doc.setFont("Roboto", "normal");
  }

  // 2. Başlık ve Bilgi Tablosu Oluşturma
  doc.setFontSize(16);
  doc.text("DENETİM RAPORU", 14, 20);

  // jspdf-autotable ile Üst Bilgi Kartı
  autoTable(doc, {
    startY: 30,
    body: [
      ["MAĞAZA ADI", reportData.storeName, "DENETMEN", reportData.auditorName],
      ["TARİH", reportData.date, "SKOR", `%${reportData.score}`]
    ],
    theme: "grid",
    styles: { font: fontBase64 ? "Roboto" : "helvetica", fontSize: 9 }
  });

  // 3. Bölümler ve Alt Tablolar
  let yPos = (doc as any).lastAutoTable.finalY + 10;

  reportData.sections.forEach((section: any) => {
    // Sayfa sonu kontrolü
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(12);
    doc.text(section.name, 14, yPos);
    yPos += 5;

    const tableRows = section.questions.map((q: any) => [
      q.text,
      q.answer,
      q.points,
      q.note || "-"
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [["Soru", "Cevap", "Puan", "Not"]],
      body: tableRows,
      theme: "grid",
      styles: { font: fontBase64 ? "Roboto" : "helvetica", fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 30 },
        2: { cellWidth: 20 },
        3: { cellWidth: 50 }
      }
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
  });

  // 4. Kaydet / İndir
  doc.save(`Rapor_${reportData.id}.pdf`);
}
```

---

## 3. Yöntem 2: Tasarımsal HTML-to-PDF Dönüştürme (`html2pdf.js`)

Bu yöntem, [special-report-generator.tsx](file:///c:/Users/PC/Desktop/ai/components/admin/special-report-generator.tsx) dosyasında olduğu gibi, zengin CSS tasarımlarını ve görselleri içeren formları A4 sayfaları halinde PDF'e aktarmak için kullanılır.

### Nasıl Çalışır?
1. Ekranda veya arka planda (örneğin `position: absolute; left: -9999px`) bir A4 şablonu (genişliği `794px`) çizilir.
2. `html2pdf.js` ile bu HTML elemanı taranarak canvas'a dökülür.
3. Canvas parçalara (sayfalara) bölünerek `jsPDF.addImage` yardımıyla JPEG olarak PDF'e basılır.

### Örnek React Entegrasyonu

```typescript
import { useRef, useState } from "react";

export function HTMLToPDFGenerator({ data }) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = useState(false);

  const handleDownload = async () => {
    if (!reportRef.current) return;
    setGenerating(true);

    const element = reportRef.current;
    
    // Mobil veya farklı ekranlarda kaymayı önlemek için geçici A4 boyutu sabitlemesi
    const originalStyle = {
      width: element.style.width,
      margin: element.style.margin,
      transform: element.style.transform
    };

    element.style.width = '794px';
    element.style.margin = '0 auto';
    element.style.transform = 'none';

    try {
      const jspdfModule = await import('jspdf');
      const jsPDF = jspdfModule.jsPDF || (jspdfModule as any).default;
      
      const realContentHeight = element.scrollHeight;
      const PAGE_H_CSS = 1123; // A4 yükseklik oranı (CSS px)
      const pages = Math.ceil(realContentHeight / PAGE_H_CSS);
      const pdfWidthMm = 210; // A4 Genişlik (mm)
      
      const pdf = new jsPDF({
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait',
      });

      // Her sayfayı html2pdf yardımıyla parça parça yakalama
      for (let i = 0; i < pages; i++) {
        const yStart = i * PAGE_H_CSS;
        const chunkHeight = Math.min(PAGE_H_CSS, realContentHeight - yStart);
        const chunkMm = +(chunkHeight * 0.264583).toFixed(2); // px to mm conversion

        const chunkCanvas = await window.html2pdf()
          .set({
            html2canvas: {
              scale: 2, // Çözünürlük kalitesi
              useCORS: true,
              allowTaint: true,
              y: yStart,
              height: chunkHeight,
              windowWidth: 794
            }
          })
          .from(element)
          .toCanvas()
          .get('canvas');

        const imgData = chunkCanvas.toDataURL('image/jpeg', 0.95);

        if (i > 0) {
          pdf.addPage('a4', 'portrait');
        }
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidthMm, chunkMm);
      }

      pdf.save(`Rapor_${data.id}.pdf`);
    } catch (error) {
      console.error("PDF üretilirken hata oluştu:", error);
    } finally {
      // Orijinal stilleri geri yükleme
      element.style.width = originalStyle.width;
      element.style.margin = originalStyle.margin;
      element.style.transform = originalStyle.transform;
      setGenerating(false);
    }
  };

  return (
    <div>
      <button onClick={handleDownload} disabled={generating}>
        {generating ? "PDF Hazırlanıyor..." : "PDF İndir"}
      </button>
      
      {/* PDF'e basılacak HTML Şablonu */}
      <div ref={reportRef} style={{ width: '794px', background: 'white', padding: '40px' }}>
        <h1>{data.title}</h1>
        {/* Rapor içeriği buraya gelir */}
      </div>
    </div>
  );
}
```

---

## 4. Kritik Konular ve Çözümler

### A. CORS Hatası ve Görseller (Önemli)
Uzak sunuculardaki (Firebase Storage vb.) görselleri canvas'a çizmeye çalışırken tarayıcı **CORS (Cross-Origin Resource Sharing)** güvenlik hatası verir ve görseli engeller.
*   **Çözüm**: Görselleri doğrudan çekmek yerine bir **görsel proxy'si (Image Proxy)** kullanmalısınız.
*   Mevcut sistemdeki Next.js proxy route yapısı ([route.ts](file:///c:/Users/PC/Desktop/ai/app/api/image-proxy/route.ts)):
    ```typescript
    // GET /api/image-proxy?url=URL_ENCODED
    const response = await fetch(decodeURIComponent(url));
    const buffer = Buffer.from(await response.arrayBuffer());
    return new NextResponse(buffer, {
      headers: { 'Content-Type': response.headers.get('content-type') }
    });
    ```
    HTML şablonundaki resimlerin kaynaklarını bu proxy üzerinden vermelisiniz:
    `src={'/api/image-proxy?url=' + encodeURIComponent(imgUrl)}`

### B. Türkçe Karakter Sorunu
Varsayılan `jspdf` fontları (Helvetica vb.) Türkçe karakterleri (`ş, ğ, ı, Ö, Ç, Ş, İ`) desteklemez ve PDF'te bu karakterler bozuk çıkar.
*   **Çözüm**: Sisteminize **Roboto-Regular.ttf** veya benzeri bir Türkçe destekli fontun **Base64** halini gömmeli ve `doc.addFileToVFS` ile jsPDF'e tanıtmalısınız.

### C. Sayfa Taşması ve Bölünmeler
*   **jspdf-autotable** kullanırken satırların otomatik olarak bir sonraki sayfaya geçmesi kütüphane tarafından otomatik yönetilir.
*   **HTML-to-PDF** kullanırken ise tablo veya metinlerin ortadan bölünmemesi için CSS'te `page-break-inside: avoid;` veya `rowPageBreak: 'avoid'` özellikleri kullanılmalıdır.
