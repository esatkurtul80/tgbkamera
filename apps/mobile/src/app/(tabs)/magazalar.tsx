import { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import {
  getMagazalar,
  getMagazalarByBolge,
  getBolgeler,
  getBolgeMudurleri,
  updateKullaniciFavoriMagazalar,
} from '@/lib/firestore';
import type { Magaza, Bolge, Kullanici } from '@/lib/types';

/**
 * Mağazalarım — webdeki kameraman panelindeki mağaza tablosunun mobil karşılığı:
 * favoriler/tümü görünümü, arama, bölge müdürü filtresi, favori yıldızı.
 * Mağazaya dokununca personel listesi ve rapor başlatma ekranına gidilir.
 */
export default function MagazalarScreen() {
  const router = useRouter();
  const { user, kullanici } = useAuth();

  const [magazalar, setMagazalar] = useState<Magaza[]>([]);
  const [bolgeler, setBolgeler] = useState<Bolge[]>([]);
  const [mudurler, setMudurler] = useState<Kullanici[]>([]);
  const [favoriler, setFavoriler] = useState<string[]>([]);
  const [gorunum, setGorunum] = useState<'favoriler' | 'tumu'>('favoriler');
  const [arama, setArama] = useState('');
  const [seciliMudurId, setSeciliMudurId] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const bm = kullanici?.rol === 'bolge_muduru';

  const load = useCallback(async () => {
    if (!user || !kullanici) return;
    try {
      // BM yalnız kendi bölgesinin mağazalarını görür; müdür filtresi de gereksiz
      const [m, b, md] = await Promise.all([
        bm ? Promise.resolve([] as Magaza[]) : getMagazalar(),
        getBolgeler(),
        bm ? Promise.resolve([] as Kullanici[]) : getBolgeMudurleri(),
      ]);
      let benim: Magaza[];
      if (bm) {
        const bolgem =
          (kullanici.bolgeId ? b.find((x) => x.id === kullanici.bolgeId) : undefined) ??
          b.find((x) => x.bolgeMuduruId === user.uid);
        benim = bolgem ? await getMagazalarByBolge(bolgem.id) : [];
      } else {
        benim = kullanici.magazaIdleri?.length
          ? m.filter((x) => kullanici.magazaIdleri!.includes(x.id))
          : m;
      }
      setMagazalar(benim);
      setBolgeler(b);
      setMudurler(md);
      setFavoriler(kullanici.favoriMagazaIdleri ?? []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, kullanici, bm]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const bolgeAdi = useCallback(
    (bolgeId?: string) => bolgeler.find((b) => b.id === bolgeId)?.ad ?? '',
    [bolgeler]
  );

  async function favoriToggle(magazaId: string) {
    if (!user) return;
    const yeni = favoriler.includes(magazaId)
      ? favoriler.filter((id) => id !== magazaId)
      : [...favoriler, magazaId];
    setFavoriler(yeni); // iyimser güncelleme
    try {
      await updateKullaniciFavoriMagazalar(user.uid, yeni);
    } catch {
      setFavoriler(favoriler); // geri al
    }
  }

  const filtrelenmis = useMemo(() => {
    let liste = magazalar;
    if (gorunum === 'favoriler' && favoriler.length > 0) {
      liste = liste.filter((m) => favoriler.includes(m.id));
    }
    if (seciliMudurId) {
      const mudurBolgeleri = bolgeler.filter((b) => b.bolgeMuduruId === seciliMudurId).map((b) => b.id);
      liste = liste.filter((m) => m.bolgeId && mudurBolgeleri.includes(m.bolgeId));
    }
    if (arama.trim()) {
      const q = arama.toLowerCase();
      liste = liste.filter((m) => m.ad.toLowerCase().includes(q) || bolgeAdi(m.bolgeId).toLowerCase().includes(q));
    }
    // Favoriler önce
    return [...liste].sort((a, b) => {
      const af = favoriler.includes(a.id) ? 0 : 1;
      const bf = favoriler.includes(b.id) ? 0 : 1;
      return af !== bf ? af - bf : a.ad.localeCompare(b.ad, 'tr');
    });
  }, [magazalar, gorunum, favoriler, seciliMudurId, arama, bolgeler, bolgeAdi]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mağazalarım</Text>
        <Text style={styles.headerSub}>{magazalar.length} mağaza · {favoriler.length} favori</Text>
      </View>

      {/* Görünüm + Arama */}
      <View style={styles.kontrolSatiri}>
        <View style={styles.segment}>
          <TouchableOpacity
            style={[styles.segmentBtn, gorunum === 'favoriler' && styles.segmentBtnAktif]}
            onPress={() => setGorunum('favoriler')}
          >
            <Text style={[styles.segmentText, gorunum === 'favoriler' && styles.segmentTextAktif]}>★ Favoriler</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentBtn, gorunum === 'tumu' && styles.segmentBtnAktif]}
            onPress={() => setGorunum('tumu')}
          >
            <Text style={[styles.segmentText, gorunum === 'tumu' && styles.segmentTextAktif]}>Tümü</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.aramaWrap}>
        <TextInput
          style={styles.aramaInput}
          placeholder="Mağaza veya bölge ara..."
          placeholderTextColor="#94a3b8"
          value={arama}
          onChangeText={setArama}
          clearButtonMode="while-editing"
        />
      </View>

      {/* Bölge müdürü filtresi */}
      {mudurler.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.mudurSerit}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        >
          <TouchableOpacity
            style={[styles.mudurChip, !seciliMudurId && styles.mudurChipAktif]}
            onPress={() => setSeciliMudurId('')}
          >
            <Text style={[styles.mudurChipText, !seciliMudurId && styles.mudurChipTextAktif]}>Tüm Müdürler</Text>
          </TouchableOpacity>
          {mudurler.map((md) => (
            <TouchableOpacity
              key={md.id}
              style={[styles.mudurChip, seciliMudurId === md.id && styles.mudurChipAktif]}
              onPress={() => setSeciliMudurId(seciliMudurId === md.id ? '' : md.id)}
            >
              <Text style={[styles.mudurChipText, seciliMudurId === md.id && styles.mudurChipTextAktif]}>
                {md.displayName}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#4f46e5" size="large" />
        </View>
      ) : (
        <FlatList
          data={filtrelenmis}
          keyExtractor={(m) => m.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#4f46e5" />
          }
          contentContainerStyle={filtrelenmis.length === 0 ? styles.flex : { paddingBottom: 32 }}
          renderItem={({ item }) => {
            const favori = favoriler.includes(item.id);
            return (
              <TouchableOpacity
                style={styles.satir}
                activeOpacity={0.7}
                onPress={() => router.push({ pathname: '/magaza/[id]', params: { id: item.id, ad: item.ad } })}
              >
                <TouchableOpacity
                  onPress={() => favoriToggle(item.id)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={styles.yildizBtn}
                >
                  <Text style={[styles.yildiz, favori && styles.yildizAktif]}>{favori ? '★' : '☆'}</Text>
                </TouchableOpacity>
                <View style={styles.satirInfo}>
                  <Text style={styles.magazaAd}>{item.ad}</Text>
                  {bolgeAdi(item.bolgeId) ? (
                    <Text style={styles.bolgeAd}>📍 {bolgeAdi(item.bolgeId)}</Text>
                  ) : null}
                </View>
                <Text style={styles.ok}>›</Text>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>{gorunum === 'favoriler' ? '⭐' : '🏬'}</Text>
              <Text style={styles.emptyTitle}>
                {gorunum === 'favoriler' && favoriler.length === 0
                  ? 'Henüz favori mağazanız yok.\nYıldıza dokunarak ekleyin.'
                  : 'Mağaza bulunamadı'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#edf2ee' },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 10 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  headerSub: { fontSize: 13, color: '#94a3b8', marginTop: 2 },
  kontrolSatiri: { paddingHorizontal: 16, paddingBottom: 10 },
  segment: {
    flexDirection: 'row', backgroundColor: '#eef2ff', borderRadius: 11, padding: 3, alignSelf: 'flex-start',
  },
  segmentBtn: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 9 },
  segmentBtnAktif: { backgroundColor: '#4f46e5' },
  segmentText: { fontSize: 13, fontWeight: '700', color: '#6366f1' },
  segmentTextAktif: { color: '#fff' },
  aramaWrap: { paddingHorizontal: 16, paddingBottom: 10 },
  aramaInput: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: '#0f172a',
  },
  mudurSerit: { maxHeight: 40, marginBottom: 10 },
  mudurChip: {
    paddingHorizontal: 13, paddingVertical: 7, borderRadius: 18,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0',
  },
  mudurChipAktif: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  mudurChipText: { fontSize: 12, fontWeight: '600', color: '#475569' },
  mudurChipTextAktif: { color: '#fff' },
  satir: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 8,
    borderRadius: 14, paddingVertical: 13, paddingHorizontal: 12,
    borderWidth: 1, borderColor: '#f1f5f9',
  },
  yildizBtn: { marginRight: 10 },
  yildiz: { fontSize: 22, color: '#cbd5e1' },
  yildizAktif: { color: '#f59e0b' },
  satirInfo: { flex: 1 },
  magazaAd: { fontSize: 14.5, fontWeight: '700', color: '#0f172a' },
  bolgeAd: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  ok: { fontSize: 22, color: '#cbd5e1', fontWeight: '300' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 12 },
  emptyIcon: { fontSize: 44 },
  emptyTitle: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 21 },
});
