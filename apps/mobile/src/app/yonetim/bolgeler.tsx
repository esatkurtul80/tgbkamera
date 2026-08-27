import { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import { getBolgeler, getKullanicilar, createBolge, updateBolge, deleteBolge } from '@/lib/firestore';
import { Girdi, TekSecim, AnahtarSatir, FormSayfasi } from '@/components/yonetim';
import type { Bolge, Kullanici } from '@/lib/types';

/** Bölgeler yönetimi — webdeki /bolgeler sayfasının natif karşılığı. */
export default function BolgelerScreen() {
  const [bolgeler, setBolgeler] = useState<Bolge[]>([]);
  const [mudurler, setMudurler] = useState<Kullanici[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<{ id?: string; ad: string; aciklama: string; bolgeMuduruId?: string; aktif: boolean } | null>(null);
  const [kaydediyor, setKaydediyor] = useState(false);

  const load = useCallback(async () => {
    try {
      const [b, k] = await Promise.all([getBolgeler(), getKullanicilar()]);
      setBolgeler(b);
      setMudurler(k.filter((x) => x.rol === 'bolge_muduru' && x.aktif !== false));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const mudurAdi = (id?: string) => mudurler.find((m) => m.id === id)?.displayName;

  async function kaydet() {
    if (!form || !form.ad.trim()) { Alert.alert('Eksik bilgi', 'Bölge adı zorunludur.'); return; }
    setKaydediyor(true);
    try {
      if (form.id) {
        await updateBolge(form.id, { ad: form.ad.trim(), aciklama: form.aciklama.trim() || undefined, bolgeMuduruId: form.bolgeMuduruId, aktif: form.aktif });
      } else {
        await createBolge({ ad: form.ad.trim(), aciklama: form.aciklama.trim() || undefined, bolgeMuduruId: form.bolgeMuduruId });
      }
      setForm(null);
      await load();
    } catch (e: any) {
      Alert.alert('Hata', e?.message ?? 'Kaydedilemedi');
    } finally {
      setKaydediyor(false);
    }
  }

  function sil(b: Bolge) {
    Alert.alert('Bölgeyi Sil', `"${b.ad}" kalıcı olarak silinecek. Emin misiniz?`, [
      { text: 'İptal', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => { await deleteBolge(b.id); load(); } },
    ]);
  }

  return (
    <View style={st.container}>
      <Stack.Screen options={{ headerShown: true, title: 'Bölgeler', headerBackTitle: 'Geri', headerTintColor: '#4f46e5', headerStyle: { backgroundColor: '#ffffff' }, headerShadowVisible: false }} />
      <TouchableOpacity style={st.yeniBtn} onPress={() => setForm({ ad: '', aciklama: '', aktif: true })} activeOpacity={0.85}>
        <Text style={st.yeniBtnText}>+ Yeni Bölge</Text>
      </TouchableOpacity>
      {loading ? (
        <ActivityIndicator color="#4f46e5" size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={bolgeler}
          keyExtractor={(b) => b.id}
          contentContainerStyle={{ paddingBottom: 30 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={st.satir}
              activeOpacity={0.7}
              onPress={() => setForm({ id: item.id, ad: item.ad, aciklama: item.aciklama ?? '', bolgeMuduruId: item.bolgeMuduruId, aktif: item.aktif !== false })}
              onLongPress={() => sil(item)}
              delayLongPress={450}
            >
              <View style={{ flex: 1 }}>
                <Text style={st.ad}>{item.ad}</Text>
                <Text style={st.alt}>
                  {mudurAdi(item.bolgeMuduruId) ? `Müdür: ${mudurAdi(item.bolgeMuduruId)}` : 'Müdür atanmamış'}
                  {item.aktif === false ? '  ·  PASİF' : ''}
                </Text>
              </View>
              <Text style={st.ok}>›</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={st.bos}>Henüz bölge yok</Text>}
        />
      )}

      <FormSayfasi
        acik={!!form}
        baslik={form?.id ? 'Bölgeyi Düzenle' : 'Yeni Bölge'}
        onKapat={() => setForm(null)}
        onKaydet={kaydet}
        kaydediyor={kaydediyor}
      >
        {form && (
          <>
            <Girdi etiket="Bölge Adı" deger={form.ad} onChange={(v) => setForm({ ...form, ad: v })} zorunlu />
            <Girdi etiket="Açıklama" deger={form.aciklama} onChange={(v) => setForm({ ...form, aciklama: v })} coklu />
            <TekSecim
              etiket="Bölge Müdürü"
              deger={form.bolgeMuduruId}
              secenekler={mudurler.map((m) => ({ id: m.id, ad: m.displayName }))}
              onSelect={(id) => setForm({ ...form, bolgeMuduruId: id })}
              bosEtiket="Müdür atanmasın"
            />
            {form.id ? <AnahtarSatir etiket="Aktif" deger={form.aktif} onChange={(v) => setForm({ ...form, aktif: v })} /> : null}
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
