import { useMemo, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useBmMagazalar } from '@/hooks/useBmMagazalar';
import { useBmRaporlar } from '@/hooks/useBmRaporlar';
import { aralikEtiketi, magazaGruplari, onAyarAraligi, type TarihAraligi } from '@/lib/bmRapor';
import TarihAraligiSecici from './TarihAraligiSecici';
import { PuanPill } from './RaporSatiri';
import { R } from './tema';

/** Bölge müdürü "Mağazalarım": atanmış mağazalar, seçili aralıkta rapor sayısı ve ortalama. */
export default function BmMagazalar() {
  const router = useRouter();
  const { magazalar, loading: magazaLoading, magazaYok } = useBmMagazalar();
  const [aralik, setAralik] = useState<TarihAraligi>(() => onAyarAraligi('buAy'));
  const [arama, setArama] = useState('');
  const { raporlar, loading, refreshing, yenile } = useBmRaporlar(magazalar, aralik, !magazaLoading && !magazaYok);

  const gruplar = useMemo(() => {
    const hepsi = magazaGruplari(magazalar, raporlar);
    const q = arama.trim().toLowerCase();
    return q ? hepsi.filter((g) => g.magaza.ad.toLowerCase().includes(q) || (g.magaza.adres ?? '').toLowerCase().includes(q)) : hepsi;
  }, [magazalar, raporlar, arama]);

  return (
    <View style={st.container}>
      <View style={st.header}>
        <Text style={st.headerTitle}>Mağazalarım</Text>
        <Text style={st.headerSub}>{magazalar.length} mağaza · {aralikEtiketi(aralik)}</Text>
      </View>
      <TarihAraligiSecici deger={aralik} onChange={setAralik} />
      <View style={st.aramaKutu}>
        <Text style={st.aramaIkon}>⌕</Text>
        <TextInput
          style={st.aramaInput}
          placeholder="Mağaza ara..."
          placeholderTextColor={R.soluk}
          value={arama}
          onChangeText={setArama}
          autoCorrect={false}
        />
      </View>

      {magazaYok ? (
        <View style={st.empty}>
          <Text style={st.emptyIcon}>🏬</Text>
          <Text style={st.emptyTitle}>Hesabınıza mağaza atanmamış</Text>
        </View>
      ) : loading || magazaLoading ? (
        <View style={st.empty}><ActivityIndicator color={R.vurgu} size="large" /></View>
      ) : (
        <FlatList
          data={gruplar}
          keyExtractor={(g) => g.magaza.id}
          contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 12, paddingBottom: 24, gap: 10 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={yenile} tintColor={R.vurgu} />}
          renderItem={({ item: g }) => (
            <TouchableOpacity
              style={st.kart}
              activeOpacity={0.75}
              onPress={() => router.push({ pathname: '/bm/magaza/[id]', params: { id: g.magaza.id, ad: g.magaza.ad } })}
            >
              <View style={st.kartUst}>
                <View style={st.ikon}><Text style={{ fontSize: 17 }}>🏬</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={st.ad}>{g.magaza.ad}</Text>
                  {g.magaza.adres ? <Text style={st.adres} numberOfLines={1}>{g.magaza.adres}</Text> : null}
                </View>
                <PuanPill puan={g.ortalama} />
              </View>
              <View style={st.istatSatir}>
                <View style={st.istat}><Text style={st.istatDeger}>{g.raporlar.length}</Text><Text style={st.istatEtiket}>rapor</Text></View>
                <View style={st.istat}><Text style={st.istatDeger}>{g.personelSayisi}</Text><Text style={st.istatEtiket}>personel</Text></View>
                <View style={st.istat}>
                  <Text style={[st.istatDeger, g.acikSayi > 0 && { color: R.amber }]}>{g.acikSayi}</Text>
                  <Text style={st.istatEtiket}>devam eden</Text>
                </View>
                <Text style={st.ok}>›</Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={st.empty}>
              <Text style={st.emptyIcon}>🔍</Text>
              <Text style={st.emptyTitle}>Eşleşen mağaza yok</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: R.zemin },
  header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: R.murekkep, letterSpacing: -0.4 },
  headerSub: { fontSize: 13, color: R.gri, marginTop: 3, fontWeight: '600' },
  aramaKutu: { flexDirection: 'row', alignItems: 'center', backgroundColor: R.kart, borderRadius: 18, marginHorizontal: 18, marginTop: 10, paddingHorizontal: 14, height: 44, gap: 8 },
  aramaIkon: { fontSize: 16, color: R.soluk },
  aramaInput: { flex: 1, fontSize: 14, color: R.murekkep },
  kart: { backgroundColor: R.kart, borderRadius: 22, padding: 14 },
  kartUst: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  ikon: { width: 40, height: 40, borderRadius: 20, backgroundColor: R.griBg, alignItems: 'center', justifyContent: 'center' },
  ad: { fontSize: 15, fontWeight: '800', color: R.murekkep },
  adres: { fontSize: 11.5, color: R.soluk, marginTop: 1 },
  istatSatir: { flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: R.griBg },
  istat: { flex: 1, flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  istatDeger: { fontSize: 15, fontWeight: '800', color: R.murekkep },
  istatEtiket: { fontSize: 11, color: R.soluk, fontWeight: '600' },
  ok: { fontSize: 20, color: '#c4cfc8', fontWeight: '300' },
  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 10 },
  emptyIcon: { fontSize: 40 },
  emptyTitle: { fontSize: 14, color: R.gri, textAlign: 'center' },
});
