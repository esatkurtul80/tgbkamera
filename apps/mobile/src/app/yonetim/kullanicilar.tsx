import { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import { getKullanicilar, getMagazalar, getBolgeler, updateKullanici } from '@/lib/firestore';
import { TekSecim, CokluSecim, AnahtarSatir, FormSayfasi } from '@/components/yonetim';
import type { Kullanici, KullaniciRol, Magaza, Bolge } from '@/lib/types';

const ROLLER: { id: KullaniciRol; ad: string }[] = [
  { id: 'admin', ad: 'Admin' },
  { id: 'sirketsahibi', ad: 'Şirket Sahibi' },
  { id: 'ust_yonetici', ad: 'Üst Düzey Yönetici' },
  { id: 'bolge_muduru', ad: 'Bölge Müdürü' },
  { id: 'magaza_sorumlusu', ad: 'Mağaza Sorumlusu' },
  { id: 'kameraman', ad: 'Kameraman' },
];
const rolAdi = (r: KullaniciRol) => ROLLER.find((x) => x.id === r)?.ad ?? r;

/** Kullanıcılar yönetimi — webdeki /kullanicilar sayfasının natif karşılığı:
 *  rol atama, aktiflik ve role göre mağaza/bölge atamaları. */
export default function KullanicilarScreen() {
  const [kullanicilar, setKullanicilar] = useState<Kullanici[]>([]);
  const [magazalar, setMagazalar] = useState<Magaza[]>([]);
  const [bolgeler, setBolgeler] = useState<Bolge[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<{
    id: string; displayName: string; email: string; rol: KullaniciRol;
    magazaIdleri: string[]; magazaId?: string; bolgeId?: string; aktif: boolean;
  } | null>(null);
  const [kaydediyor, setKaydediyor] = useState(false);

  const load = useCallback(async () => {
    try {
      const [k, m, b] = await Promise.all([getKullanicilar(), getMagazalar(), getBolgeler()]);
      setKullanicilar(k);
      setMagazalar(m);
      setBolgeler(b);
    } finally {
      setLoading(false);
    }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function kaydet() {
    if (!form) return;
    setKaydediyor(true);
    try {
      await updateKullanici(form.id, {
        rol: form.rol,
        aktif: form.aktif,
        magazaIdleri: form.rol === 'kameraman' ? form.magazaIdleri : null,
        magazaId: form.rol === 'magaza_sorumlusu' ? (form.magazaId ?? null) : null,
        bolgeId: form.rol === 'bolge_muduru' ? (form.bolgeId ?? null) : null,
      });
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
      <Stack.Screen options={{ headerShown: true, title: 'Kullanıcılar', headerBackTitle: 'Geri', headerTintColor: '#4f46e5', headerStyle: { backgroundColor: '#ffffff' }, headerShadowVisible: false }} />
      {loading ? (
        <ActivityIndicator color="#4f46e5" size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={kullanicilar}
          keyExtractor={(k) => k.id}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 30 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[st.satir, item.aktif === false && { opacity: 0.55 }]}
              activeOpacity={0.7}
              onPress={() =>
                setForm({
                  id: item.id, displayName: item.displayName, email: item.email, rol: item.rol,
                  magazaIdleri: item.magazaIdleri ?? [], magazaId: item.magazaId, bolgeId: item.bolgeId,
                  aktif: item.aktif !== false,
                })
              }
            >
              <View style={st.avatar}><Text style={st.avatarText}>{(item.displayName || '?').charAt(0).toUpperCase()}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={st.ad}>{item.displayName || item.email}</Text>
                <Text style={st.alt}>{item.email}</Text>
              </View>
              <View style={st.rolRozet}><Text style={st.rolText}>{rolAdi(item.rol)}</Text></View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={st.bos}>Kullanıcı yok</Text>}
        />
      )}

      <FormSayfasi acik={!!form} baslik={form?.displayName ?? 'Kullanıcı'} onKapat={() => setForm(null)} onKaydet={kaydet} kaydediyor={kaydediyor}>
        {form && (
          <>
            <Text style={st.emailText}>{form.email}</Text>
            <TekSecim etiket="Rol" deger={form.rol} secenekler={ROLLER} onSelect={(id) => setForm({ ...form, rol: (id as KullaniciRol) ?? form.rol })} />
            {form.rol === 'kameraman' && (
              <CokluSecim
                etiket="Sorumlu Olduğu Mağazalar"
                seciliIdler={form.magazaIdleri}
                secenekler={magazalar.map((m) => ({ id: m.id, ad: m.ad }))}
                onChange={(idler) => setForm({ ...form, magazaIdleri: idler })}
              />
            )}
            {form.rol === 'bolge_muduru' && (
              <TekSecim
                etiket="Bölge"
                deger={form.bolgeId}
                secenekler={bolgeler.map((b) => ({ id: b.id, ad: b.ad }))}
                onSelect={(id) => setForm({ ...form, bolgeId: id })}
              />
            )}
            {form.rol === 'magaza_sorumlusu' && (
              <TekSecim
                etiket="Mağaza"
                deger={form.magazaId}
                secenekler={magazalar.map((m) => ({ id: m.id, ad: m.ad }))}
                onSelect={(id) => setForm({ ...form, magazaId: id })}
              />
            )}
            <AnahtarSatir etiket="Aktif" deger={form.aktif} onChange={(v) => setForm({ ...form, aktif: v })} />
          </>
        )}
      </FormSayfasi>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  satir: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    marginHorizontal: 16, marginBottom: 8, borderRadius: 14, padding: 13,
    borderWidth: 1, borderColor: '#f1f5f9',
  },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#eef2ff', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { fontSize: 14, fontWeight: '700', color: '#4f46e5' },
  ad: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  alt: { fontSize: 11.5, color: '#94a3b8', marginTop: 2 },
  rolRozet: { backgroundColor: '#eef2ff', borderRadius: 7, paddingHorizontal: 8, paddingVertical: 4 },
  rolText: { fontSize: 10.5, fontWeight: '800', color: '#4f46e5' },
  emailText: { fontSize: 13, color: '#64748b', marginBottom: 14 },
  bos: { textAlign: 'center', color: '#94a3b8', marginTop: 40, fontSize: 14 },
});
