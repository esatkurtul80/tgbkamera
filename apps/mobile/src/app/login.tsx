import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

// Google Sign-In Configuration
// Lütfen Firebase Console > Authentication > Google > Web SDK Configuration altındaki Web Client ID değerini buraya girin.
const WEB_CLIENT_ID = '14088134036-fhlf47rs02g3o38s552inaj59oc3eolm.apps.googleusercontent.com';

// Google Sign-In native bir modül ve Expo Go içinde bulunmaz.
// Expo Go'da import anında hata fırlattığı için sadece dev build'de yüklüyoruz.
const isExpoGo = Constants.executionEnvironment === 'storeClient';

let GoogleSignin: any = null;
let statusCodes: Record<string, string> = {};
if (!isExpoGo) {
  try {
    const mod = require('@react-native-google-signin/google-signin');
    GoogleSignin = mod.GoogleSignin;
    statusCodes = mod.statusCodes;
    GoogleSignin.configure({
      webClientId: WEB_CLIENT_ID,
      offlineAccess: true,
    });
  } catch {
    // Native modül yok — Google ile giriş devre dışı kalır, e-posta girişi çalışmaya devam eder.
    GoogleSignin = null;
  }
}

export default function LoginScreen() {
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);

  // Expo Go'da native Google Sign-In modülü yok; tarayıcı üzerinden Firebase
  // Hosting'deki köprü sayfası (mobil-giris.html) ile Google OAuth akışı yapılır.
  async function handleGoogleLoginViaWeb() {
    try {
      setLoading(true);
      const returnUrl = Linking.createURL('auth');
      // t= parametresi tarayıcının sayfanın eski kopyasını önbellekten kullanmasını engeller
      const authUrl =
        'https://tgbkamera.firebaseapp.com/mobil-giris.html?returnUrl=' +
        encodeURIComponent(returnUrl) +
        '&t=' + Date.now();
      const result = await WebBrowser.openAuthSessionAsync(authUrl, returnUrl);
      if (result.type !== 'success' || !result.url) {
        return; // kullanıcı iptal etti
      }
      const match = result.url.match(/[?#&]idToken=([^&#]+)/);
      const idToken = match ? decodeURIComponent(match[1]) : null;
      if (!idToken) {
        throw new Error('Google Kimlik Doğrulama Belgesi (ID Token) alınamadı.');
      }
      await signInWithGoogle(idToken);
    } catch (err: any) {
      Alert.alert('Giriş Hatası', err.message || 'Google ile giriş yapılırken hata oluştu.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    if (!GoogleSignin) {
      return handleGoogleLoginViaWeb();
    }
    try {
      setLoading(true);
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      const idToken = response.data?.idToken || response.idToken;
      if (!idToken) {
        throw new Error('Google Kimlik Doğrulama Belgesi (ID Token) alınamadı.');
      }
      await signInWithGoogle(idToken);
    } catch (err: any) {
      if (err.code === statusCodes.SIGN_IN_CANCELLED) {
        // Kullanıcı iptal etti
      } else if (err.code === statusCodes.IN_PROGRESS) {
        Alert.alert('Giriş Yapılıyor', 'Giriş işlemi zaten devam ediyor.');
      } else if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert('Hata', 'Google Play Hizmetleri bu cihazda kullanılamıyor.');
      } else {
        Alert.alert('Giriş Hatası', err.message || 'Google ile giriş yapılırken hata oluştu.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={styles.logoWrap}>
          <View style={styles.logoBox}>
            <Text style={styles.logoIcon}>🎥</Text>
          </View>
          <Text style={styles.logoText}>TGB Kamera</Text>
          <Text style={styles.logoSub}>Değerlendirme Sistemi</Text>
        </View>

        {/* Kart — yalnızca Google ile giriş */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Giriş Yap</Text>
          <Text style={styles.cardSub}>Şirket Google hesabınızla devam edin</Text>

          <TouchableOpacity
            style={[styles.googleBtn, loading && styles.googleBtnDisabled]}
            onPress={handleGoogleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#4f46e5" size="small" />
            ) : (
              <View style={styles.googleBtnContent}>
                <Text style={styles.googleIconText}>G</Text>
                <Text style={styles.googleBtnText}>Google ile Giriş Yap</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#f8fafc' },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  logoWrap: { alignItems: 'center', marginBottom: 40 },
  logoBox: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  logoIcon: { fontSize: 32 },
  logoText: { fontSize: 26, fontWeight: '800', color: '#0f172a', letterSpacing: -0.5 },
  logoSub: { fontSize: 13, color: '#94a3b8', marginTop: 4 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  cardSub: { fontSize: 13, color: '#94a3b8', marginBottom: 20 },
  googleBtn: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  googleBtnDisabled: { opacity: 0.6 },
  googleBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIconText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#4285F4',
    marginRight: 10,
  },
  googleBtnText: {
    color: '#475569',
    fontSize: 15,
    fontWeight: '700',
  },
});
