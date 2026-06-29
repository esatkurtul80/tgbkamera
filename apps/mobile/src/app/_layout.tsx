import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

function AuthGuard() {
  const { user, kullanici, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuth = segments[0] === 'login';

    if (!user && !inAuth) {
      router.replace('/login');
    } else if (user && inAuth) {
      router.replace('/(tabs)');
    }
  }, [user, loading, segments]);

  return null;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AuthGuard />
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="yeni"
          options={{
            headerShown: true,
            title: 'Yeni Değerlendirme',
            headerBackTitle: 'Geri',
            headerTintColor: '#4f46e5',
            headerStyle: { backgroundColor: '#ffffff' },
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="degerlendirme/[id]"
          options={{
            headerShown: true,
            title: 'Değerlendirme',
            headerBackTitle: 'Geri',
            headerTintColor: '#4f46e5',
            headerStyle: { backgroundColor: '#ffffff' },
            headerShadowVisible: false,
          }}
        />
      </Stack>
    </AuthProvider>
  );
}
