import { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useBmMagazalar } from '@/hooks/useBmMagazalar';
import { useBmRaporlar } from '@/hooks/useBmRaporlar';
import { aralikEtiketi, genelOrtalama, onAyarAraligi, personelGruplari, type TarihAraligi } from '@/lib/bmRapor';
import TarihAraligiSecici from '@/components/bm/TarihAraligiSecici';
import RaporSatiri, { PuanPill } from '@/components/bm/RaporSatiri';
import ErisimYok from '@/components/erisim-yok';
import { R } from '@/components/bm/tema';

/**
 * Bölge müdürü mağaza detayı: seçili tarih aralığında mağaza ortalaması ve personel bazlı
 * raporlar (personel satırı açılınca o personelin raporları; rapora dokununca detay).
 * Salt okunur; rapor başlatma veya personel yönetimi yok.
 */
export default function BmMagazaDetayScreen() {
  const router = useRouter();
  const { kullanici } = useAuth();
  const { id, ad } = useLocalSearchParams<{ id: string; ad?: string }>();
  const { magazalar, loading: magazaLoading, magazaIdSet } = useBmMagazalar();
  const [aralik, setAralik] = useState<TarihAraligi>(() => onAyarAraligi('buAy'));
  const [acikPersonel, setAcikPersonel] = useState<string | null>(null);

  const magaza = useMemo(() => magazalar.filter((m) => m.id === id), [magazalar, id]);
  const yetkili = kullanici?.rol === 'bolge_muduru' && (magazaLoading || magazaIdSet.has(id));
  const { raporlar, loading, refreshing, yenile } = useBmRaporlar(magaza, aralik, !magazaLoading && magaza.length > 0);

  const personeller = useMemo(() => personelGruplari(raporlar), [raporlar]);
  const magazaRaporlari = useMemo(() => raporlar.filter((d) => d.magazaRaporu), [raporlar]);
  const ort = useMemo(() => genelOrtalama(raporlar), [raporlar]);
  const kapaliSayi = raporlar.filter((d) => d.durum !== 'acik').length;

  if (!yetkili) return <ErisimYok />;

  const magazaAd = magaza[0]?.ad ?? ad ?? 'Mağaza';

  return (
    <View style={st.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 30 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={yenile} tintColor={R.vurgu} />}
      >
        <View style={st.header}>
          <TouchableOpacity style={st.geriBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Text style={st.geriText}>‹</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={st.headerTitle} numberOfLines={1}>{magazaAd}</Text>
            <Text style={st.headerSub}>{aralikEtiketi(aralik)}</Text>
          </View>
        </View>

        <TarihAraligiSecici deger={aralik} onChange={setAralik} />

        {loading || magazaLoading ? (
          <View style={st.yukleniyor}><ActivityIndicator color={R.vurgu} size="large" /></View>
        ) : (
          <>
            <View style={st.heroKart}>
              <Text style={st.heroEtiket}>Mağaza Ortalaması</Text>
              <Text style={st.heroDeger}>{ort !== null ? `%${ort}` : '—'}</Text>
              <Text style={st.heroAlt}>{kapaliSayi} tamamlanan rapor · {personeller.length} personel</Text>
            </View>

            <View style={st.bolum}>
              <Text style={st.bolumBaslik}>Personel Bazlı Raporlar</Text>
              <View style={st.kart}>
                {personeller.length === 0 ? (
                  <Text style={st.bosSatir}>Bu aralıkta personel raporu yok</Text>
                ) : (
                  personeller.map((p, i) => {
                    const acik = acikPersonel === p.personelId;
                    return (
                      <View key={p.personelId} style={i > 0 && st.grupAyrac}>
                        <TouchableOpacity
                          style={st.personelSatir}
                          activeOpacity={0.7}
                          onPress={() => setAcikPersonel(acik ? null : p.personelId)}
                        >
                          <View style={st.avatar}><Text style={st.avatarText}>{p.personelAd.charAt(0).toUpperCase()}</Text></View>
                          <View style={{ flex: 1 }}>
                            <Text style={st.personelAd}>{p.personelAd}</Text>
                            <Text style={st.personelAlt}>
                              {p.raporlar.length} rapor{p.acikSayi > 0 ? ` · ${p.acikSayi} devam eden` : ''}
                            </Text>
                          </View>
                          <PuanPill puan={p.ortalama} />
                          <Text style={[st.ok, acik && { transform: [{ rotate: '90deg' }] }]}>›</Text>
                        </TouchableOpacity>
                        {acik && (
                          <View style={st.raporListe}>
                            {p.raporlar.map((d, j) => <RaporSatiri key={d.id} rapor={d} ayrac={j > 0} />)}
                          </View>
                        )}
                      </View>
                    );
                  })
                )}
              </View>
            </View>

            {magazaRaporlari.length > 0 && (
              <View style={st.bolum}>
                <Text style={st.bolumBaslik}>Mağaza Raporları</Text>
                <View style={st.kart}>
                  {magazaRaporlari.map((d, j) => <RaporSatiri key={d.id} rapor={d} ayrac={j > 0} />)}
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: R.zemin },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18, paddingTop: 52, paddingBottom: 12 },
  geriBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: R.kart, alignItems: 'center', justifyContent: 'center' },
  geriText: { fontSize: 26, color: R.murekkep, marginTop: -3, fontWeight: '300' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: R.murekkep, letterSpacing: -0.3 },
  headerSub: { fontSize: 12.5, color: R.gri, fontWeight: '600', marginTop: 1 },
  yukleniyor: { paddingVertical: 60, alignItems: 'center' },
  heroKart: { backgroundColor: R.murekkep, borderRadius: 22, marginHorizontal: 18, marginTop: 14, padding: 20 },
  heroEtiket: { fontSize: 12, color: 'rgba(255,255,255,0.65)', fontWeight: '600' },
  heroDeger: { fontSize: 44, fontWeight: '800', color: '#fff', marginTop: 6, letterSpacing: -1 },
  heroAlt: { fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 6, fontWeight: '500' },
  bolum: { marginTop: 20, paddingHorizontal: 18 },
  bolumBaslik: { fontSize: 15, fontWeight: '800', color: R.murekkep, marginBottom: 10 },
  kart: { backgroundColor: R.kart, borderRadius: 22, overflow: 'hidden' },
  bosSatir: { fontSize: 13, color: R.soluk, textAlign: 'center', paddingVertical: 26 },
  grupAyrac: { borderTopWidth: 1, borderTopColor: R.griBg },
  personelSatir: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: R.griBg, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 13.5, fontWeight: '800', color: R.murekkep },
  personelAd: { fontSize: 14, fontWeight: '700', color: R.murekkep },
  personelAlt: { fontSize: 11.5, color: R.soluk, marginTop: 1 },
  ok: { fontSize: 20, color: '#c4cfc8', fontWeight: '300' },
  raporListe: { backgroundColor: '#f7faf8', borderTopWidth: 1, borderTopColor: R.griBg, paddingLeft: 10 },
});
