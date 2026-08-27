import { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useBmBolge } from '@/hooks/useBmBolge';
import { getDegerlendirmelerByMagazaIds } from '@/lib/firestore';
import { bolgeOzetHesapla, type BolgeOzet } from '@/lib/bolgeOzet';
import type { Degerlendirme } from '@/lib/types';

/* Tasarım dili (tabs/index.tsx ile aynı tokenlar): adaçayı zemin, beyaz r22 kartlar,
 * mürekkep vurgu kartı, pastel puan rozetleri. */
const R = {
  zemin: '#edf2ee',
  kart: '#ffffff',
  murekkep: '#15201b',
  gri: '#77857e',
  soluk: '#a4b1aa',
  vurgu: '#e85a43',
  yesilBg: '#ddf2e2',
  yesil: '#1e7f4a',
  amberBg: '#fbeed3',
  amber: '#a8721c',
  kirmiziBg: '#fadfd8',
  kirmizi: '#b23c28',
  griBg: '#eef2ef',
};

function puanRozet(yuzde: number) {
  if (yuzde >= 80) return { bg: R.yesilBg, fg: R.yesil };
  if (yuzde >= 50) return { bg: R.amberBg, fg: R.amber };
  return { bg: R.kirmiziBg, fg: R.kirmizi };
}

function YuzdePill({ yuzde }: { yuzde: number | null }) {
  if (yuzde === null) {
    return (
      <View style={[st.pill, { backgroundColor: R.griBg }]}>
        <Text style={[st.pillText, { color: R.soluk }]}>—</Text>
      </View>
    );
  }
  const rozet = puanRozet(yuzde);
  return (
    <View style={[st.pill, { backgroundColor: rozet.bg }]}>
      <Text style={[st.pillText, { color: rozet.fg }]}>%{yuzde}</Text>
    </View>
  );
}

/** Bölge müdürü ana paneli — salt okunur bölge özeti. */
export default function BolgeMuduruPanel() {
  const router = useRouter();
  const { kullanici } = useAuth();
  const { bolge, magazalar, loading: bolgeLoading, bolgeYok } = useBmBolge();
  const [raporlar, setRaporlar] = useState<Degerlendirme[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [formSekme, setFormSekme] = useState<'puanli' | 'puansiz'>('puanli');
  const [tumPersonel, setTumPersonel] = useState(false);

  const load = useCallback(async () => {
    if (bolgeLoading || bolgeYok) return;
    try {
      setRaporlar(await getDegerlendirmelerByMagazaIds(magazalar.map((m) => m.id)));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [bolgeLoading, bolgeYok, magazalar]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const ozet: BolgeOzet = useMemo(() => bolgeOzetHesapla(magazalar, raporlar), [magazalar, raporlar]);
  const ad = kullanici?.displayName?.split(' ')[0] ?? 'Bölge Müdürü';
  const gorunenPersonel = tumPersonel ? ozet.personeller : ozet.personeller.slice(0, 10);
  const formlar = formSekme === 'puanli' ? ozet.puanliFormlar : ozet.puansizFormlar;

  if (bolgeYok) {
    return (
      <View style={st.center}>
        <Text style={{ fontSize: 40, marginBottom: 12 }}>🗺️</Text>
        <Text style={st.bosBaslik}>Hesabınıza bölge atanmamış</Text>
        <Text style={st.bosAlt}>Lütfen yöneticinizle iletişime geçin.</Text>
      </View>
    );
  }

  if (loading || bolgeLoading) {
    return (
      <View style={st.center}>
        <ActivityIndicator color={R.vurgu} size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={st.container}
      contentContainerStyle={{ paddingBottom: 28 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={R.vurgu} />}
    >
      {/* Üst satır */}
      <View style={st.header}>
        <View style={st.profilPill}>
          <View style={st.profilAvatar}>
            <Text style={st.profilAvatarText}>{ad.charAt(0).toUpperCase()}</Text>
          </View>
          <View>
            <Text style={st.profilSelam}>Bölge Müdürü Paneli</Text>
            <Text style={st.profilAd}>{kullanici?.displayName ?? ad}</Text>
          </View>
        </View>
      </View>

      {/* Bölge adı başlık */}
      <Text style={st.baslik}>{bolge?.ad ?? 'Bölgem'}</Text>
      {ozet.acikRapor > 0 && (
        <Text style={st.acikNot}>{ozet.acikRapor} devam eden rapor (istatistiklere dahil değil)</Text>
      )}

      {/* Mürekkep hero kart: bölge ortalaması */}
      <View style={st.heroKart}>
        <Text style={st.heroEtiket}>Bölge Ortalaması</Text>
        <Text style={st.heroDeger}>
          {ozet.bolgeOrtalama !== null ? `%${ozet.bolgeOrtalama}` : '—'}
        </Text>
        <Text style={st.heroAlt}>
          bu ay {ozet.buAyRapor} rapor · toplam {ozet.toplamRapor} kapalı rapor
        </Text>
      </View>

      {/* Mini statlar */}
      <View style={st.statSatir}>
        <View style={st.statKart}>
          <Text style={st.statDeger}>{magazalar.length}</Text>
          <Text style={st.statEtiket}>Mağaza</Text>
        </View>
        <View style={st.statKart}>
          <Text style={st.statDeger}>{ozet.buAyRapor}</Text>
          <Text style={st.statEtiket}>Bu Ay</Text>
        </View>
        <View style={st.statKart}>
          <Text style={st.statDeger}>{ozet.magazalar.reduce((t, m) => t + m.puansizRapor, 0)}</Text>
          <Text style={st.statEtiket}>Puansız</Text>
        </View>
      </View>

      {/* Mağazalar */}
      <View style={st.bolum}>
        <View style={st.bolumBaslikSatiri}>
          <Text style={st.bolumBaslik}>Mağazalar</Text>
          <TouchableOpacity onPress={() => router.replace('/magazalar')}>
            <Text style={st.bolumLink}>Tümünü Gör →</Text>
          </TouchableOpacity>
        </View>
        <View style={st.kart}>
          {ozet.magazalar.length === 0 ? (
            <Text style={st.bosSatir}>Bu bölgede mağaza yok</Text>
          ) : (
            ozet.magazalar.map((m, i) => (
              <TouchableOpacity
                key={m.magaza.id}
                style={[st.satir, i > 0 && st.satirAyrac]}
                activeOpacity={0.7}
                onPress={() =>
                  // Raporlar sekmesini bu mağazanın filtresiyle aç
                  router.replace({
                    pathname: '/(tabs)/tumu',
                    params: { magazaId: m.magaza.id, t: String(Date.now()) },
                  })
                }
              >
                <View style={st.satirIkon}>
                  <Text style={{ fontSize: 15 }}>🏬</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={st.satirAd}>{m.magaza.ad}</Text>
                  <Text style={st.satirAlt}>
                    {m.toplamRapor} rapor · {m.puanliRapor} puanlı · {m.puansizRapor} puansız
                  </Text>
                </View>
                <YuzdePill yuzde={m.puanliOrtalama} />
                <Text style={st.ok}>›</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      </View>

      {/* Personel puanları */}
      <View style={st.bolum}>
        <Text style={st.bolumBaslik}>Personel Puanları</Text>
        <View style={[st.kart, { marginTop: 10 }]}>
          {ozet.personeller.length === 0 ? (
            <Text style={st.bosSatir}>Henüz raporlanmış personel yok</Text>
          ) : (
            <>
              {gorunenPersonel.map((p, i) => (
                <TouchableOpacity
                  key={p.personelId}
                  style={[st.satir, i > 0 && st.satirAyrac]}
                  activeOpacity={0.7}
                  onPress={() =>
                    // Raporlar sekmesini bu personelin filtresiyle aç
                    router.replace({
                      pathname: '/(tabs)/tumu',
                      params: { personelId: p.personelId, t: String(Date.now()) },
                    })
                  }
                >
                  <View style={st.avatar}>
                    <Text style={st.avatarText}>{p.personelAd.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={st.satirAd}>{p.personelAd}</Text>
                    <Text style={st.satirAlt} numberOfLines={1}>
                      {p.magazaAdlari.join(', ') || '—'} · {p.toplamRapor} rapor
                    </Text>
                  </View>
                  <YuzdePill yuzde={p.puanliOrtalama} />
                  <Text style={st.ok}>›</Text>
                </TouchableOpacity>
              ))}
              {ozet.personeller.length > 10 && (
                <TouchableOpacity style={st.dahaSatir} onPress={() => setTumPersonel((v) => !v)} activeOpacity={0.7}>
                  <Text style={st.dahaText}>
                    {tumPersonel ? 'Daha az göster' : `Tümünü göster (${ozet.personeller.length})`}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>

      {/* Form türleri */}
      <View style={st.bolum}>
        <View style={st.bolumBaslikSatiri}>
          <Text style={st.bolumBaslik}>Form Türleri</Text>
          <View style={st.segment}>
            {(['puanli', 'puansiz'] as const).map((s) => (
              <TouchableOpacity
                key={s}
                style={[st.segmentBtn, formSekme === s && st.segmentBtnAktif]}
                onPress={() => setFormSekme(s)}
                activeOpacity={0.7}
              >
                <Text style={[st.segmentText, formSekme === s && st.segmentTextAktif]}>
                  {s === 'puanli' ? 'Puanlı' : 'Puansız'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={st.kart}>
          {formlar.length === 0 ? (
            <Text style={st.bosSatir}>
              {formSekme === 'puanli' ? 'Puanlı form raporu yok' : 'Puansız form raporu yok'}
            </Text>
          ) : (
            formlar.map((f, i) => (
              <View key={f.formId} style={[st.satir, i > 0 && st.satirAyrac]}>
                <View style={st.satirIkon}>
                  <Text style={{ fontSize: 14 }}>📄</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={st.satirAd}>{f.formAd}</Text>
                  <Text style={st.satirAlt}>{f.raporSayisi} rapor</Text>
                </View>
                {formSekme === 'puanli' && <YuzdePill yuzde={f.ortalama} />}
              </View>
            ))
          )}
        </View>
        {formSekme === 'puanli' && (
          <Text style={st.dipNot}>Yorumlu (elle puan girilen) raporlar ortalamaya dahil edilmez.</Text>
        )}
      </View>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: R.zemin },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: R.zemin, padding: 30 },
  bosBaslik: { fontSize: 16, fontWeight: '800', color: R.murekkep },
  bosAlt: { fontSize: 13, color: R.gri, marginTop: 6, textAlign: 'center' },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 18, paddingTop: 54, paddingBottom: 20,
  },
  profilPill: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: R.kart, borderRadius: 30,
    paddingLeft: 6, paddingRight: 16, paddingVertical: 6,
  },
  profilAvatar: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: R.murekkep,
    alignItems: 'center', justifyContent: 'center',
  },
  profilAvatarText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  profilSelam: { fontSize: 10.5, color: R.soluk, fontWeight: '600' },
  profilAd: { fontSize: 13.5, fontWeight: '800', color: R.murekkep, marginTop: 1 },

  baslik: {
    fontSize: 26, lineHeight: 33, fontWeight: '800', color: R.murekkep,
    paddingHorizontal: 20, letterSpacing: -0.4,
  },
  acikNot: { fontSize: 12, color: R.amber, fontWeight: '600', paddingHorizontal: 20, marginTop: 4 },

  heroKart: {
    backgroundColor: R.murekkep, borderRadius: 22, marginHorizontal: 18, marginTop: 16, padding: 20,
  },
  heroEtiket: { fontSize: 12, color: 'rgba(255,255,255,0.65)', fontWeight: '600' },
  heroDeger: { fontSize: 44, fontWeight: '800', color: '#fff', marginTop: 6, letterSpacing: -1 },
  heroAlt: { fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 6, fontWeight: '500' },

  statSatir: { flexDirection: 'row', gap: 10, paddingHorizontal: 18, marginTop: 10 },
  statKart: {
    flex: 1, backgroundColor: R.kart, borderRadius: 22,
    paddingVertical: 14, alignItems: 'center',
  },
  statDeger: { fontSize: 22, fontWeight: '800', color: R.murekkep, letterSpacing: -0.5 },
  statEtiket: { fontSize: 11.5, color: R.gri, fontWeight: '600', marginTop: 2 },

  bolum: { marginTop: 22, paddingHorizontal: 18 },
  bolumBaslikSatiri: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  bolumBaslik: { fontSize: 15, fontWeight: '800', color: R.murekkep },
  bolumLink: { fontSize: 12, fontWeight: '700', color: R.gri },
  kart: { backgroundColor: R.kart, borderRadius: 22, overflow: 'hidden' },
  bosSatir: { fontSize: 13, color: R.soluk, textAlign: 'center', paddingVertical: 26 },

  satir: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  satirAyrac: { borderTopWidth: 1, borderTopColor: R.griBg },
  satirIkon: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: R.griBg,
    alignItems: 'center', justifyContent: 'center',
  },
  satirAd: { fontSize: 14, fontWeight: '700', color: R.murekkep },
  satirAlt: { fontSize: 11.5, color: R.soluk, marginTop: 1 },
  avatar: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: R.griBg,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 13.5, fontWeight: '800', color: R.murekkep },
  pill: { borderRadius: 11, paddingHorizontal: 9, paddingVertical: 4, minWidth: 44, alignItems: 'center' },
  pillText: { fontSize: 11.5, fontWeight: '800' },
  ok: { fontSize: 20, color: '#c4cfc8', fontWeight: '300' },
  dahaSatir: { borderTopWidth: 1, borderTopColor: R.griBg, paddingVertical: 12, alignItems: 'center' },
  dahaText: { fontSize: 13, fontWeight: '700', color: R.gri },

  segment: { flexDirection: 'row', backgroundColor: '#e2e8e4', borderRadius: 10, padding: 3, gap: 3 },
  segmentBtn: { borderRadius: 7, paddingVertical: 6, paddingHorizontal: 12 },
  segmentBtnAktif: { backgroundColor: '#fff' },
  segmentText: { fontSize: 12, fontWeight: '600', color: R.gri },
  segmentTextAktif: { color: R.murekkep, fontWeight: '800' },
  dipNot: { fontSize: 11, color: R.soluk, marginTop: 8, paddingHorizontal: 4 },
});
