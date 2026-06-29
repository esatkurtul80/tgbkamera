/**
 * Firestore belgelerine okunabilir özel ID üretir.
 * Format: ISIM-XXX-DDMMYYYY
 * Örnek:  MARMARA-AQ9-09062026
 */

const TR_MAP: Record<string, string> = {
  ğ: "G", Ğ: "G",
  ü: "U", Ü: "U",
  ş: "S", Ş: "S",
  ı: "I", İ: "I",
  ö: "O", Ö: "O",
  ç: "C", Ç: "C",
};

/** Türkçe karakterleri dönüştür, sadece A-Z 0-9 bırak, max 12 karakter */
function normalizeName(name: string): string {
  return name
    .split("")
    .map((ch) => TR_MAP[ch] ?? ch)
    .join("")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .substring(0, 12);
}

/** 3 haneli rastgele alfanumerik (A-Z, 0-9) */
function generateShortId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length: 3 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

/** Bugünün tarihi DDMMYYYY formatında */
function getDateStr(): string {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}${month}${year}`;
}

/**
 * Okunabilir Firestore belge ID'si üretir.
 * @param name  Kaydın adı/başlığı (örn. bölge adı, personel adı…)
 * @returns     "ISIM-XXX-DDMMYYYY" formatında string
 */
export function generateCustomId(name: string): string {
  // İlk kelimeyi al (boşluk yoksa tüm ismi kullan)
  const firstWord = name.trim().split(/\s+/)[0] ?? name;
  const namePart = normalizeName(firstWord) || "KAYIT";
  return `${namePart}-${generateShortId()}-${getDateStr()}`;
}
