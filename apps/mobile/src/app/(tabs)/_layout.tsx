import { Slot, usePathname, useRouter } from 'expo-router';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';

import type { ColorValue } from 'react-native';

/**
 * Sekmeler bilerek navigasyon kütüphanesi OLMADAN çizilir: react-navigation'ın
 * alt sekme çubuğu bazı Android cihazlarda (ör. Lenovo TB310FU) 0 boyuta çöküp
 * görünmez oluyordu. Burada içerik <Slot/> ile, menü ise düz bir View satırı
 * olarak render edilir — hiçbir ölçüm/animasyon mekanizmasına bağlı değildir.
 */

function HomeIcon({ color }: { color: ColorValue }) {
  return (
    <View style={[styles.iconWrap]}>
      <View style={[styles.homeRoof, { borderBottomColor: color as string }]} />
      <View style={[styles.homeBody, { borderColor: color as string }]}>
        <View style={[styles.homeDoor, { backgroundColor: color as string }]} />
      </View>
    </View>
  );
}

function ListIcon({ color }: { color: ColorValue }) {
  return (
    <View style={styles.iconWrap}>
      <View style={[styles.line, { backgroundColor: color as string }]} />
      <View style={[styles.line, { backgroundColor: color as string, width: 12 }]} />
      <View style={[styles.line, { backgroundColor: color as string }]} />
    </View>
  );
}

function StoreIcon({ color }: { color: ColorValue }) {
  return (
    <View style={styles.iconWrap}>
      <View style={[styles.storeCati, { backgroundColor: color as string }]} />
      <View style={[styles.storeGovde, { borderColor: color as string }]}>
        <View style={[styles.storeKapi, { backgroundColor: color as string }]} />
      </View>
    </View>
  );
}

function GlobeIcon({ color }: { color: ColorValue }) {
  return (
    <View style={styles.iconWrap}>
      <View style={[styles.globeDis, { borderColor: color as string }]}>
        <View style={[styles.globeCizgi, { backgroundColor: color as string }]} />
        <View style={[styles.globeCizgiDik, { backgroundColor: color as string }]} />
      </View>
    </View>
  );
}

function MenuIcon({ color }: { color: ColorValue }) {
  return (
    <View style={[styles.iconWrap, styles.menuIzgara]}>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={[styles.menuKare, { borderColor: color as string }]} />
      ))}
    </View>
  );
}

const TUM_SEKMELER = [
  { ad: 'Ana Sayfa', yol: '/', Icon: HomeIcon },
  { ad: 'Mağazalarım', yol: '/magazalar', Icon: StoreIcon },
  { ad: 'Raporlarım', yol: '/liste', Icon: ListIcon },
  { ad: 'Tümü', yol: '/tumu', Icon: GlobeIcon },
  { ad: 'Menü', yol: '/menu', Icon: MenuIcon },
] as const;

// Bölge müdürü salt okunur: kişisel rapor akışı yok, bölge paneli + raporlar
const BM_SEKMELER = [
  { ad: 'Panel', yol: '/', Icon: HomeIcon },
  { ad: 'Mağazalarım', yol: '/magazalar', Icon: StoreIcon },
  { ad: 'Raporlar', yol: '/tumu', Icon: GlobeIcon },
  { ad: 'Menü', yol: '/menu', Icon: MenuIcon },
] as const;

export default function TabLayout() {
  const router = useRouter();
  const yol = usePathname();
  const { kullanici } = useAuth();
  const sekmeler = kullanici?.rol === 'bolge_muduru' ? BM_SEKMELER : TUM_SEKMELER;
  // Kenardan-kenara (edge-to-edge) modda uygulama penceresi sistem çubuğunun
  // arkasına uzanır; menü çubuğunu taskbar'ın ÜZERİNE kaldırmak için alt güvenli
  // alan boşluğu şart (bu tablette menünün hiç görünmemesinin nedeni buydu).
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.kok}>
      <View style={styles.icerik}>
        <Slot />
      </View>
      {/* Yüzen hap menü: aktif sekme koyu hap içinde ikon+etiket, pasifler yalnız ikon */}
      <View style={[styles.tabAlan, { paddingBottom: 10 + Math.max(insets.bottom, 0) }]}>
        <View style={styles.tabPill}>
          {sekmeler.map(({ ad, yol: hedef, Icon }) => {
            const aktif = yol === hedef;
            return (
              <TouchableOpacity
                key={hedef}
                style={aktif ? styles.tabAktif : styles.tabPasif}
                activeOpacity={0.75}
                onPress={() => { if (!aktif) router.replace(hedef as any); }}
              >
                <Icon color={aktif ? '#ffffff' : '#8a978f'} />
                {aktif && <Text style={styles.tabAktifLabel} numberOfLines={1}>{ad}</Text>}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  kok: { flex: 1, backgroundColor: '#edf2ee' },
  icerik: { flex: 1 },
  tabAlan: {
    paddingHorizontal: 14,
    paddingTop: 6,
    backgroundColor: 'transparent',
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 34,
    paddingHorizontal: 10,
    paddingVertical: 8,
    shadowColor: '#15201b',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  tabPasif: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabAktif: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#15201b',
    borderRadius: 24,
    paddingHorizontal: 16,
    height: 48,
  },
  tabAktifLabel: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#ffffff',
    maxWidth: 110,
  },
  iconWrap: {
    width: 22,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  homeRoof: {
    width: 0,
    height: 0,
    borderLeftWidth: 9,
    borderRightWidth: 9,
    borderBottomWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginBottom: 1,
  },
  homeBody: {
    width: 12,
    height: 8,
    borderWidth: 1.5,
    borderRadius: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 0,
  },
  homeDoor: {
    width: 4,
    height: 5,
    borderRadius: 1,
  },
  line: {
    height: 2,
    width: 18,
    borderRadius: 1,
    marginVertical: 1.5,
  },
  storeCati: {
    width: 16,
    height: 5,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    marginBottom: 1,
  },
  storeGovde: {
    width: 13,
    height: 9,
    borderWidth: 1.5,
    borderRadius: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  storeKapi: {
    width: 4,
    height: 5,
    borderRadius: 1,
  },
  globeDis: {
    width: 16,
    height: 16,
    borderWidth: 1.5,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  globeCizgi: {
    position: 'absolute',
    width: 13,
    height: 1.5,
    borderRadius: 1,
  },
  globeCizgiDik: {
    position: 'absolute',
    width: 1.5,
    height: 13,
    borderRadius: 1,
  },
  menuIzgara: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
    width: 18,
    height: 18,
  },
  menuKare: {
    width: 7,
    height: 7,
    borderWidth: 1.5,
    borderRadius: 2,
  },
});
