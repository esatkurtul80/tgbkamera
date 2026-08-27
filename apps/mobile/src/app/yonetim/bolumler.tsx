import { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import { getBolumler, getSorular, createBolum, updateBolum, deleteBolum } from '@/lib/firestore';
import { Girdi, CokluSecim, FormSayfasi } from '@/components/yonetim';
import type { Bolum, Soru } from '@/lib/types';

/** Bölümler yönetimi — webdeki /bolumler sayfasının natif karşılığı
 *  (soru sıralaması yukarı/aşağı oklarla; webdeki sürükle-bırakın karşılığı). */
export default function BolumlerScreen() {
  const [bolumler, setBolumler] = useState<Bolum[]>([]);
  const [sorular, setSorular] = useState<Soru[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<{ id?: string; ad: string; aciklama: string; soruIdleri: string[] } | null>(null);
  const [kaydediyor, setKaydediyor] = useState(false);

  const load = useCallback(async () => {
    try {
      const [b, s] = await Promise.all([getBolumler(), getSorular()]);
      setBolumler(b);
      setSorular(s);
    } finally {
      setLoading(false);
    }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function kaydet() {
    if (!form || !form.ad.trim()) { Alert.alert('Eksik bilgi', 'Bölüm adı zorunludur.'); return; }
    setKaydediyor(true);
    try {
      const veri = { ad: form.ad.trim(), aciklama: form.aciklama.trim(), soruIdleri: form.soruIdleri };
      if (form.id) await updateBolum(form.id, veri);
      else await createBolum(veri);
      setForm(null);
      await load();
    } catch (e: any) {
      Alert.alert('Hata', e?.message ?? 'Kaydedilemedi');
    } finally {
      setKaydediyor(false);
    }
  }

  function sil(b: Bolum) {
    Alert.alert('Bölümü Sil', `"${b.ad}" kalıcı olarak silinecek. Emin misiniz?`, [
      { text: 'İptal', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => { await deleteBolum(b.id); load(); } },
    ]);
  }

  return (
    <View style={st.container}>
      <Stack.Screen options={{ headerShown: true, title: 'Bölümler', headerBackTitle: 'Geri', headerTintColor: '#4f46e5', headerStyle: { backgroundColor: '#ffffff' }, headerShadowVisible: false }} />
      <TouchableOpacity style={st.yeniBtn} onPress={() => setForm({ ad: '', aciklama: '', soruIdleri: [] })} activeOpacity={0.85}>
        <Text style={st.yeniBtnText}>+ Yeni Bölüm</Text>
      </TouchableOpacity>
      {loading ? (
        <ActivityIndicator color="#4f46e5" size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={bolumler}
          keyExtractor={(b) => b.id}
          contentContainerStyle={{ paddingBottom: 30 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={st.satir}
              activeOpacity={0.7}
              onPress={() => setForm({ id: item.id, ad: item.ad, aciklama: item.aciklama ?? '', soruIdleri: item.soruIdleri ?? [] })}
              onLongPress={() => sil(item)}
              delayLongPress={450}
            >
              <View style={{ flex: 1 }}>
                <Text style={st.ad}>{item.ad}</Text>
                <Text style={st.alt}>{item.soruIdleri?.length ?? 0} soru{item.aciklama ? `  ·  ${item.aciklama}` : ''}</Text>
              </View>
              <Text style={st.ok}>›</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={st.bos}>Henüz bölüm yok</Text>}
        />
      )}

      <FormSayfasi acik={!!form} baslik={form?.id ? 'Bölümü Düzenle' : 'Yeni Bölüm'} onKapat={() => setForm(null)} onKaydet={kaydet} kaydediyor={kaydediyor}>
        {form && (
          <>
            <Girdi etiket="Bölüm Adı" deger={form.ad} onChange={(v) => setForm({ ...form, ad: v })} zorunlu />
            <Girdi etiket="Açıklama" deger={form.aciklama} onChange={(v) => setForm({ ...form, aciklama: v })} coklu />
            <CokluSecim
              etiket="Sorular (sıralı)"
              seciliIdler={form.soruIdleri}
              secenekler={sorular.map((s) => ({ id: s.id, ad: s.metin }))}
              onChange={(idler) => setForm({ ...form, soruIdleri: idler })}
              sirali
            />
          </>
        )}
      </FormSayfasi>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  yeniBtn: { margin: 16, backgroundColor: '#4f46e5', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  yeniBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  satir: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    marginHorizontal: 16, marginBottom: 8, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#f1f5f9',
  },
  ad: { fontSize: 14.5, fontWeight: '700', color: '#0f172a' },
  alt: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  ok: { fontSize: 22, color: '#cbd5e1', fontWeight: '300' },
  bos: { textAlign: 'center', color: '#94a3b8', marginTop: 40, fontSize: 14 },
});
