import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';

// Google Sign-In Configuration
// Lütfen Firebase Console > Authentication > Google > Web SDK Configuration altındaki Web Client ID değerini buraya girin.
const WEB_CLIENT_ID = '14088134036-ujn0382j6p2mle68l912u912v82l81m0.apps.googleusercontent.com';

GoogleSignin.configure({
  webClientId: WEB_CLIENT_ID,
  offlineAccess: true,
});

export default function LoginScreen() {
  const { signInWithEmail, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password) return;
    setLoading(true);
    try {
      await signInWithEmail(email.trim(), password);
    } catch (err: any) {
      const msg =
        err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found'
          ? 'E-posta veya şifre hatalı.'
          : err.code === 'auth/too-many-requests'
          ? 'Çok fazla deneme. Lütfen bekleyin.'
          : 'Giriş başarısız. Tekrar deneyin.';
      Alert.alert('Giriş Hatası', msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
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

        {/* Kart */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Giriş Yap</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>E-posta</Text>
            <TextInput
              style={styles.input}
              placeholder="ornek@firma.com"
              placeholderTextColor="#94a3b8"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              value={email}
              onChangeText={setEmail}
              editable={!loading}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Şifre</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#94a3b8"
              secureTextEntry
              autoComplete="password"
              value={password}
              onChangeText={setPassword}
              editable={!loading}
              onSubmitEditing={handleLogin}
            />
          </View>

          <TouchableOpacity
            style={[styles.btn, (!email || !password || loading) && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={!email || !password || loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.btnText}>Giriş Yap</Text>
            )}
          </TouchableOpacity>

          {/* Separator */}
          <View style={styles.separator}>
            <View style={styles.separatorLine} />
            <Text style={styles.separatorText}>veya</Text>
            <View style={styles.separatorLine} />
          </View>

          {/* Google Sign-in Button */}
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
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 20 },
  fieldGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0f172a',
    backgroundColor: '#fff',
  },
  btn: {
    marginTop: 8,
    backgroundColor: '#4f46e5',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  separatorText: {
    color: '#94a3b8',
    fontSize: 13,
    paddingHorizontal: 12,
    fontWeight: '500',
  },
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
