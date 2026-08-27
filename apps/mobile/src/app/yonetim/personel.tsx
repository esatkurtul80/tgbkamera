import { useCallback, useMemo, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { getPersoneller, getMagazalar, createPersonel, updatePersonel } from '@/lib/firestore';
import { Girdi, CokluSecim, AnahtarSatir, FormSayfasi } from '@/components/yonetim';
import ErisimYok from '@/components/erisim-yok';
import type { Personel, Magaza } from '@/lib/types';

/** Personel yönetimi — webdeki /personel sayfasının natif karşılığı.
 *  Kameraman rolü için salt-okunur havuz görünümüdür; bölge müdürü erişemez. */
export default function PersonelScreen() {
  const { kullanici } = useAuth();
  // Hook kurallarını bozmamak için engel, içerik bileşeninin DIŞINDA verilir
  if (kullanici?.rol === 'bolge_muduru') return <ErisimYok />;
  return <PersonelIcerik />;
}

function PersonelIcerik() {
  const { kullanici } = useAuth();
  const duzenleyebilir = kullanici?.rol !== 'kameraman';

  const [personeller, setPersoneller] = useState<Personel[]>([]);
  const [magazalar, setMagazalar] = useState<Magaza[]>([]);
  const [loading, setLoading] = useState(true);
  const [arama, setArama] = useState('');
  const [form, setForm] = useState<{ id?: string; ad: string; tc: string; magazaIdleri: string[]; aktif: boolean } | null>(null);
  const [kaydediyor, setKaydediyor] = useState(false);

  const load = useCallback(async () => {
    try {
      const [p, m] = await Promise.all([getPersoneller(), getMagazalar()]);
      setPersoneller(p);
      setMagazalar(m);
    } finally {
      setLoading(false);
    }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtreli = useMemo(
    () => (arama.trim() ? personeller.filter((p) => p.ad.toLowerCase().includes(arama.toLowerCase())) : personeller),
    [personeller, arama]
  );

  async function kaydet() {
    if (!form || !form.ad.trim()) { Alert.alert('Eksik bilgi', 'Personel adı zorunludur.'); return; }
    setKaydediyor(true);
    try {
      if (form.id) {
        await updatePersonel(form.id, { ad: form.ad.trim(), tc: form.tc.trim(), magazaIdleri: form.magazaIdleri, aktif: form.aktif });
      } else {
        await createPersonel({ ad: form.ad.trim(), tc: form.tc.trim(), magazaIdleri: form.magazaIdleri });
      }
      setForm(null);
      await load();
    } catch (e: any) {
      Alert.alert('Hata', e?.message ?? 'Kaydedilemedi');
    } finally {
      setKaydediyor(false);
    }
  }

  return (
    <View style={st.container}>
      <Stack.Screen options={{ headerShown: true, title: duzenleyebilir ? 'Personel' : 'Personel Havuzu', headerBackTitle: 'Geri', headerTintColor: '#4f46e5', headerStyle: { backgroundColor: '#ffffff' }, headerShadowVisible: false }} />
      <View style={st.ustSatir}>
        <TextInput style={st.arama} placeholder="Personel ara..." placeholderTextColor="#94a3b8" value={arama} onChangeText={setArama} />
        {duzenleyebilir && (
          <TouchableOpacity style={st.yeniBtn} onPress={() => setForm({ ad: '', tc: '', magazaIdleri: [], aktif: true })}>
            <Text style={st.yeniBtnText}>+ Yeni</Text>
          </TouchableOpacity>
        )}
      </View>
      {loading ? (
        <ActivityIndicator color="#4f46e5" size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtreli}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ paddingBottom: 30 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[st.satir, item.aktif === false && { opacity: 0.55 }]}
              activeOpacity={0.7}
              disabled={!duzenleyebilir}
              onPress={() => setForm({ id: item.id, ad: item.ad, tc: item.tc ?? '', magazaIdleri: item.magazaIdleri ?? [], aktif: item.aktif !== false })}
            >
              <View style={st.avatar}><Text style={st.avatarText}>{item.ad.charAt(0).toUpperCase()}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={st.ad}>{item.ad}</Text>
                <Text style={st.alt}>
                  {(item.magazaIdleri?.length ?? 0) > 0 ? `${item.magazaIdleri!.length} mağazada görevli` : 'Mağaza ataması yok'}
                  {item.aktif === false ? '  ·  PASİF' : ''}
                </Text>
              </View>
              {duzenleyebilir && <Text style={st.ok}>›</Text>}
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={st.bos}>{arama ? 'Sonuç yok' : 'Henüz personel yok'}</Text>}
        />
      )}

      <FormSayfasi acik={!!form} baslik={form?.id ? 'Personeli Düzenle' : 'Yeni Personel'} onKapat={() => setForm(null)} onKaydet={kaydet} kaydediyor={kaydediyor}>
        {form && (
          <>
            <Girdi etiket="Ad Soyad" deger={form.ad} onChange={(v) => setForm({ ...form, ad: v })} zorunlu />
            <Girdi etiket="TC Kimlik No" deger={form.tc} onChange={(v) => setForm({ ...form, tc: v })} sayisal />
            <CokluSecim
              etiket="Görevli Olduğu Mağazalar"
              seciliIdler={form.magazaIdleri}
              secenekler={magazalar.map((m) => ({ id: m.id, ad: m.ad }))}
              onChange={(idler) => setForm({ ...form, magazaIdleri: idler })}
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
  ustSatir: { flexDirection: 'row', gap: 10, padding: 16, paddingBottom: 10 },
  arama: {
    flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#0f172a',
  },
  yeniBtn: { backgroundColor: '#4f46e5', borderRadius: 12, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  yeniBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  satir: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    marginHorizontal: 16, marginBottom: 8, borderRadius: 14, padding: 13,
    borderWidth: 1, borderColor: '#f1f5f9',
  },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#eef2ff', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { fontSize: 14, fontWeight: '700', color: '#4f46e5' },
  ad: { fontSize: 14.5, fontWeight: '700', color: '#0f172a' },
  alt: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  ok: { fontSize: 22, color: '#cbd5e1', fontWeight: '300' },
  bos: { textAlign: 'center', color: '#94a3b8', marginTop: 40, fontSize: 14 },
});
