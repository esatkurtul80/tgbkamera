import { Workbook } from "exceljs";
import { soruPuanHesapla } from "@/lib/skorlama";
import type { Degerlendirme } from "@/types";

const CEVAP_STIL: Record<string, { renk: string; label: string }> = {
  evet: { renk: "FF10B981", label: "EVET" },
  hayir: { renk: "FFEF4444", label: "HAYIR" },
  muaf: { renk: "FF94A3B8", label: "MUAF" },
};

const AYLAR = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

function dosyaAdiTemizle(s: string): string {
  return s.replace(/[\\/:*?"<>|]+/g, " ").trim();
}

async function workbookIndir(wb: Workbook, dosyaAdi: string): Promise<void> {
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = dosyaAdi;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Açık (henüz kaydedilmemiş) veya kapalı bir değerlendirmenin o ana kadarki
 * izlenme/puan durumunu, ekrandaki matris rapora birebir uyumlu şekilde
 * Excel dosyası olarak indirir.
 */
export async function degerlendirmeExcelIndir(d: Degerlendirme): Promise<void> {
  const bolumSirasi = Object.keys(d.bolumSnapshot);
  const sistem = d.skorlamaSistemi ?? "oran";
  const siralanmis = [...(d.izlenmeler ?? [])].sort((a, b) => a.tarih.toMillis() - b.tarih.toMillis());

  const gunGruplari = new Map<string, typeof siralanmis>();
  for (const iz of siralanmis) {
    const key = iz.tarih.toDate().toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });
    if (!gunGruplari.has(key)) gunGruplari.set(key, []);
    gunGruplari.get(key)!.push(iz);
  }

  const izlenmeBaslangicKolon = 2; // A: soru metni
  const izlenmeSayisi = siralanmis.length;
  const oranKolon = izlenmeBaslangicKolon + izlenmeSayisi;
  const puanKolon = oranKolon + 1;
  const evetKolon = puanKolon + (d.puanli ? 1 : 0);
  const hayirKolon = evetKolon + 1;
  const muafKolon = hayirKolon + 1;
  const sonKolon = muafKolon;

  const wb = new Workbook();
  wb.creator = "TGB Kamera";
  wb.created = new Date();
  const ws = wb.addWorksheet("Rapor");

  // ── Özet bilgi bloğu ──────────────────────────────────────────────────────
  const bilgiSatirlari: [string, string][] = [
    ["Personel", d.personelAd],
    ["Mağaza", d.magazaAd || "—"],
    ["Form", d.formAd],
    ["Tip", d.puanli ? "Puanlı" : "Puansız"],
    ["Durum", d.durum === "acik" ? "Devam Ediyor (henüz kaydedilmedi)" : "Tamamlandı"],
  ];
  bilgiSatirlari.forEach(([etiket, deger], i) => {
    const satir = i + 1;
    ws.getCell(satir, 1).value = etiket;
    ws.getCell(satir, 1).font = { bold: true, color: { argb: "FF64748B" } };
    ws.getCell(satir, 2).value = deger;
    ws.getCell(satir, 2).font = { bold: true };
  });

  if (d.puanli && d.toplamPuan !== null && d.maxPuan) {
    const yuzde = d.maxPuan > 0 ? Math.round((d.toplamPuan / d.maxPuan) * 100) : 0;
    ws.getCell(1, 4).value = "Genel Puan";
    ws.getCell(1, 4).font = { bold: true, color: { argb: "FF64748B" } };
    ws.getCell(1, 5).value = `${d.toplamPuan} / ${d.maxPuan}  (%${yuzde})`;
    ws.getCell(1, 5).font = { bold: true, size: 12 };
  }

  const headerBaslangic = bilgiSatirlari.length + 2;
  const grupSatiri = headerBaslangic;
  const saatSatiri = headerBaslangic + 1;
  const veriBaslangic = headerBaslangic + 2;

  // ── Tablo başlıkları ──────────────────────────────────────────────────────
  ws.mergeCells(grupSatiri, 1, saatSatiri, 1);
  const soruBaslik = ws.getCell(grupSatiri, 1);
  soruBaslik.value = "Soru";
  soruBaslik.font = { bold: true, color: { argb: "FFFFFFFF" } };
  soruBaslik.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF312E81" } };
  soruBaslik.alignment = { vertical: "middle", horizontal: "left" };

  let kolon = izlenmeBaslangicKolon;
  for (const [tarihStr, izs] of gunGruplari) {
    if (izs.length > 1) ws.mergeCells(grupSatiri, kolon, grupSatiri, kolon + izs.length - 1);
    const c = ws.getCell(grupSatiri, kolon);
    c.value = tarihStr;
    c.font = { bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4338CA" } };
    c.alignment = { vertical: "middle", horizontal: "center" };

    for (const iz of izs) {
      const sc = ws.getCell(saatSatiri, kolon);
      sc.value = iz.tarih.toDate().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
      sc.font = { bold: true, color: { argb: "FF312E81" } };
      sc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFDE68A" } };
      sc.alignment = { vertical: "middle", horizontal: "center" };
      kolon++;
    }
  }

  const ozetBasliklari: [number, string][] = [[oranKolon, "% Oran"]];
  if (d.puanli) ozetBasliklari.push([puanKolon, "Puan"]);
  ozetBasliklari.push([evetKolon, "Evet"], [hayirKolon, "Hayır"], [muafKolon, "Muaf"]);
  for (const [col, label] of ozetBasliklari) {
    ws.mergeCells(grupSatiri, col, saatSatiri, col);
    const c = ws.getCell(grupSatiri, col);
    c.value = label;
    c.font = { bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
    c.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  }

  // ── Bölüm / soru satırları ────────────────────────────────────────────────
  let satir = veriBaslangic;
  for (const bolumId of bolumSirasi) {
    const bolum = d.bolumSnapshot[bolumId];

    ws.mergeCells(satir, 1, satir, sonKolon);
    const bolumHucre = ws.getCell(satir, 1);
    bolumHucre.value = bolum.ad;
    bolumHucre.font = { bold: true, color: { argb: "FF334155" } };
    bolumHucre.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
    satir++;

    for (const soruId of bolum.soruIdleri) {
      const soru = d.soruSnapshot[soruId];
      if (!soru) continue;

      ws.getCell(satir, 1).value = soru.metin;
      ws.getCell(satir, 1).alignment = { wrapText: true, vertical: "top" };

      let c = izlenmeBaslangicKolon;
      for (const iz of siralanmis) {
        const cevap = iz.cevaplar[soruId];
        const cell = ws.getCell(satir, c);
        if (cevap) {
          const stil = CEVAP_STIL[cevap];
          cell.value = stil.label;
          cell.font = { bold: true, color: { argb: cevap === "muaf" ? "FF334155" : "FFFFFFFF" } };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: stil.renk } };
          cell.alignment = { horizontal: "center", vertical: "middle" };
        }
        c++;
      }

      const sonuc = soruPuanHesapla(soruId, soru, siralanmis.map((iz) => ({ cevaplar: iz.cevaplar })), sistem);
      if (sonuc.toplamIzlenme > 0) {
        ws.getCell(satir, oranKolon).value = `%${sonuc.oran}`;
        if (d.puanli) ws.getCell(satir, puanKolon).value = `${sonuc.kazanilanPuan}/${soru.puan}`;
        ws.getCell(satir, evetKolon).value = sonuc.evetSayisi;
        ws.getCell(satir, hayirKolon).value = sonuc.hayirSayisi;
        ws.getCell(satir, muafKolon).value = sonuc.muafSayisi;
        for (const col of [oranKolon, puanKolon, evetKolon, hayirKolon, muafKolon]) {
          ws.getCell(satir, col).alignment = { horizontal: "center", vertical: "middle" };
        }
      }
      satir++;
    }
  }

  // ── Genel toplam ──────────────────────────────────────────────────────────
  if (d.puanli && d.toplamPuan !== null) {
    satir++;
    ws.mergeCells(satir, 1, satir, sonKolon - 1);
    const etiketHucre = ws.getCell(satir, 1);
    etiketHucre.value = "GENEL TOPLAM";
    etiketHucre.font = { bold: true, size: 12 };
    etiketHucre.alignment = { horizontal: "right" };
    const yuzde = d.maxPuan && d.maxPuan > 0 ? Math.round((d.toplamPuan / d.maxPuan) * 100) : 0;
    const puanHucre = ws.getCell(satir, sonKolon);
    puanHucre.value = `${d.toplamPuan} / ${d.maxPuan}  (%${yuzde})`;
    puanHucre.font = { bold: true, size: 12, color: { argb: "FF312E81" } };
    puanHucre.alignment = { horizontal: "center" };
  }

  // ── Kolon genişlikleri ────────────────────────────────────────────────────
  ws.getColumn(1).width = 48;
  for (let c = izlenmeBaslangicKolon; c < oranKolon; c++) ws.getColumn(c).width = 11;
  for (let c = oranKolon; c <= sonKolon; c++) ws.getColumn(c).width = 10;

  const ayEtiketi = d.ay !== undefined && d.yil !== undefined ? ` - ${AYLAR[d.ay]} ${d.yil}` : "";
  await workbookIndir(wb, `${dosyaAdiTemizle(d.personelAd)} - ${dosyaAdiTemizle(d.formAd)}${ayEtiketi}.xlsx`);
}

// ── Toplu liste dışa aktarma ────────────────────────────────────────────────

function enSonTarih(d: Degerlendirme): Date | null {
  if (d.izlenmeler && d.izlenmeler.length > 0) {
    return d.izlenmeler.reduce(
      (en, iz) => (iz.tarih.toMillis() > en.getTime() ? iz.tarih.toDate() : en),
      d.izlenmeler[0].tarih.toDate()
    );
  }
  if (d.izlenmeTarihi) return d.izlenmeTarihi.toDate();
  if (d.olusturmaTarihi) return d.olusturmaTarihi.toDate();
  return null;
}

/**
 * Değerlendirmeler tablosundaki (filtrelenmiş veya seçilmiş) kayıtları,
 * tablodaki sütunlarla birebir tek bir özet Excel dosyası olarak indirir.
 */
export async function degerlendirmeListesiExcelIndir(liste: Degerlendirme[]): Promise<void> {
  const wb = new Workbook();
  wb.creator = "TGB Kamera";
  wb.created = new Date();
  const ws = wb.addWorksheet("Değerlendirmeler");

  const basliklar = [
    "Durum", "Tarih", "Personel", "Mağaza", "Form", "Tip",
    "Toplam Puan", "Max Puan", "Yüzde",
  ];
  const headerRow = ws.addRow(basliklar);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF312E81" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });

  const siraliListe = [...liste].sort((a, b) => (enSonTarih(b)?.getTime() ?? 0) - (enSonTarih(a)?.getTime() ?? 0));

  for (const d of siraliListe) {
    const tarih = enSonTarih(d);
    const yuzde = d.puanli && d.maxPuan ? Math.round(((d.toplamPuan ?? 0) / d.maxPuan) * 100) : null;
    const row = ws.addRow([
      d.durum === "acik" ? "Devam Ediyor" : "Tamamlandı",
      tarih ? tarih.toLocaleDateString("tr-TR") : "—",
      d.personelAd,
      d.magazaAd || "—",
      d.formAd,
      d.puanli ? "Puanlı" : "Puansız",
      d.puanli ? d.toplamPuan ?? "—" : "—",
      d.puanli ? d.maxPuan ?? "—" : "—",
      yuzde !== null ? `%${yuzde}` : "—",
    ]);
    if (d.durum === "acik") {
      row.getCell(1).font = { color: { argb: "FFB45309" }, bold: true };
    }
    for (let c = 7; c <= 9; c++) row.getCell(c).alignment = { horizontal: "center" };
  }

  ws.columns.forEach((col, i) => {
    col.width = [14, 12, 22, 20, 26, 10, 12, 12, 10][i] ?? 16;
  });

  const tarihEtiketi = new Date().toLocaleDateString("tr-TR").replace(/\./g, "-");
  await workbookIndir(wb, `Degerlendirmeler_${liste.length}kayit_${tarihEtiketi}.xlsx`);
}
