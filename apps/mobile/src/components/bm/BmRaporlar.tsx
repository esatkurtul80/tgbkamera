import { useEffect, useMemo, useState } from 'react';
import { View, Text, SectionList, StyleSheet, TouchableOpacity, TextInput, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useBmMagazalar } from '@/hooks/useBmMagazalar';
import { useBmRaporlar } from '@/hooks/useBmRaporlar';
import { aralikEtiketi, magazaGruplari, onAyarAraligi, raporTipi, type RaporTipi, type TarihAraligi } from '@/lib/bmRapor';
import type { Degerlendirme } from '@/lib/types';
import TarihAraligiSecici from './TarihAraligiSecici';
import RaporSatiri, { PuanPill } from './RaporSatiri';
import { R } from './tema';

const TIP_SECENEK: { id?: RaporTipi; ad: string }[] = [
  { id: undefined, ad: 'Tümü' },
  { id: 'matris', ad: 'Puanlı' },
  { id: 'yorumlu', ad: 'Yorumlu' },
  { id: 'puansiz', ad: 'Puansız' },
];

/**
 * Bölge müdürü "Raporlar": kendi mağazalarının tüm raporları mağaza mağaza gruplanmış,
 * tarih aralığı + mağaza çipi + tip + personel/form araması ile süzülür.
 * Panelden personel seçilerek gelindiğinde ?personelId ile o personel filtrelenir.
 */
export default function BmRaporlar() {
  const params = useLocalSearchParams<{ personelId?: string; magazaId?: string; t?: string }>();
  const { magazalar, loading: magazaLoading, magazaYok } = useBmMagazalar();
  const [aralik, setAralik] = useState<TarihAraligi>(() => onAyarAraligi('buAy'));
  const [magazaId, setMagazaId] = useState<string | undefined>(undefined);
  const [personelId, setPersonelId] = useState<string | undefined>(undefined);
  const [tip, setTip] = useState<RaporTipi | undefined>(undefined);
  const [arama, setArama] = useState('');
  const { raporlar, loading, refreshing, yenile } = useBmRaporlar(magazalar, aralik, !magazaLoading && !magazaYok);

  // Panelden gelen hedef filtre (t her seferinde değişir ki aynı personel yeniden seçilebilsin)
  useEffect(() => {
    if (params.personelId) setPersonelId(params.personelId);
    if (params.magazaId) setMagazaId(params.magazaId);
  }, [params.personelId, params.magazaId, params.t]);

  const personelAd = useMemo(
    () => (personelId ? raporlar.find((d) => d.personelId === personelId)?.personelAd ?? 'Personel' : null),
    [personelId, raporlar]
  );

  const suzulmus = useMemo(() => {
    const q = arama.trim().toLowerCase();
    return raporlar.filter((d) => {
      if (magazaId && d.magazaId !== magazaId) return false;
      if (personelId && d.personelId !== personelId) return false;
      if (tip && raporTipi(d) !== tip) return false;
      if (q && !d.personelAd.toLowerCase().includes(q) && !d.formAd.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [raporlar, magazaId, personelId, tip, arama]);

  const bolumler = useMemo(
    () =>
      magazaGruplari(magazalar, suzulmus)
        .filter((g) => g.raporlar.length > 0)
        .map((g) => ({ title: g.magaza.ad, ortalama: g.ortalama, data: g.raporlar })),
    [magazalar, suzulmus]
  );

  return (
    <View style={st.container}>
      <View style={st.header}>
        <Text style={st.headerTitle}>Raporlar</Text>
        <Text style={st.headerSub}>{suzulmus.length} rapor · {aralikEtiketi(aralik)}</Text>
      </View>
      <TarihAraligiSecici deger={aralik} onChange={setAralik} />

      {/* Mağaza çipleri */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.cipler} style={{ marginTop: 8, flexGrow: 0 }}>
        <TouchableOpacity style={[st.cip, !magazaId && st.cipAktif]} activeOpacity={0.75} onPress={() => setMagazaId(undefined)}>
          <Text style={[st.cipText, !magazaId && st.cipTextAktif]}>Tüm Mağazalar</Text>
        </TouchableOpacity>
        {magazalar.map((m) => {
          const aktif = magazaId === m.id;
          return (
            <TouchableOpacity key={m.id} style={[st.cip, aktif && st.cipAktif]} activeOpacity={0.75} onPress={() => setMagazaId(aktif ? undefined : m.id)}>
              <Text style={[st.cipText, aktif && st.cipTextAktif]}>{m.ad}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Tip segmenti + arama */}
      <View style={st.aracSatir}>
        <View style={st.segment}>
          {TIP_SECENEK.map((s) => {
            const aktif = tip === s.id;
            return (
              <TouchableOpacity key={s.ad} style={[st.segmentBtn, aktif && st.segmentBtnAktif]} activeOpacity={0.7} onPress={() => setTip(s.id)}>
                <Text style={[st.segmentText, aktif && st.segmentTextAktif]}>{s.ad}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      <View style={st.aramaKutu}>
        <Text style={st.aramaIkon}>⌕</Text>
        <TextInput
          style={st.aramaInput}
          placeholder="Personel veya form ara..."
          placeholderTextColor={R.soluk}
          value={arama}
          onChangeText={setArama}
          autoCorrect={false}
        />
      </View>
      {personelAd && (
        <View style={st.aktifCipSatir}>
          <TouchableOpacity style={st.aktifCip} activeOpacity={0.75} onPress={() => setPersonelId(undefined)}>
            <Text style={st.aktifCipText}>Personel: {personelAd}  ✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {magazaYok ? (
        <View style={st.empty}><Text style={st.emptyIcon}>🏬</Text><Text style={st.emptyTitle}>Hesabınıza mağaza atanmamış</Text></View>
      ) : loading || magazaLoading ? (
        <View style={st.empty}><ActivityIndicator color={R.vurgu} size="large" /></View>
      ) : (
        <SectionList
          sections={bolumler}
          keyExtractor={(d: Degerlendirme) => d.id}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 10, paddingBottom: 24 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={yenile} tintColor={R.vurgu} />}
          renderSectionHeader={({ section }) => (
            <View style={st.bolumBaslik}>
              <Text style={st.bolumAd}>🏬 {section.title}</Text>
              <Text style={st.bolumSayi}>{section.data.length} rapor</Text>
              <PuanPill puan={section.ortalama} />
            </View>
          )}
          renderItem={({ item, index, section }) => (
            <View style={[st.satirKap, index === 0 && st.satirKapIlk, index === section.data.length - 1 && st.satirKapSon]}>
              <RaporSatiri rapor={item} personelGoster ayrac={index > 0} />
            </View>
          )}
          renderSectionFooter={() => <View style={{ height: 14 }} />}
          ListEmptyComponent={
            <View style={st.empty}>
              <Text style={st.emptyIcon}>🔍</Text>
              <Text style={st.emptyTitle}>Bu aralıkta filtreye uyan rapor yok</Text>
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
  cipler: { paddingHorizontal: 18, gap: 8 },
  cip: { backgroundColor: R.kart, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1.5, borderColor: 'transparent' },
  cipAktif: { borderColor: R.vurgu, backgroundColor: '#fff3f0' },
  cipText: { fontSize: 12.5, fontWeight: '700', color: R.gri },
  cipTextAktif: { color: R.vurgu },
  aracSatir: { paddingHorizontal: 18, marginTop: 10 },
  segment: { flexDirection: 'row', backgroundColor: '#e2e8e4', borderRadius: 12, padding: 3, gap: 3 },
  segmentBtn: { flex: 1, borderRadius: 9, paddingVertical: 7, alignItems: 'center' },
  segmentBtnAktif: { backgroundColor: '#fff' },
  segmentText: { fontSize: 12, fontWeight: '600', color: R.gri },
  segmentTextAktif: { color: R.murekkep, fontWeight: '800' },
  aramaKutu: { flexDirection: 'row', alignItems: 'center', backgroundColor: R.kart, borderRadius: 18, marginHorizontal: 18, marginTop: 8, paddingHorizontal: 14, height: 42, gap: 8 },
  aramaIkon: { fontSize: 16, color: R.soluk },
  aramaInput: { flex: 1, fontSize: 14, color: R.murekkep },
  aktifCipSatir: { flexDirection: 'row', paddingHorizontal: 18, marginTop: 8 },
  aktifCip: { backgroundColor: R.murekkep, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 },
  aktifCipText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  bolumBaslik: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4, paddingBottom: 6 },
  bolumAd: { flex: 1, fontSize: 14, fontWeight: '800', color: R.murekkep },
  bolumSayi: { fontSize: 11.5, color: R.soluk, fontWeight: '600' },
  satirKap: { backgroundColor: R.kart },
  satirKapIlk: { borderTopLeftRadius: 18, borderTopRightRadius: 18 },
  satirKapSon: { borderBottomLeftRadius: 18, borderBottomRightRadius: 18 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 50, gap: 10 },
  emptyIcon: { fontSize: 40 },
  emptyTitle: { fontSize: 14, color: R.gri, textAlign: 'center' },
});
