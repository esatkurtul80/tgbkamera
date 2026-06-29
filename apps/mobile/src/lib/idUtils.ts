/**
 * Firestore belgelerine okunabilir özel ID üretir.
 * Format: ISIM-XXX-DDMMYYYY
 * Örnek:  AHMETYILMAZ-BF3-09062026
 */

const TR_MAP: Record<string, string> = {
  ğ: "G", Ğ: "G",
  ü: "U", Ü: "U",
  ş: "S", Ş: "S",
  ı: "I", İ: "I",
  ö: "O", Ö: "O",
  ç: "C", Ç: "C",
};

function normalizeName(name: string): string {
  return name
    .split("")
    .map((ch) => TR_MAP[ch] ?? ch)
    .join("")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .substring(0, 12);
}

function generateShortId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length: 3 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

function getDateStr(): string {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}${month}${year}`;
}

export function generateCustomId(name: string): string {
  const firstWord = name.trim().split(/\s+/)[0] ?? name;
  const namePart = normalizeName(firstWord) || "KAYIT";
  return `${namePart}-${generateShortId()}-${getDateStr()}`;
}
