import { useEffect, useState, useCallback } from 'react';
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
import { getDegerlendirmelerByKameraman } from '@/lib/firestore';
import type { Degerlendirme } from '@/lib/types';

interface Stats {
  toplam: number;
  buAy: number;
  buHafta: number;
  puanli: number;
}

function StatKart({ title, value, color }: { title: string; value: number; color: string }) {
  return (
    <View style={[styles.statKart, { borderTopColor: color, borderTopWidth: 3 }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );
}

function DegItem({ deg, onPress }: { deg: Degerlendirme; onPress: () => void }) {
  const tarih = deg.izlenmeTarihi?.toDate?.().toLocaleDateString('tr-TR') ?? '—';
  const yuzde =
    deg.puanli && deg.toplamPuan !== null && deg.maxPuan && deg.maxPuan > 0
      ? Math.round((deg.toplamPuan / deg.maxPuan) * 100)
      : null;

  return (
    <TouchableOpacity style={styles.degItem} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.degAvatar}>
        <Text style={styles.degAvatarText}>{deg.personelAd.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.degInfo}>
        <Text style={styles.degPersonel}>{deg.personelAd}</Text>
        <Text style={styles.degForm} numberOfLines={1}>{deg.formAd}</Text>
      </View>
      <View style={styles.degRight}>
        {yuzde !== null ? (
          <Text style={[styles.degPuan, { color: yuzde >= 80 ? '#10b981' : yuzde >= 50 ? '#f59e0b' : '#ef4444' }]}>
            %{yuzde}
          </Text>
        ) : (
          <View style={styles.puansizBadge}>
            <Text style={styles.puansizText}>—</Text>
          </View>
        )}
        <Text style={styles.degTarih}>{tarih}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const { user, kullanici, signOut } = useAuth();
  const router = useRouter();
  const [degerlendirmeler, setDegerlendirmeler] = useState<Degerlendirme[]>([]);
  const [stats, setStats] = useState<Stats>({ toplam: 0, buAy: 0, buHafta: 0, puanli: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const liste = await getDegerlendirmelerByKameraman(user.uid);

    const now = new Date();
    const ayBaslangic = new Date(now.getFullYear(), now.getMonth(), 1);
    const haftaBaslangic = new Date(now);
    haftaBaslangic.setDate(now.getDate() - now.getDay());
    haftaBaslangic.setHours(0, 0, 0, 0);

    setStats({
      toplam: liste.length,
      buAy: liste.filter((d) => {
        const t = d.izlenmeTarihi?.toDate?.();
        return t && t >= ayBaslangic;
      }).length,
      buHafta: liste.filter((d) => {
        const t = d.izlenmeTarihi?.toDate?.();
        return t && t >= haftaBaslangic;
      }).length,
      puanli: liste.filter((d) => d.puanli).length,
    });

    setDegerlendirmeler(liste);
    setLoading(false);
    setRefreshing(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const ad = kullanici?.displayName?.split(' ')[0] ?? 'Kameraman';
  const gun = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  const sonBes = degerlendirmeler.slice(0, 5);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#4f46e5" size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4f46e5" />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerGreet}>Merhaba, {ad} 👋</Text>
          <Text style={styles.headerDate}>{gun}</Text>
        </View>
        <TouchableOpacity style={styles.avatarBtn} onPress={signOut}>
          <Text style={styles.avatarText}>{ad.charAt(0).toUpperCase()}</Text>
        </TouchableOpacity>
      </View>

      {/* Yeni değerlendirme butonu */}
      <TouchableOpacity
        style={styles.newBtn}
        onPress={() => router.push('/yeni')}
        activeOpacity={0.85}
      >
        <Text style={styles.newBtnText}>+ Yeni Değerlendirme</Text>
      </TouchableOpacity>

      {/* Stats */}
      <View style={styles.statsGrid}>
        <StatKart title="Toplam Rapor" value={stats.toplam} color="#4f46e5" />
        <StatKart title="Bu Ay" value={stats.buAy} color="#3b82f6" />
        <StatKart title="Bu Hafta" value={stats.buHafta} color="#14b8a6" />
        <StatKart title="Puanlı" value={stats.puanli} color="#8b5cf6" />
      </View>

      {/* Son değerlendirmeler */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Son Değerlendirmeler</Text>
          {degerlendirmeler.length > 5 && (
            <TouchableOpacity onPress={() => router.navigate('/(tabs)/liste')}>
              <Text style={styles.sectionLink}>Tümünü Gör →</Text>
            </TouchableOpacity>
          )}
        </View>

        {sonBes.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>Henüz değerlendirme yok</Text>
            <Text style={styles.emptySub}>Yeni değerlendirme başlatmak için yukarıdaki butona tıklayın.</Text>
          </View>
        ) : (
          <View style={styles.degList}>
            {sonBes.map((d) => (
              <DegItem
                key={d.id}
                deg={d}
                onPress={() => router.push(`/degerlendirme/${d.id}`)}
              />
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { paddingBottom: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
  },
  headerGreet: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  headerDate: { fontSize: 13, color: '#94a3b8', marginTop: 2 },
  avatarBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 15, fontWeight: '700', color: '#4f46e5' },
  newBtn: {
    marginHorizontal: 20,
    backgroundColor: '#4f46e5',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  newBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 8,
    marginTop: 16,
  },
  statKart: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  statValue: { fontSize: 28, fontWeight: '800' },
  statTitle: { fontSize: 12, color: '#94a3b8', marginTop: 4, fontWeight: '500' },
  section: { marginTop: 24, paddingHorizontal: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  sectionLink: { fontSize: 12, fontWeight: '600', color: '#4f46e5' },
  degList: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    overflow: 'hidden',
  },
  degItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  degAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  degAvatarText: { fontSize: 13, fontWeight: '700', color: '#4f46e5' },
  degInfo: { flex: 1 },
  degPersonel: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  degForm: { fontSize: 12, color: '#94a3b8', marginTop: 1 },
  degRight: { alignItems: 'flex-end' },
  degPuan: { fontSize: 14, fontWeight: '700' },
  puansizBadge: {},
  puansizText: { fontSize: 14, color: '#cbd5e1' },
  degTarih: { fontSize: 11, color: '#cbd5e1', marginTop: 2 },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: '#475569' },
  emptySub: { fontSize: 13, color: '#94a3b8', textAlign: 'center', marginTop: 6, paddingHorizontal: 20 },
});
