import { ScrollView, View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '@/contexts/AuthContext';
import type { KullaniciRol } from '@/lib/types';

/**
 * Rol bazlı menü — webdeki Sidebar ile birebir aynı yetki matrisi.
 * native: uygulama içindeki ekrana gider. web: admin panelindeki sayfayı
 * tarayıcıda açar (native karşılığı henüz yok; geldikçe buradan native'e çevrilir).
 */

const WEB_URL = 'https://tgbkamera.web.app';

const ROL_ETIKET: Record<KullaniciRol, string> = {
  admin: 'Admin',
  sirketsahibi: 'Şirket Sahibi',
  ust_yonetici: 'Üst Düzey Yönetici',
  bolge_muduru: 'Bölge Müdürü',
  magaza_sorumlusu: 'Mağaza',
  kameraman: 'Kameraman',
};

interface MenuOge {
  ad: string;
  ikon: string;
  native?: string;
  web?: string;
}
interface MenuBolum {
  etiket: string;
  ogeler: MenuOge[];
}

const adminMenu: MenuBolum[] = [
  { etiket: 'GENEL', ogeler: [{ ad: 'Panel', ikon: '📊', native: '/' }] },
  {
    etiket: 'YAPI',
    ogeler: [
      { ad: 'Bölgeler', ikon: '🗺️', native: '/yonetim/bolgeler' },
      { ad: 'Mağazalar', ikon: '🏬', native: '/magazalar' },
      { ad: 'Personel', ikon: '👥', native: '/yonetim/personel' },
    ],
  },
  {
    etiket: 'DEĞERLENDİRME',
    ogeler: [
      { ad: 'Formlar', ikon: '📄', native: '/yonetim/formlar' },
      { ad: 'Bölümler', ikon: '🗂️', native: '/yonetim/bolumler' },
      { ad: 'Sorular', ikon: '❓', native: '/yonetim/sorular' },
    ],
  },
  {
    etiket: 'RAPORLAMA',
    ogeler: [
      { ad: 'Değerlendirmeler', ikon: '📋', native: '/tumu' },
      { ad: 'Aylık İzlenme', ikon: '📈', native: '/yonetim/aylik-izlenme' },
      { ad: 'Rapor Tasarımı', ikon: '🎨', web: '/rapor-tasarimi' },
      { ad: 'Çöp Kutusu', ikon: '🗑️', native: '/yonetim/cop-kutusu' },
    ],
  },
  { etiket: 'SİSTEM', ogeler: [{ ad: 'Kullanıcılar', ikon: '⚙️', native: '/yonetim/kullanicilar' }] },
];

// Bölge müdürü salt okunur: değerlendirme oluşturma/düzenleme ve yönetim ekranları yok
const bolgeMuduruMenu: MenuBolum[] = [
  {
    etiket: 'GENEL',
    ogeler: [
      { ad: 'Panel', ikon: '📊', native: '/' },
      { ad: 'Mağazalarım', ikon: '🏬', native: '/magazalar' },
    ],
  },
  {
    etiket: 'RAPORLAMA',
    ogeler: [{ ad: 'Değerlendirmeler', ikon: '📋', native: '/tumu' }],
  },
];

const magazaSorumlusuMenu: MenuBolum[] = [
  { etiket: 'GENEL', ogeler: [{ ad: 'Panel', ikon: '📊', native: '/' }] },
  { etiket: 'PERSONEL', ogeler: [{ ad: 'Personel', ikon: '👥', native: '/yonetim/personel' }] },
  {
    etiket: 'RAPORLAMA',
    ogeler: [
      { ad: 'Değerlendirmeler', ikon: '📋', native: '/tumu' },
      { ad: 'Aylık İzlenme', ikon: '📈', native: '/yonetim/aylik-izlenme' },
      { ad: 'Çöp Kutusu', ikon: '🗑️', native: '/yonetim/cop-kutusu' },
    ],
  },
];

const kameramanMenu: MenuBolum[] = [
  {
    etiket: 'GENEL',
    ogeler: [
      { ad: 'Panelim', ikon: '📊', native: '/' },
      { ad: 'Mağazalarım', ikon: '🏬', native: '/magazalar' },
      { ad: 'Personel Havuzu', ikon: '👥', native: '/yonetim/personel' },
    ],
  },
  {
    etiket: 'RAPORLAMA',
    ogeler: [
      { ad: 'Değerlendirmelerim', ikon: '📈', native: '/liste' },
      { ad: 'Tüm Değerlendirmeler', ikon: '📋', native: '/tumu' },
      { ad: 'Çöp Kutusu', ikon: '🗑️', native: '/yonetim/cop-kutusu' },
    ],
  },
];

// Webdeki getSections ile aynı mantık
function menuGetir(rol?: KullaniciRol): MenuBolum[] {
  if (!rol || rol === 'admin' || rol === 'sirketsahibi' || rol === 'ust_yonetici') return adminMenu;
  if (rol === 'bolge_muduru') return bolgeMuduruMenu;
  if (rol === 'magaza_sorumlusu') return magazaSorumlusuMenu;
  if (rol === 'kameraman') return kameramanMenu;
  return adminMenu;
}

export default function MenuScreen() {
  const router = useRouter();
  const { kullanici, signOut } = useAuth();
  const bolumler = menuGetir(kullanici?.rol);

  async function ogeAc(oge: MenuOge) {
    if (oge.native) {
      // Sekme rotaları replace ile, yönetim ekranları push ile (geri dönülebilsin)
      if (oge.native.startsWith('/yonetim')) router.push(oge.native as any);
      else router.replace(oge.native as any);
    } else if (oge.web) {
      await WebBrowser.openBrowserAsync(WEB_URL + oge.web);
    }
  }

  function cikisSor() {
    Alert.alert('Çıkış Yap', 'Oturumu kapatmak istediğinize emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      { text: 'Çıkış Yap', style: 'destructive', onPress: () => signOut() },
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 24 }}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Menü</Text>
        {kullanici && (
          <Text style={styles.headerSub}>
            {kullanici.displayName} · {ROL_ETIKET[kullanici.rol] ?? kullanici.rol}
          </Text>
        )}
      </View>

      {bolumler.map((bolum) => (
        <View key={bolum.etiket} style={styles.bolum}>
          <Text style={styles.bolumEtiket}>{bolum.etiket}</Text>
          <View style={styles.kart}>
            {bolum.ogeler.map((oge, i) => (
              <TouchableOpacity
                key={oge.ad}
                style={[styles.oge, i > 0 && styles.ogeAyrac]}
                activeOpacity={0.7}
                onPress={() => ogeAc(oge)}
              >
                <View style={styles.ogeIkonYuvarlak}>
                  <Text style={styles.ogeIkon}>{oge.ikon}</Text>
                </View>
                <Text style={styles.ogeAd}>{oge.ad}</Text>
                {oge.web ? (
                  <View style={styles.webRozet}>
                    <Text style={styles.webRozetText}>WEB</Text>
                  </View>
                ) : null}
                <Text style={styles.ok}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}

      <Text style={styles.webNot}>
        "WEB" işaretli sayfalar tarayıcıda açılır — ilk açılışta web paneline Google ile bir kez
        giriş yapmanız istenebilir, sonrasında oturum tarayıcıda kalır.
      </Text>

      <TouchableOpacity style={styles.cikisBtn} onPress={cikisSor} activeOpacity={0.8}>
        <Text style={styles.cikisText}>Çıkış Yap</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#edf2ee' },
  header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 14 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#15201b', letterSpacing: -0.4 },
  headerSub: { fontSize: 13, color: '#8a978f', marginTop: 3 },
  bolum: { marginBottom: 16 },
  bolumEtiket: {
    fontSize: 10.5, fontWeight: '800', color: '#8a978f', letterSpacing: 1.2,
    paddingHorizontal: 24, marginBottom: 7,
  },
  kart: {
    backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 22, overflow: 'hidden',
  },
  oge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, paddingVertical: 11, gap: 12 },
  ogeAyrac: { borderTopWidth: 1, borderTopColor: '#eef2ef' },
  ogeIkonYuvarlak: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: '#eef2ef',
    alignItems: 'center', justifyContent: 'center',
  },
  ogeIkon: { fontSize: 16 },
  ogeAd: { flex: 1, fontSize: 14.5, fontWeight: '700', color: '#15201b' },
  webRozet: { backgroundColor: '#eef2ef', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  webRozetText: { fontSize: 9, fontWeight: '800', color: '#77857e', letterSpacing: 0.5 },
  ok: { fontSize: 20, color: '#c4cfc8', fontWeight: '300' },
  webNot: {
    fontSize: 11.5, color: '#8a978f', lineHeight: 17,
    paddingHorizontal: 24, marginTop: 4, marginBottom: 16,
  },
  cikisBtn: {
    marginHorizontal: 16, backgroundColor: '#fff',
    borderRadius: 22, paddingVertical: 14, alignItems: 'center',
  },
  cikisText: { fontSize: 14, fontWeight: '800', color: '#e85a43' },
});
