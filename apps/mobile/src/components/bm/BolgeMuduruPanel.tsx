import { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useBmMagazalar } from '@/hooks/useBmMagazalar';
import { useBmRaporlar } from '@/hooks/useBmRaporlar';
import { aralikEtiketi, genelOrtalama, magazaGruplari, onAyarAraligi, personelGruplari, type TarihAraligi } from '@/lib/bmRapor';
import TarihAraligiSecici from './TarihAraligiSecici';
import { PuanPill } from './RaporSatiri';
import { R } from './tema';

/**
 * Bölge müdürü ana paneli — yalnız kendi mağazaları: seçili tarih aralığında bölge ortalaması,
 * mağaza mağaza özet ve personel puanları. Admin verileri (formlar, kullanıcılar vb.) yok.
 */
export default function BolgeMuduruPanel() {
  const router = useRouter();
  const { kullanici } = useAuth();
  const { magazalar, loading: magazaLoading, magazaYok } = useBmMagazalar();
  const [aralik, setAralik] = useState<TarihAraligi>(() => onAyarAraligi('buAy'));
  const { raporlar, loading, refreshing, yenile } = useBmRaporlar(magazalar, aralik, !magazaLoading && !magazaYok);
  const [tumPersonel, setTumPersonel] = useState(false);

  const magazaOzet = useMemo(() => magazaGruplari(magazalar, raporlar), [magazalar, raporlar]);
  const personeller = useMemo(() => personelGruplari(raporlar), [raporlar]);
  const ort = useMemo(() => genelOrtalama(raporlar), [raporlar]);
  const kapaliSayi = raporlar.filter((d) => d.durum !== 'acik').length;
  const acikSayi = raporlar.length - kapaliSayi;
  const gorunenPersonel = tumPersonel ? personeller : personeller.slice(0, 8);
  const ad = kullanici?.displayName ?? 'Bölge Müdürü';

  if (magazaYok) {
    return (
      <View style={st.center}>
        <Text style={{ fontSize: 40, marginBottom: 12 }}>🏬</Text>
        <Text style={st.bosBaslik}>Hesabınıza mağaza atanmamış</Text>
        <Text style={st.bosAlt}>Yöneticiniz web panelindeki Mağazalar sayfasından atama yaptığında burada görünecek.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={st.container}
      contentContainerStyle={{ paddingBottom: 28 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={yenile} tintColor={R.vurgu} />}
    >
      <View style={st.header}>
        <View style={st.profilPill}>
          <View style={st.profilAvatar}>
            <Text style={st.profilAvatarText}>{ad.charAt(0).toUpperCase()}</Text>
          </View>
          <View>
            <Text style={st.profilSelam}>Bölge Müdürü</Text>
            <Text style={st.profilAd}>{ad}</Text>
          </View>
        </View>
      </View>

      <Text style={st.baslik}>Bölgem</Text>
      <Text style={st.altBaslik}>{magazalar.length} mağaza · {aralikEtiketi(aralik)}</Text>

      <View style={{ marginTop: 14 }}>
        <TarihAraligiSecici deger={aralik} onChange={setAralik} />
      </View>

      {loading || magazaLoading ? (
        <View style={st.yukleniyor}><ActivityIndicator color={R.vurgu} size="large" /></View>
      ) : (
        <>
          <View style={st.heroKart}>
            <Text style={st.heroEtiket}>Bölge Ortalaması</Text>
            <Text style={st.heroDeger}>{ort !== null ? String(ort) : '—'}</Text>
            <Text style={st.heroAlt}>
              {kapaliSayi} tamamlanan rapor{acikSayi > 0 ? ` · ${acikSayi} devam eden` : ''} · {personeller.length} personel
            </Text>
          </View>

          <View style={st.bolum}>
            <View style={st.bolumBaslikSatiri}>
              <Text style={st.bolumBaslik}>Mağazalar</Text>
              <TouchableOpacity onPress={() => router.replace('/magazalar')}>
                <Text style={st.bolumLink}>Tümünü Gör →</Text>
              </TouchableOpacity>
            </View>
            <View style={st.kart}>
              {magazaOzet.map((m, i) => (
                <TouchableOpacity
                  key={m.magaza.id}
                  style={[st.satir, i > 0 && st.satirAyrac]}
                  activeOpacity={0.7}
                  onPress={() => router.push({ pathname: '/bm/magaza/[id]', params: { id: m.magaza.id, ad: m.magaza.ad } })}
                >
                  <View style={st.satirIkon}><Text style={{ fontSize: 15 }}>🏬</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={st.satirAd}>{m.magaza.ad}</Text>
                    <Text style={st.satirAlt}>
                      {m.raporlar.length} rapor · {m.personelSayisi} personel{m.acikSayi > 0 ? ` · ${m.acikSayi} devam eden` : ''}
                    </Text>
                  </View>
                  <PuanPill puan={m.ortalama} />
                  <Text style={st.ok}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={st.bolum}>
            <View style={st.bolumBaslikSatiri}>
              <Text style={st.bolumBaslik}>Personel Puanları</Text>
              <TouchableOpacity onPress={() => router.replace('/tumu')}>
                <Text style={st.bolumLink}>Raporlar →</Text>
              </TouchableOpacity>
            </View>
            <View style={st.kart}>
              {personeller.length === 0 ? (
                <Text style={st.bosSatir}>Bu aralıkta raporlanmış personel yok</Text>
              ) : (
                <>
                  {gorunenPersonel.map((p, i) => (
                    <TouchableOpacity
                      key={p.personelId}
                      style={[st.satir, i > 0 && st.satirAyrac]}
                      activeOpacity={0.7}
                      onPress={() => router.replace({ pathname: '/(tabs)/tumu', params: { personelId: p.personelId, t: String(Date.now()) } })}
                    >
                      <View style={st.avatar}><Text style={st.avatarText}>{p.personelAd.charAt(0).toUpperCase()}</Text></View>
                      <View style={{ flex: 1 }}>
                        <Text style={st.satirAd}>{p.personelAd}</Text>
                        <Text style={st.satirAlt} numberOfLines={1}>
                          {[...new Set(p.raporlar.map((d) => d.magazaAd))].join(', ')} · {p.raporlar.length} rapor
                        </Text>
                      </View>
                      <PuanPill puan={p.ortalama} />
                      <Text style={st.ok}>›</Text>
                    </TouchableOpacity>
                  ))}
                  {personeller.length > 8 && (
                    <TouchableOpacity style={st.dahaSatir} onPress={() => setTumPersonel((v) => !v)} activeOpacity={0.7}>
                      <Text style={st.dahaText}>{tumPersonel ? 'Daha az göster' : `Tümünü göster (${personeller.length})`}</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
            <Text style={st.dipNot}>Ortalamalar tamamlanmış puanlı raporlardan hesaplanır; yorumlu puanlar listede görünür, ortalamaya girmez.</Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: R.zemin },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: R.zemin, padding: 30 },
  yukleniyor: { paddingVertical: 60, alignItems: 'center' },
  bosBaslik: { fontSize: 16, fontWeight: '800', color: R.murekkep },
  bosAlt: { fontSize: 13, color: R.gri, marginTop: 6, textAlign: 'center', lineHeight: 19 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingTop: 54, paddingBottom: 18 },
  profilPill: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: R.kart, borderRadius: 30, paddingLeft: 6, paddingRight: 16, paddingVertical: 6 },
  profilAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: R.murekkep, alignItems: 'center', justifyContent: 'center' },
  profilAvatarText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  profilSelam: { fontSize: 10.5, color: R.soluk, fontWeight: '600' },
  profilAd: { fontSize: 13.5, fontWeight: '800', color: R.murekkep, marginTop: 1 },
  baslik: { fontSize: 26, lineHeight: 33, fontWeight: '800', color: R.murekkep, paddingHorizontal: 20, letterSpacing: -0.4 },
  altBaslik: { fontSize: 13, color: R.gri, fontWeight: '600', paddingHorizontal: 20, marginTop: 2 },
  heroKart: { backgroundColor: R.murekkep, borderRadius: 22, marginHorizontal: 18, marginTop: 16, padding: 20 },
  heroEtiket: { fontSize: 12, color: 'rgba(255,255,255,0.65)', fontWeight: '600' },
  heroDeger: { fontSize: 44, fontWeight: '800', color: '#fff', marginTop: 6, letterSpacing: -1 },
  heroAlt: { fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 6, fontWeight: '500' },
  bolum: { marginTop: 22, paddingHorizontal: 18 },
  bolumBaslikSatiri: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  bolumBaslik: { fontSize: 15, fontWeight: '800', color: R.murekkep },
  bolumLink: { fontSize: 12, fontWeight: '700', color: R.gri },
  kart: { backgroundColor: R.kart, borderRadius: 22, overflow: 'hidden' },
  bosSatir: { fontSize: 13, color: R.soluk, textAlign: 'center', paddingVertical: 26 },
  satir: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  satirAyrac: { borderTopWidth: 1, borderTopColor: R.griBg },
  satirIkon: { width: 38, height: 38, borderRadius: 19, backgroundColor: R.griBg, alignItems: 'center', justifyContent: 'center' },
  satirAd: { fontSize: 14, fontWeight: '700', color: R.murekkep },
  satirAlt: { fontSize: 11.5, color: R.soluk, marginTop: 1 },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: R.griBg, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 13.5, fontWeight: '800', color: R.murekkep },
  ok: { fontSize: 20, color: '#c4cfc8', fontWeight: '300' },
  dahaSatir: { borderTopWidth: 1, borderTopColor: R.griBg, paddingVertical: 12, alignItems: 'center' },
  dahaText: { fontSize: 13, fontWeight: '700', color: R.gri },
  dipNot: { fontSize: 11, color: R.soluk, marginTop: 8, paddingHorizontal: 4, lineHeight: 15 },
});
