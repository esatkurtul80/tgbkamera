import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { raporPuan, raporTipi } from '@/lib/bmRapor';
import type { Degerlendirme } from '@/lib/types';
import { R, puanRenk } from './tema';

/** Puan rozeti: yüzde/puan; null ise tire. */
export function PuanPill({ puan }: { puan: number | null }) {
  if (puan === null) {
    return (
      <View style={[st.pill, { backgroundColor: R.griBg }]}>
        <Text style={[st.pillText, { color: R.soluk }]}>—</Text>
      </View>
    );
  }
  const renk = puanRenk(puan);
  return (
    <View style={[st.pill, { backgroundColor: renk.bg }]}>
      <Text style={[st.pillText, { color: renk.fg }]}>{puan}</Text>
    </View>
  );
}

const TIP_ETIKET = { matris: 'Puanlı', yorumlu: 'Yorumlu', puansiz: 'Puansız' } as const;

/**
 * Bölge müdürü listelerinde tek rapor satırı: form adı, tarih, tip rozeti, puan.
 * Dokununca rapor detayı açılır. Kameraman adı gösterilmez.
 */
export default function RaporSatiri({
  rapor, personelGoster = false, magazaGoster = false, ayrac = false,
}: {
  rapor: Degerlendirme;
  personelGoster?: boolean;
  magazaGoster?: boolean;
  ayrac?: boolean;
}) {
  const router = useRouter();
  const tip = raporTipi(rapor);
  const acik = rapor.durum === 'acik';
  const tarih = rapor.olusturmaTarihi?.toDate?.().toLocaleDateString('tr-TR') ?? '—';
  const baslik = personelGoster ? (rapor.magazaRaporu ? 'Mağaza raporu' : rapor.personelAd) : rapor.formAd;
  const altParcalar = [
    personelGoster ? rapor.formAd : null,
    magazaGoster ? rapor.magazaAd : null,
    tarih,
  ].filter(Boolean);

  return (
    <TouchableOpacity
      style={[st.satir, ayrac && st.satirAyrac]}
      activeOpacity={0.7}
      onPress={() => router.push(`/degerlendirme/${rapor.id}`)}
    >
      <View style={{ flex: 1 }}>
        <Text style={st.baslik} numberOfLines={1}>{baslik}</Text>
        <Text style={st.alt} numberOfLines={1}>{altParcalar.join(' · ')}</Text>
      </View>
      {acik ? (
        <View style={[st.tipRozet, { backgroundColor: R.amberBg }]}>
          <Text style={[st.tipText, { color: R.amber }]}>Devam ediyor</Text>
        </View>
      ) : (
        <View style={[st.tipRozet, tip === 'yorumlu' && { backgroundColor: R.morBg }]}>
          <Text style={[st.tipText, tip === 'yorumlu' && { color: R.mor }]}>{TIP_ETIKET[tip]}</Text>
        </View>
      )}
      {!acik && tip !== 'puansiz' && <PuanPill puan={raporPuan(rapor)} />}
      <Text style={st.ok}>›</Text>
    </TouchableOpacity>
  );
}

const st = StyleSheet.create({
  satir: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 11 },
  satirAyrac: { borderTopWidth: 1, borderTopColor: R.griBg },
  baslik: { fontSize: 13.5, fontWeight: '700', color: R.murekkep },
  alt: { fontSize: 11.5, color: R.soluk, marginTop: 1 },
  tipRozet: { backgroundColor: R.griBg, borderRadius: 9, paddingHorizontal: 7, paddingVertical: 3 },
  tipText: { fontSize: 10, fontWeight: '800', color: R.gri },
  pill: { borderRadius: 11, paddingHorizontal: 9, paddingVertical: 4, minWidth: 40, alignItems: 'center' },
  pillText: { fontSize: 11.5, fontWeight: '800' },
  ok: { fontSize: 18, color: '#c4cfc8', fontWeight: '300' },
});
