import { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { getDegerlendirmelerByKameraman } from '@/lib/firestore';
import type { Degerlendirme } from '@/lib/types';

function DegSatir({ item, onPress }: { item: Degerlendirme; onPress: () => void }) {
  const tarih = item.izlenmeTarihi?.toDate?.().toLocaleDateString('tr-TR') ?? '—';
  const yuzde =
    item.puanli && item.toplamPuan !== null && item.maxPuan && item.maxPuan > 0
      ? Math.round((item.toplamPuan / item.maxPuan) * 100)
      : null;

  return (
    <TouchableOpacity style={styles.satir} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.satirLeft}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.personelAd.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.satirInfo}>
          <Text style={styles.personelAd}>{item.personelAd}</Text>
          <Text style={styles.formAd} numberOfLines={1}>{item.formAd}</Text>
          {item.magazaAd ? (
            <Text style={styles.magazaAd} numberOfLines={1}>📍 {item.magazaAd}</Text>
          ) : null}
        </View>
      </View>
      <View style={styles.satirRight}>
        {yuzde !== null ? (
          <>
            <Text style={[styles.puan, { color: yuzde >= 80 ? '#10b981' : yuzde >= 50 ? '#f59e0b' : '#ef4444' }]}>
              %{yuzde}
            </Text>
            <View style={styles.puanBar}>
              <View
                style={[
                  styles.puanBarFill,
                  {
                    width: `${yuzde}%`,
                    backgroundColor: yuzde >= 80 ? '#10b981' : yuzde >= 50 ? '#f59e0b' : '#ef4444',
                  },
                ]}
              />
            </View>
          </>
        ) : (
          <View style={styles.puansizBadge}>
            <Text style={styles.puansizText}>Puansız</Text>
          </View>
        )}
        <Text style={styles.tarih}>{tarih}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function ListeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [degerlendirmeler, setDegerlendirmeler] = useState<Degerlendirme[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [arama, setArama] = useState('');

  const load = useCallback(async () => {
    if (!user) return;
    const liste = await getDegerlendirmelerByKameraman(user.uid);
    setDegerlendirmeler(liste);
    setLoading(false);
    setRefreshing(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const filtrelenmis = arama.trim()
    ? degerlendirmeler.filter(
        (d) =>
          d.personelAd.toLowerCase().includes(arama.toLowerCase()) ||
          d.formAd.toLowerCase().includes(arama.toLowerCase()) ||
          (d.magazaAd ?? '').toLowerCase().includes(arama.toLowerCase())
      )
    : degerlendirmeler;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Değerlendirmelerim</Text>
        <Text style={styles.headerSub}>{degerlendirmeler.length} kayıt</Text>
      </View>

      {/* Arama */}
      <View style={styles.aramaWrap}>
        <TextInput
          style={styles.aramaInput}
          placeholder="Personel, form veya mağaza ara..."
          placeholderTextColor="#94a3b8"
          value={arama}
          onChangeText={setArama}
          clearButtonMode="while-editing"
        />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#4f46e5" size="large" />
        </View>
      ) : (
        <FlatList
          data={filtrelenmis}
          keyExtractor={(d) => d.id}
          renderItem={({ item }) => (
            <DegSatir
              item={item}
              onPress={() => router.push(`/degerlendirme/${item.id}`)}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              tintColor="#4f46e5"
            />
          }
          contentContainerStyle={filtrelenmis.length === 0 ? styles.flex : styles.listContent}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>{arama ? '🔍' : '📋'}</Text>
              <Text style={styles.emptyTitle}>
                {arama ? 'Sonuç bulunamadı' : 'Henüz değerlendirme yok'}
              </Text>
              {!arama && (
                <TouchableOpacity
                  style={styles.emptyBtn}
                  onPress={() => router.push('/yeni')}
                >
                  <Text style={styles.emptyBtnText}>Yeni Değerlendirme Başlat</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 12,
    backgroundColor: '#f8fafc',
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  headerSub: { fontSize: 13, color: '#94a3b8', marginTop: 2 },
  aramaWrap: { paddingHorizontal: 16, paddingBottom: 12 },
  aramaInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: '#0f172a',
  },
  listContent: { paddingBottom: 32 },
  satir: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  satirLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 14, fontWeight: '700', color: '#4f46e5' },
  satirInfo: { flex: 1 },
  personelAd: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  formAd: { fontSize: 12, color: '#64748b', marginTop: 1 },
  magazaAd: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  satirRight: { alignItems: 'flex-end', minWidth: 60 },
  puan: { fontSize: 15, fontWeight: '700' },
  puanBar: { width: 48, height: 3, backgroundColor: '#f1f5f9', borderRadius: 2, marginTop: 4, overflow: 'hidden' },
  puanBarFill: { height: '100%', borderRadius: 2 },
  puansizBadge: {
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  puansizText: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
  tarih: { fontSize: 11, color: '#cbd5e1', marginTop: 4 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#475569' },
  emptyBtn: {
    marginTop: 16,
    backgroundColor: '#4f46e5',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 11,
  },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
