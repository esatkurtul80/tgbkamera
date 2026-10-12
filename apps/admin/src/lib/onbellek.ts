/**
 * Önce önbellek, sonra sunucu: Firestore kalıcı önbelleğinde veri varsa hemen `onSonuc` ile
 * verilir (ekran anında dolar), ardından sunucu cevabı gelince aynı geri çağrı güncel veriyle
 * tekrar çağrılır. Önbellek boşsa yalnız sunucu sonucu iletilir.
 * `iptal()` true dönerse (bileşen kapandı / parametre değişti) geri çağrı yapılmaz.
 * Döndürdüğü promise sunucu cevabı ile çözülür; sunucu hatası fırlatılır, önbellek hatası yutulur.
 */
export async function onbellekSonraSunucu<T>(
  onbellekten: () => Promise<T>,
  sunucudan: () => Promise<T>,
  onSonuc: (veri: T, kaynak: "onbellek" | "sunucu") => void,
  iptal: () => boolean,
  bosMu: (veri: T) => boolean = (v) => Array.isArray(v) && v.length === 0
): Promise<void> {
  let sunucuGeldi = false;
  const sunucu = sunucudan().then((veri) => {
    sunucuGeldi = true;
    if (!iptal()) onSonuc(veri, "sunucu");
  });
  try {
    const veri = await onbellekten();
    // Sunucu daha hızlı geldiyse eski önbellek sonucunu üstüne yazma
    if (!sunucuGeldi && !iptal() && !bosMu(veri)) onSonuc(veri, "onbellek");
  } catch {
    // önbellek yok/boş: sessizce geç
  }
  await sunucu;
}
