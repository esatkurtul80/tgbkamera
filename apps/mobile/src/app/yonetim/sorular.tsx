import { useCallback, useMemo, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import { getSorular, createSoru, updateSoru, deleteSoru } from '@/lib/firestore';
import { Girdi, TekSecim, FormSayfasi } from '@/components/yonetim';
import type { Soru, SoruTipi } from '@/lib/types';

const TIPLER: { id: SoruTipi; ad: string }[] = [
  { id: 'evet_hayir_muaf', ad: 'Evet / Hayır / Muaf (puanlı)' },
  { id: 'sayi', ad: 'Sayı' },
  { id: 'tarih', ad: 'Tarih' },
  { id: 'saat', ad: 'Saat' },
  { id: 'kisa_metin', ad: 'Kısa Metin' },
  { id: 'yorum', ad: 'Yorum' },
];

/** Sorular yönetimi — webdeki /sorular sayfasının natif karşılığı. */
export default function SorularScreen() {
  const [sorular, setSorular] = useState<Soru[]>([]);
  const [loading, setLoading] = useState(true);
  const [arama, setArama] = useState('');
  const [form, setForm] = useState<{ id?: string; metin: string; puan: string; hedefYuzde: string; tip: SoruTipi } | null>(null);
  const [kaydediyor, setKaydediyor] = useState(false);

  const load = useCallback(async () => {
    try { setSorular(await getSorular()); } finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtreli = useMemo(
    () => (arama.trim() ? sorular.filter((q) => q.metin.toLowerCase().includes(arama.toLowerCase())) : sorular),
    [sorular, arama]
  );

  const tipAdi = (tip?: SoruTipi) => TIPLER.find((t) => t.id === (tip ?? 'evet_hayir_muaf'))?.ad ?? '';

  async function kaydet() {
    if (!form || !form.metin.trim()) { Alert.alert('Eksik bilgi', 'Soru metni zorunludur.'); return; }
    const puan = Number(form.puan) || 0;
    const hedef = form.hedefYuzde.trim() === '' ? undefined : Number(form.hedefYuzde);
    if (hedef !== undefined && (!Number.isFinite(hedef) || hedef < 0 || hedef > 100)) {
      Alert.alert('Hatalı değer', 'Hedef yüzde 0-100 arasında olmalı.');
      return;
    }
    setKaydediyor(true);
    try {
      const veri = { metin: form.metin.trim(), puan, hedefYuzde: hedef, tip: form.tip };
      if (form.id) await updateSoru(form.id, veri);
      else await createSoru(veri);
      setForm(null);
      await load();
    } catch (e: any) {
      Alert.alert('Hata', e?.message ?? 'Kaydedilemedi');
    } finally {
      setKaydediyor(false);
    }
  }

  function sil(q: Soru) {
    Alert.alert('Soruyu Sil', 'Bu soru kalıcı olarak silinecek. Emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => { await deleteSoru(q.id); load(); } },
    ]);
  }

  return (
    <View style={st.container}>
      <Stack.Screen options={{ headerShown: true, title: 'Sorular', headerBackTitle: 'Geri', headerTintColor: '#4f46e5', headerStyle: { backgroundColor: '#ffffff' }, headerShadowVisible: false }} />
      <View style={st.ustSatir}>
        <TextInput style={st.arama} placeholder="Soru ara..." placeholderTextColor="#94a3b8" value={arama} onChangeText={setArama} />
        <TouchableOpacity
          style={st.yeniBtn}
          onPress={() => setForm({ metin: '', puan: '10', hedefYuzde: '', tip: 'evet_hayir_muaf' })}
        >
          <Text style={st.yeniBtnText}>+ Yeni</Text>
        </TouchableOpacity>
      </View>
      {loading ? (
        <ActivityIndicator color="#4f46e5" size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtreli}
          keyExtractor={(q) => q.id}
          contentContainerStyle={{ paddingBottom: 30 }}
          renderItem={({ item }) => {
            const puanliMi = !item.tip || item.tip === 'evet_hayir_muaf';
            return (
              <TouchableOpacity
                style={st.satir}
                activeOpacity={0.7}
                onPress={() => setForm({ id: item.id, metin: item.metin, puan: String(item.puan ?? 0), hedefYuzde: item.hedefYuzde !== undefined ? String(item.hedefYuzde) : '', tip: item.tip ?? 'evet_hayir_muaf' })}
                onLongPress={() => sil(item)}
                delayLongPress={450}
              >
                <View style={{ flex: 1 }}>
                  <Text style={st.metin} numberOfLines={2}>{item.metin}</Text>
                  <Text style={st.alt}>
                    {tipAdi(item.tip)}
                    {puanliMi ? `  ·  ${item.puan} puan${item.hedefYuzde !== undefined ? `  ·  Hedef %${item.hedefYuzde}` : ''}` : ''}
                  </Text>
                </View>
                <Text style={st.ok}>›</Text>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={<Text style={st.bos}>{arama ? 'Sonuç yok' : 'Henüz soru yok'}</Text>}
        />
      )}

      <FormSayfasi acik={!!form} baslik={form?.id ? 'Soruyu Düzenle' : 'Yeni Soru'} onKapat={() => setForm(null)} onKaydet={kaydet} kaydediyor={kaydediyor}>
        {form && (
          <>
            <Girdi etiket="Soru Metni" deger={form.metin} onChange={(v) => setForm({ ...form, metin: v })} coklu zorunlu />
            <TekSecim
              etiket="Soru Tipi"
              deger={form.tip}
              secenekler={TIPLER}
              onSelect={(id) => setForm({ ...form, tip: (id as SoruTipi) ?? 'evet_hayir_muaf' })}
            />
            {(form.tip === 'evet_hayir_muaf') && (
              <>
                <Girdi etiket="Puan" deger={form.puan} onChange={(v) => setForm({ ...form, puan: v })} sayisal zorunlu />
                <Girdi etiket="Hedef Yüzde (boş = %100)" deger={form.hedefYuzde} onChange={(v) => setForm({ ...form, hedefYuzde: v })} sayisal />
              </>
            )}
          </>
        )}
      </FormSayfasi>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  ustSatir: { flexDirection: 'row', gap: 10, padding: 16, paddingBottom: 10 },
  arama: {
    flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#0f172a',
  },
  yeniBtn: { backgroundColor: '#4f46e5', borderRadius: 12, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  yeniBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  satir: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    marginHorizontal: 16, marginBottom: 8, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#f1f5f9',
  },
  metin: { fontSize: 13.5, fontWeight: '600', color: '#0f172a', lineHeight: 19 },
  alt: { fontSize: 11.5, color: '#94a3b8', marginTop: 3 },
  ok: { fontSize: 22, color: '#cbd5e1', fontWeight: '300', marginLeft: 8 },
  bos: { textAlign: 'center', color: '#94a3b8', marginTop: 40, fontSize: 14 },
});
