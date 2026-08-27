import { useState, useCallback } from 'react';
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
import BolgeMuduruPanel from '@/components/bm/BolgeMuduruPanel';
import type { Degerlendirme } from '@/lib/types';

/* Tasarım dili: yumuşak adaçayı zemin, beyaz geniş yarıçaplı kartlar,
 * mürekkep (koyu) vurgu kartı, pastel rozetler, mercan vurgu rengi. */
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

const GUNLER = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

interface Stats {
  toplam: number;
  buAy: number;
  buHafta: number;
  puanli: number;
}

function puanRozet(yuzde: number) {
  if (yuzde >= 80) return { bg: R.yesilBg, fg: R.yesil };
  if (yuzde >= 50) return { bg: R.amberBg, fg: R.amber };
  return { bg: R.kirmiziBg, fg: R.kirmizi };
}

function DegItem({ deg, onPress }: { deg: Degerlendirme; onPress: () => void }) {
  const tarih = deg.izlenmeTarihi?.toDate?.().toLocaleDateString('tr-TR') ?? '—';
  const yuzde =
    deg.puanli && deg.toplamPuan !== null && deg.maxPuan && deg.maxPuan > 0
      ? Math.round((deg.toplamPuan / deg.maxPuan) * 100)
      : null;
  const rozet = yuzde !== null ? puanRozet(yuzde) : null;

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
        {rozet && yuzde !== null ? (
          <View style={[styles.puanPill, { backgroundColor: rozet.bg }]}>
            <Text style={[styles.puanPillText, { color: rozet.fg }]}>%{yuzde}</Text>
          </View>
        ) : deg.puanli && deg.toplamPuan !== null ? (
          <View style={[styles.puanPill, { backgroundColor: R.griBg }]}>
            <Text style={[styles.puanPillText, { color: R.murekkep }]}>{deg.toplamPuan}</Text>
          </View>
        ) : (
          <View style={[styles.puanPill, { backgroundColor: R.griBg }]}>
            <Text style={[styles.puanPillText, { color: R.soluk }]}>Puansız</Text>
          </View>
        )}
        <Text style={styles.degTarih}>{tarih}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const { kullanici } = useAuth();
  // Bölge müdürü kendi salt okunur panelini görür (hook sırası bozulmasın diye
  // içerik ayrı bileşenlerde)
  if (kullanici?.rol === 'bolge_muduru') return <BolgeMuduruPanel />;
  return <KameramanPanel />;
}

function KameramanPanel() {
  const { user, kullanici } = useAuth();
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
  const sonBes = degerlendirmeler.slice(0, 5);

  // Son 7 günün rapor sayıları (haftalık mini grafik)
  const bugun = new Date();
  bugun.setHours(0, 0, 0, 0);
  const hafta = Array.from({ length: 7 }, (_, i) => {
    const gun = new Date(bugun);
    gun.setDate(bugun.getDate() - (6 - i));
    const ertesi = new Date(gun);
    ertesi.setDate(gun.getDate() + 1);
    const sayi = degerlendirmeler.filter((d) => {
      const t = d.izlenmeTarihi?.toDate?.();
      return t && t >= gun && t < ertesi;
    }).length;
    return { etiket: GUNLER[gun.getDay()], sayi, bugunMu: i === 6 };
  });
  const haftaMax = Math.max(1, ...hafta.map((h) => h.sayi));

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={R.vurgu} size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={R.vurgu} />}
    >
      {/* Üst satır: profil hapı + hızlı yeni değerlendirme */}
      <View style={styles.header}>
        <View style={styles.profilPill}>
          <View style={styles.profilAvatar}>
            <Text style={styles.profilAvatarText}>{ad.charAt(0).toUpperCase()}</Text>
          </View>
          <View>
            <Text style={styles.profilSelam}>Tekrar hoş geldin! 👋</Text>
            <Text style={styles.profilAd}>{kullanici?.displayName ?? ad}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.artiBtn} onPress={() => router.push('/yeni')} activeOpacity={0.8}>
          <Text style={styles.artiBtnText}>＋</Text>
        </TouchableOpacity>
      </View>

      {/* Büyük başlık */}
      <Text style={styles.baslik}>Bugün hangi mağazayı{'\n'}değerlendirelim?</Text>

      {/* Arama hapı → mağaza seçimi */}
      <TouchableOpacity style={styles.aramaPill} activeOpacity={0.8} onPress={() => router.replace('/magazalar')}>
        <Text style={styles.aramaIkon}>⌕</Text>
        <Text style={styles.aramaText}>Mağaza ara...</Text>
      </TouchableOpacity>

      {/* Ana eylem */}
      <TouchableOpacity style={styles.newBtn} onPress={() => router.push('/yeni')} activeOpacity={0.85}>
        <Text style={styles.newBtnText}>＋  Yeni Değerlendirme</Text>
      </TouchableOpacity>

      {/* İstatistikler: koyu vurgu kartı + iki açık kart */}
      <View style={styles.statsSatir}>
        <View style={styles.koyuKart}>
          <View style={styles.koyuUst}>
            <Text style={styles.koyuEtiket}>Toplam Rapor</Text>
            {stats.buHafta > 0 && (
              <View style={styles.koyuRozet}>
                <Text style={styles.koyuRozetText}>+{stats.buHafta} bu hafta</Text>
              </View>
            )}
          </View>
          <Text style={styles.koyuDeger}>{stats.toplam}</Text>
          <Text style={styles.koyuAlt}>
            {stats.puanli} puanlı · {stats.toplam - stats.puanli} puansız
          </Text>
        </View>
        <View style={styles.acikSutun}>
          <View style={styles.acikKart}>
            <Text style={styles.acikEtiket}>Bu Ay</Text>
            <Text style={styles.acikDeger}>{stats.buAy}</Text>
          </View>
          <View style={styles.acikKart}>
            <Text style={styles.acikEtiket}>Bu Hafta</Text>
            <Text style={styles.acikDeger}>{stats.buHafta}</Text>
          </View>
        </View>
      </View>

      {/* Son 7 gün grafiği */}
      <View style={styles.grafikKart}>
        <View style={styles.grafikBaslikSatiri}>
          <Text style={styles.grafikBaslik}>Son 7 Gün</Text>
          <View style={[styles.puanPill, { backgroundColor: R.griBg }]}>
            <Text style={[styles.puanPillText, { color: R.gri }]}>
              {hafta.reduce((t, h) => t + h.sayi, 0)} izlenme
            </Text>
          </View>
        </View>
        <View style={styles.grafikBarlar}>
          {hafta.map((h, i) => (
            <View key={i} style={styles.grafikSutun}>
              {h.bugunMu && h.sayi > 0 && <Text style={styles.grafikSayi}>{h.sayi}</Text>}
              <View
                style={[
                  styles.grafikBar,
                  {
                    height: h.sayi === 0 ? 10 : 14 + Math.round((h.sayi / haftaMax) * 50),
                    backgroundColor: h.bugunMu ? R.vurgu : '#e3ebe5',
                  },
                ]}
              />
              <Text style={[styles.grafikGun, h.bugunMu && { color: R.murekkep, fontWeight: '800' }]}>
                {h.etiket}
              </Text>
            </View>
          ))}
        </View>
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
            <Text style={styles.emptySub}>Yeni değerlendirme başlatmak için yukarıdaki butona dokunun.</Text>
          </View>
        ) : (
          <View style={styles.degList}>
            {sonBes.map((d) => (
              <DegItem key={d.id} deg={d} onPress={() => router.push(`/degerlendirme/${d.id}`)} />
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: R.zemin },
  content: { paddingBottom: 28 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: R.zemin },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 54,
    paddingBottom: 20,
  },
  profilPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: R.kart,
    borderRadius: 30,
    paddingLeft: 6,
    paddingRight: 16,
    paddingVertical: 6,
  },
  profilAvatar: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: R.murekkep,
    alignItems: 'center', justifyContent: 'center',
  },
  profilAvatarText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  profilSelam: { fontSize: 10.5, color: R.soluk, fontWeight: '600' },
  profilAd: { fontSize: 13.5, fontWeight: '800', color: R.murekkep, marginTop: 1 },
  artiBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: R.murekkep,
    alignItems: 'center', justifyContent: 'center',
  },
  artiBtnText: { fontSize: 20, color: '#fff', fontWeight: '600', marginTop: -1 },

  baslik: {
    fontSize: 26, lineHeight: 33, fontWeight: '800', color: R.murekkep,
    paddingHorizontal: 20, letterSpacing: -0.4,
  },

  aramaPill: {
    flexDirection: 'row', alignItems: 'center', gap: 9,
    backgroundColor: R.kart, borderRadius: 26, paddingHorizontal: 17, paddingVertical: 13,
    marginHorizontal: 18, marginTop: 16,
  },
  aramaIkon: { fontSize: 17, color: R.soluk, fontWeight: '700', marginTop: -2 },
  aramaText: { fontSize: 14, color: R.soluk, fontWeight: '500' },

  newBtn: {
    marginHorizontal: 18, marginTop: 10,
    backgroundColor: R.vurgu, borderRadius: 26, paddingVertical: 14, alignItems: 'center',
    shadowColor: R.vurgu, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.25, shadowRadius: 10,
    elevation: 4,
  },
  newBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  statsSatir: { flexDirection: 'row', gap: 10, paddingHorizontal: 18, marginTop: 18 },
  koyuKart: { flex: 1.15, backgroundColor: R.murekkep, borderRadius: 22, padding: 16, justifyContent: 'space-between' },
  koyuUst: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  koyuEtiket: { fontSize: 12, color: 'rgba(255,255,255,0.65)', fontWeight: '600', flexShrink: 1 },
  koyuRozet: { backgroundColor: R.yesilBg, borderRadius: 9, paddingHorizontal: 7, paddingVertical: 3 },
  koyuRozetText: { fontSize: 9.5, fontWeight: '800', color: R.yesil },
  koyuDeger: { fontSize: 38, fontWeight: '800', color: '#fff', marginTop: 8, letterSpacing: -1 },
  koyuAlt: { fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 6, fontWeight: '500' },
  acikSutun: { flex: 1, gap: 10 },
  acikKart: { flex: 1, backgroundColor: R.kart, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 12, justifyContent: 'center' },
  acikEtiket: { fontSize: 12, color: R.gri, fontWeight: '600' },
  acikDeger: { fontSize: 24, fontWeight: '800', color: R.murekkep, marginTop: 3, letterSpacing: -0.5 },

  grafikKart: { backgroundColor: R.kart, borderRadius: 22, marginHorizontal: 18, marginTop: 10, padding: 16 },
  grafikBaslikSatiri: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  grafikBaslik: { fontSize: 14.5, fontWeight: '800', color: R.murekkep },
  grafikBarlar: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 14, height: 96 },
  grafikSutun: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
  grafikSayi: { fontSize: 11, fontWeight: '800', color: R.vurgu },
  grafikBar: { width: 24, borderRadius: 12 },
  grafikGun: { fontSize: 10.5, color: R.soluk, fontWeight: '600' },

  section: { marginTop: 22, paddingHorizontal: 18 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: R.murekkep },
  sectionLink: { fontSize: 12, fontWeight: '700', color: R.gri },

  degList: { backgroundColor: R.kart, borderRadius: 22, overflow: 'hidden' },
  degItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: R.griBg,
  },
  degAvatar: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: R.griBg,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  degAvatarText: { fontSize: 13.5, fontWeight: '800', color: R.murekkep },
  degInfo: { flex: 1 },
  degPersonel: { fontSize: 14, fontWeight: '700', color: R.murekkep },
  degForm: { fontSize: 12, color: R.soluk, marginTop: 1 },
  degRight: { alignItems: 'flex-end', gap: 3 },
  puanPill: { borderRadius: 11, paddingHorizontal: 9, paddingVertical: 4 },
  puanPillText: { fontSize: 11.5, fontWeight: '800' },
  degTarih: { fontSize: 10.5, color: R.soluk },
  empty: { alignItems: 'center', paddingVertical: 40, backgroundColor: R.kart, borderRadius: 22 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: R.murekkep },
  emptySub: { fontSize: 13, color: R.soluk, textAlign: 'center', marginTop: 6, paddingHorizontal: 20 },
});
