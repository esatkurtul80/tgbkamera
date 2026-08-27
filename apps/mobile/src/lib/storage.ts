import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

function pathSegment(s: string): string {
  return s.replace(/[\\/#?%]+/g, '-').trim() || 'bilinmiyor';
}

interface DegerlendirmeFotoKonum {
  degerlendirmeId: string;
  soruId: string;
  magazaAd: string;
  personelAd: string;
  /** İzlenme tarihi, YYYY-MM-DD */
  tarih: string;
}

/**
 * Puansız değerlendirme cevaplarına eklenen fotoğrafları Firebase Storage'a
 * Mağaza / Personel / Tarih klasör hiyerarşisiyle yükler.
 */
export async function uploadDegerlendirmeFoto(
  konum: DegerlendirmeFotoKonum,
  localUri: string,
  index: number
): Promise<string> {
  const { degerlendirmeId, soruId, magazaAd, personelAd, tarih } = konum;
  const response = await fetch(localUri);
  const blob = await response.blob();
  const path = `degerlendirmeler/${pathSegment(magazaAd)}/${pathSegment(personelAd)}/${tarih}/${soruId}/${degerlendirmeId}-${Date.now()}-${index}.jpg`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, blob);
  return getDownloadURL(storageRef);
}
