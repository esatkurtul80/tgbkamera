import { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import { getCopKutusu, restoreDegerlendirmeFromCopKutusu } from '@/lib/firestore';
import { useAuth } from '@/contexts/AuthContext';
import ErisimYok from '@/components/erisim-yok';
import type { CopKutusuKaydi } from '@/lib/types';

/** Çöp Kutusu — webdeki /cop-kutusu sayfasının natif karşılığı.
 *  Kayıtlar 30 gün sonra otomatik silinir; buradan geri yüklenebilir.
 *  Bölge müdürü (salt okunur) erişemez. */
export default function CopKutusuScreen() {
  const { kullanici } = useAuth();
  if (kullanici?.rol === 'bolge_muduru') return <ErisimYok />;
  return <CopKutusuIcerik />;
}

function CopKutusuIcerik() {
  const [kayitlar, setKayitlar] = useState<CopKutusuKaydi[]>([]);
  const [loading, setLoading] = useState(true);
  const [isleniyor, setIsleniyor] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setKayitlar(await getCopKutusu()); } finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  function geriYukle(k: CopKutusuKaydi) {
    Alert.alert('Geri Yükle', `${k.personelAd} — ${k.formAd} raporu değerlendirmelere geri taşınacak. Onaylıyor musunuz?`, [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Geri Yükle',
        onPress: async () => {
          setIsleniyor(k.id);
          try {
            await restoreDegerlendirmeFromCopKutusu(k.id);
            await load();
          } catch (e: any) {
            Alert.alert('Hata', e?.message ?? 'Geri yüklenemedi');
          } finally {
            setIsleniyor(null);
          }
        },
      },
    ]);
  }

  return (
    <View style={st.container}>
      <Stack.Screen options={{ headerShown: true, title: 'Çöp Kutusu', headerBackTitle: 'Geri', headerTintColor: '#4f46e5', headerStyle: { backgroundColor: '#ffffff' }, headerShadowVisible: false }} />
      <Text style={st.bilgi}>Silinen raporlar 30 gün saklanır, sonra otomatik olarak kalıcı silinir.</Text>
      {loading ? (
        <ActivityIndicator color="#4f46e5" size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={kayitlar}
          keyExtractor={(k) => k.id}
          contentContainerStyle={{ paddingBottom: 30 }}
          renderItem={({ item }) => {
            const silinme = item.silinmeTarihi?.toDate?.().toLocaleDateString('tr-TR') ?? '—';
            return (
              <View style={st.satir}>
                <View style={{ flex: 1 }}>
                  <Text style={st.ad}>{item.personelAd}</Text>
                  <Text style={st.alt} numberOfLines={1}>{item.formAd} · {item.magazaAd || '—'}</Text>
                  <Text style={st.silinme}>
                    {silinme} tarihinde {item.silenKullaniciAd || 'bilinmeyen'} sildi
                  </Text>
                </View>
                <TouchableOpacity
                  style={[st.geriBtn, isleniyor === item.id && { opacity: 0.5 }]}
                  disabled={isleniyor !== null}
                  onPress={() => geriYukle(item)}
                >
                  <Text style={st.geriBtnText}>{isleniyor === item.id ? '...' : '↩ Geri Yükle'}</Text>
                </TouchableOpacity>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={st.bosWrap}>
              <Text style={st.bosIcon}>🗑️</Text>
              <Text style={st.bos}>Çöp kutusu boş</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  bilgi: { fontSize: 12, color: '#94a3b8', paddingHorizontal: 20, paddingVertical: 12 },
  satir: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff',
    marginHorizontal: 16, marginBottom: 8, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#f1f5f9',
  },
  ad: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  alt: { fontSize: 12, color: '#64748b', marginTop: 2 },
  silinme: { fontSize: 11, color: '#f59e0b', marginTop: 3 },
  geriBtn: { backgroundColor: '#ecfdf5', borderWidth: 1, borderColor: '#a7f3d0', borderRadius: 9, paddingHorizontal: 11, paddingVertical: 8 },
  geriBtnText: { fontSize: 12, fontWeight: '700', color: '#059669' },
  bosWrap: { alignItems: 'center', marginTop: 60, gap: 10 },
  bosIcon: { fontSize: 40 },
  bos: { color: '#94a3b8', fontSize: 14 },
});
