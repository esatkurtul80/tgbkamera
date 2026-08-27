import { useEffect, useRef } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Google web köprüsünden (mobil-giris.html) dönüş rotası: exp://.../--/auth?idToken=...
 * Normalde dönüşü login ekranındaki WebBrowser.openAuthSessionAsync yakalar; bu rota,
 * oturum dinleyicisi kaçırırsa (uygulama yeniden yüklendi, tarayıcı oturumu koptu vb.)
 * derin bağlantının "Unmatched Route" hatasına düşmemesi için güvenlik ağıdır.
 */
export default function AuthCallbackScreen() {
  const router = useRouter();
  const { user, signInWithGoogle } = useAuth();
  const params = useLocalSearchParams<{ idToken?: string }>();
  const url = Linking.useURL();
  const islendi = useRef(false);

  useEffect(() => {
    if (islendi.current) return;

    // Zaten girişliyse (dönüşü login ekranı yakalayıp işledi) ana ekrana geç
    if (user) {
      islendi.current = true;
      router.replace('/(tabs)');
      return;
    }

    // idToken query'de (?idToken=) veya eski biçimde fragment'ta (#idToken=) gelebilir
    let idToken = typeof params.idToken === 'string' && params.idToken ? params.idToken : null;
    if (!idToken && url) {
      const m = url.match(/[?#&]idToken=([^&#]+)/);
      idToken = m ? decodeURIComponent(m[1]) : null;
    }

    if (!idToken) {
      islendi.current = true;
      router.replace('/login');
      return;
    }

    islendi.current = true;
    signInWithGoogle(idToken)
      .then(() => router.replace('/(tabs)'))
      .catch(() => router.replace('/login'));
  }, [user, params.idToken, url, router, signInWithGoogle]);

  return (
    <View style={styles.wrap}>
      <ActivityIndicator size="large" color="#4f46e5" />
      <Text style={styles.text}>Giriş tamamlanıyor…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', gap: 14 },
  text: { fontSize: 15, color: '#475569', fontWeight: '500' },
});
