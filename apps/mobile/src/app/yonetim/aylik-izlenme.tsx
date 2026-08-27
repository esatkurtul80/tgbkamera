import { useCallback, useMemo, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import { getDegerlendirmelerByAyYil } from '@/lib/firestore';
import { useAuth } from '@/contexts/AuthContext';
import ErisimYok from '@/components/erisim-yok';
import type { Degerlendirme } from '@/lib/types';

const AYLAR = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];

interface PersonelOzet {
  personelId: string;
  personelAd: string;
  magazaAd: string;
  raporSayisi: number;
  izlenmeSayisi: number;
  puanliRapor: number;
  ortalamaYuzde: number | null;
}

/** Aylık İzlenme raporu — webdeki /raporlar/aylik-izlenme sayfasının natif karşılığı:
 *  seçilen ay için personel bazında rapor/izlenme sayıları ve ortalama puan.
 *  Bölge müdürü (salt okunur, şirket geneli veri içerdiği için) erişemez. */
export default function AylikIzlenmeScreen() {
  const { kullanici } = useAuth();
  if (kullanici?.rol === 'bolge_muduru') return <ErisimYok />;
  return <AylikIzlenmeIcerik />;
}

function AylikIzlenmeIcerik() {
  const now = new Date();
  const [ay, setAy] = useState(now.getMonth());
  const [yil, setYil] = useState(now.getFullYear());
  const [raporlar, setRaporlar] = useState<Degerlendirme[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setRaporlar(await getDegerlendirmelerByAyYil(ay, yil)); } finally { setLoading(false); }
  }, [ay, yil]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const ozetler = useMemo<PersonelOzet[]>(() => {
    const map = new Map<string, PersonelOzet & { yuzdeler: number[] }>();
    for (const d of raporlar) {
      if (d.durum === 'acik') continue;
      if (!map.has(d.personelId)) {
        map.set(d.personelId, {
          personelId: d.personelId, personelAd: d.personelAd, magazaAd: d.magazaAd,
          raporSayisi: 0, izlenmeSayisi: 0, puanliRapor: 0, ortalamaYuzde: null, yuzdeler: [],
        });
      }
      const o = map.get(d.personelId)!;
      o.raporSayisi++;
      o.izlenmeSayisi += d.izlenmeler?.length ?? 0;
      if (d.puanli && d.toplamPuan !== null && d.maxPuan && d.maxPuan > 0) {
        o.puanliRapor++;
        o.yuzdeler.push(Math.round((d.toplamPuan / d.maxPuan) * 100));
      }
    }
    return [...map.values()]
      .map((o) => ({
        ...o,
        ortalamaYuzde: o.yuzdeler.length > 0 ? Math.round(o.yuzdeler.reduce((a, b) => a + b, 0) / o.yuzdeler.length) : null,
      }))
      .sort((a, b) => a.personelAd.localeCompare(b.personelAd, 'tr'));
  }, [raporlar]);

  function ayDegistir(yon: -1 | 1) {
    let yeniAy = ay + yon;
    let yeniYil = yil;
    if (yeniAy < 0) { yeniAy = 11; yeniYil--; }
    if (yeniAy > 11) { yeniAy = 0; yeniYil++; }
    setAy(yeniAy);
    setYil(yeniYil);
  }

  const toplamIzlenme = ozetler.reduce((t, o) => t + o.izlenmeSayisi, 0);

  return (
    <View style={st.container}>
      <Stack.Screen options={{ headerShown: true, title: 'Aylık İzlenme', headerBackTitle: 'Geri', headerTintColor: '#4f46e5', headerStyle: { backgroundColor: '#ffffff' }, headerShadowVisible: false }} />

      {/* Ay seçici */}
      <View style={st.aySecici}>
        <TouchableOpacity onPress={() => ayDegistir(-1)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={st.ayOk}>‹</Text>
        </TouchableOpacity>
        <Text style={st.ayText}>{AYLAR[ay]} {yil}</Text>
        <TouchableOpacity onPress={() => ayDegistir(1)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={st.ayOk}>›</Text>
        </TouchableOpacity>
      </View>

      <Text style={st.ozetText}>
        {ozetler.length} personel · {ozetler.reduce((t, o) => t + o.raporSayisi, 0)} kapalı rapor · {toplamIzlenme} izlenme
      </Text>

      {loading ? (
        <ActivityIndicator color="#4f46e5" size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={ozetler}
          keyExtractor={(o) => o.personelId}
          contentContainerStyle={{ paddingBottom: 30 }}
          renderItem={({ item }) => (
            <View style={st.satir}>
              <View style={{ flex: 1 }}>
                <Text style={st.ad}>{item.personelAd}</Text>
                <Text style={st.alt}>{item.magazaAd || '—'} · {item.raporSayisi} rapor · {item.izlenmeSayisi} izlenme</Text>
              </View>
              {item.ortalamaYuzde !== null ? (
                <Text style={[st.puan, { color: item.ortalamaYuzde >= 80 ? '#10b981' : item.ortalamaYuzde >= 50 ? '#f59e0b' : '#ef4444' }]}>
                  %{item.ortalamaYuzde}
                </Text>
              ) : (
                <Text style={st.puansiz}>Puansız</Text>
              )}
            </View>
          )}
          ListEmptyComponent={<Text style={st.bos}>Bu ay için kapalı rapor yok</Text>}
        />
      )}
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  aySecici: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', marginHorizontal: 16, marginTop: 14, borderRadius: 12,
    paddingHorizontal: 20, paddingVertical: 10, borderWidth: 1, borderColor: '#f1f5f9',
  },
  ayOk: { fontSize: 26, color: '#4f46e5', fontWeight: '700', paddingHorizontal: 10 },
  ayText: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  ozetText: { fontSize: 12, color: '#94a3b8', paddingHorizontal: 20, paddingVertical: 10 },
  satir: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    marginHorizontal: 16, marginBottom: 8, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#f1f5f9',
  },
  ad: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  alt: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  puan: { fontSize: 16, fontWeight: '800' },
  puansiz: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  bos: { textAlign: 'center', color: '#94a3b8', marginTop: 40, fontSize: 14 },
});
