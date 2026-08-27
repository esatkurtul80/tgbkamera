import { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import { getFormlar, getBolumler, createForm, updateForm, deleteForm } from '@/lib/firestore';
import { Girdi, CokluSecim, TekSecim, AnahtarSatir, FormSayfasi } from '@/components/yonetim';
import type { Form, Bolum, SkorlamaSistemi } from '@/lib/types';

/** Formlar yönetimi — webdeki /formlar sayfasının natif karşılığı. */
export default function FormlarScreen() {
  const [formlar, setFormlar] = useState<Form[]>([]);
  const [bolumler, setBolumler] = useState<Bolum[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<{
    id?: string; ad: string; aciklama: string; puanli: boolean;
    puanGirisTipi: 'otomatik' | 'manuel'; skorlamaSistemi: SkorlamaSistemi; bolumIdleri: string[];
  } | null>(null);
  const [kaydediyor, setKaydediyor] = useState(false);

  const load = useCallback(async () => {
    try {
      const [f, b] = await Promise.all([getFormlar(), getBolumler()]);
      setFormlar(f);
      setBolumler(b);
    } finally {
      setLoading(false);
    }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const tipEtiketi = (f: Form) =>
    f.puanli ? (f.puanGirisTipi === 'manuel' ? 'Yorumlu Puanlı' : 'Puanlı · Aylık Matris') : 'Puansız';

  async function kaydet() {
    if (!form || !form.ad.trim()) { Alert.alert('Eksik bilgi', 'Form adı zorunludur.'); return; }
    setKaydediyor(true);
    try {
      const veri = {
        ad: form.ad.trim(),
        aciklama: form.aciklama.trim(),
        puanli: form.puanli,
        puanGirisTipi: form.puanli ? form.puanGirisTipi : undefined,
        skorlamaSistemi: form.puanli && form.puanGirisTipi !== 'manuel' ? form.skorlamaSistemi : undefined,
        bolumIdleri: form.bolumIdleri,
      };
      if (form.id) await updateForm(form.id, veri);
      else await createForm(veri);
      setForm(null);
      await load();
    } catch (e: any) {
      Alert.alert('Hata', e?.message ?? 'Kaydedilemedi');
    } finally {
      setKaydediyor(false);
    }
  }

  function sil(f: Form) {
    Alert.alert('Formu Sil', `"${f.ad}" kalıcı olarak silinecek. Emin misiniz?`, [
      { text: 'İptal', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => { await deleteForm(f.id); load(); } },
    ]);
  }

  return (
    <View style={st.container}>
      <Stack.Screen options={{ headerShown: true, title: 'Formlar', headerBackTitle: 'Geri', headerTintColor: '#4f46e5', headerStyle: { backgroundColor: '#ffffff' }, headerShadowVisible: false }} />
      <TouchableOpacity
        style={st.yeniBtn}
        onPress={() => setForm({ ad: '', aciklama: '', puanli: true, puanGirisTipi: 'otomatik', skorlamaSistemi: 'oran', bolumIdleri: [] })}
        activeOpacity={0.85}
      >
        <Text style={st.yeniBtnText}>+ Yeni Form</Text>
      </TouchableOpacity>
      {loading ? (
        <ActivityIndicator color="#4f46e5" size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={formlar}
          keyExtractor={(f) => f.id}
          contentContainerStyle={{ paddingBottom: 30 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={st.satir}
              activeOpacity={0.7}
              onPress={() =>
                setForm({
                  id: item.id, ad: item.ad, aciklama: item.aciklama ?? '',
                  puanli: item.puanli, puanGirisTipi: item.puanGirisTipi ?? 'otomatik',
                  skorlamaSistemi: item.skorlamaSistemi ?? 'oran', bolumIdleri: item.bolumIdleri ?? [],
                })
              }
              onLongPress={() => sil(item)}
              delayLongPress={450}
            >
              <View style={{ flex: 1 }}>
                <Text style={st.ad}>{item.ad}</Text>
                <Text style={st.alt}>{tipEtiketi(item)}  ·  {item.bolumIdleri?.length ?? 0} bölüm</Text>
              </View>
              <Text style={st.ok}>›</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={st.bos}>Henüz form yok</Text>}
        />
      )}

      <FormSayfasi acik={!!form} baslik={form?.id ? 'Formu Düzenle' : 'Yeni Form'} onKapat={() => setForm(null)} onKaydet={kaydet} kaydediyor={kaydediyor}>
        {form && (
          <>
            <Girdi etiket="Form Adı" deger={form.ad} onChange={(v) => setForm({ ...form, ad: v })} zorunlu />
            <Girdi etiket="Açıklama" deger={form.aciklama} onChange={(v) => setForm({ ...form, aciklama: v })} coklu />
            <AnahtarSatir etiket="Puanlı Form" deger={form.puanli} onChange={(v) => setForm({ ...form, puanli: v })} />
            {form.puanli && (
              <>
                <TekSecim
                  etiket="Puan Giriş Tipi"
                  deger={form.puanGirisTipi}
                  secenekler={[
                    { id: 'otomatik', ad: 'Otomatik (Aylık Matris)' },
                    { id: 'manuel', ad: 'Manuel (Yorumlu Puanlı)' },
                  ]}
                  onSelect={(id) => setForm({ ...form, puanGirisTipi: (id as 'otomatik' | 'manuel') ?? 'otomatik' })}
                />
                {form.puanGirisTipi !== 'manuel' && (
                  <TekSecim
                    etiket="Skorlama Sistemi"
                    deger={form.skorlamaSistemi}
                    secenekler={[
                      { id: 'oran', ad: 'Oran Bazlı' },
                      { id: 'esik', ad: 'Eşik Bazlı' },
                    ]}
                    onSelect={(id) => setForm({ ...form, skorlamaSistemi: (id as SkorlamaSistemi) ?? 'oran' })}
                  />
                )}
              </>
            )}
            <CokluSecim
              etiket="Bölümler (sıralı)"
              seciliIdler={form.bolumIdleri}
              secenekler={bolumler.map((b) => ({ id: b.id, ad: b.ad }))}
              onChange={(idler) => setForm({ ...form, bolumIdleri: idler })}
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
