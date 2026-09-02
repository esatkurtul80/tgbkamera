import { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect, Stack } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import {
  getPersonellerByMagaza,
  getAktifPersoneller,
  getFormlar,
  getAcikDegerlendirmeler,
  updatePersonel,
} from '@/lib/firestore';
import { useBmBolge } from '@/hooks/useBmBolge';
import ErisimYok from '@/components/erisim-yok';
import type { Personel, Form, Degerlendirme } from '@/lib/types';

const AYLAR = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];

/**
 * Mağaza detayı — webdeki kameraman panelindeki mağaza görünümünün mobil karşılığı:
 * personel listesi, personel başına rapor başlat / devam et, havuzdan personel
 * ekleme ve mağazadan çıkarma.
 */
export default function MagazaDetayScreen() {
  const router = useRouter();
  const { user, kullanici } = useAuth();
  const params = useLocalSearchParams<{ id: string; ad?: string }>();
  const magazaId = params.id;
  const magazaAd = params.ad ?? '';

  // Bölge müdürü salt okunur: rapor başlatamaz, personel ekleyip çıkaramaz;
  // yalnız kendi bölgesindeki mağazayı açabilir (hook diğer rollerde sorgu çalıştırmaz)
  const saltOkunur = kullanici?.rol === 'bolge_muduru';
  const { magazaIdSet: bmMagazalar, loading: bmYukleniyor } = useBmBolge();

  const [personeller, setPersoneller] = useState<Personel[]>([]);
  const [formlar, setFormlar] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [arama, setArama] = useState('');

  // Rapor modalı (webdeki birleşik modal: devam eden raporlar + yeni rapor)
  const [raporPersonel, setRaporPersonel] = useState<Personel | null>(null);
  const [acikRaporlar, setAcikRaporlar] = useState<Degerlendirme[]>([]);
  const [raporYukleniyor, setRaporYukleniyor] = useState(false);

  // Havuz modalı
  const [havuzAcik, setHavuzAcik] = useState(false);
  const [havuzArama, setHavuzArama] = useState('');
  const [tumPersoneller, setTumPersoneller] = useState<Personel[]>([]);
  const [havuzYukleniyor, setHavuzYukleniyor] = useState(false);
  const [ekleniyor, setEkleniyor] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!magazaId) return;
    try {
      const [p, f] = await Promise.all([getPersonellerByMagaza(magazaId), getFormlar()]);
      setPersoneller(p);
      // Mağaza formları personel raporlamasında listelenmez (web'deki "Mağaza Raporla" akışına özeldir)
      setFormlar(f.filter((x) => !x.magazaFormu));
    } finally {
      setLoading(false);
    }
  }, [magazaId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const filtrelenmis = useMemo(
    () =>
      arama.trim()
        ? personeller.filter((p) => p.ad.toLowerCase().includes(arama.toLowerCase()))
        : personeller,
    [personeller, arama]
  );

  /* ── Rapor akışı ── */
  async function raporModalAc(p: Personel) {
    setRaporPersonel(p);
    setRaporYukleniyor(true);
    try {
      const now = new Date();
      const acikler = await getAcikDegerlendirmeler(p.id, magazaId, now.getMonth(), now.getFullYear());
      setAcikRaporlar(acikler);
    } catch {
      setAcikRaporlar([]);
    } finally {
      setRaporYukleniyor(false);
    }
  }

  function devamEt(d: Degerlendirme) {
    setRaporPersonel(null);
    const matrisMi = d.puanli && d.puanGirisTipi !== 'manuel';
    if (matrisMi) {
      router.push({ pathname: '/matris', params: { devam: d.id } });
    } else {
      router.push({ pathname: '/yeni', params: { devam: d.id } });
    }
  }

  function yeniRapor(form: Form) {
    if (!raporPersonel) return;
    // Aynı form için zaten açık rapor varsa matris ekranı onu otomatik devam ettirir.
    setRaporPersonel(null);
    const matrisMi = form.puanli && form.puanGirisTipi !== 'manuel';
    const ortak = {
      formId: form.id,
      formAd: form.ad,
      magazaId,
      magazaAd,
      personelId: raporPersonel.id,
      personelAd: raporPersonel.ad,
    };
    if (matrisMi) {
      router.push({ pathname: '/matris', params: ortak });
    } else {
      router.push({ pathname: '/yeni', params: ortak });
    }
  }

  /* ── Havuz akışı ── */
  async function havuzuAc() {
    setHavuzAcik(true);
    setHavuzYukleniyor(true);
    try {
      setTumPersoneller(await getAktifPersoneller());
    } finally {
      setHavuzYukleniyor(false);
    }
  }

  const havuzAdaylari = useMemo(() => {
    const mevcutIdler = new Set(personeller.map((p) => p.id));
    let liste = tumPersoneller.filter((p) => !mevcutIdler.has(p.id));
    if (havuzArama.trim()) {
      liste = liste.filter((p) => p.ad.toLowerCase().includes(havuzArama.toLowerCase()));
    }
    return liste;
  }, [tumPersoneller, personeller, havuzArama]);

  async function havuzdanEkle(p: Personel) {
    setEkleniyor(p.id);
    try {
      await updatePersonel(p.id, { magazaIdleri: [...(p.magazaIdleri ?? []), magazaId] });
      await load();
    } catch (e: any) {
      Alert.alert('Hata', e?.message ?? 'Personel eklenemedi');
    } finally {
      setEkleniyor(null);
    }
  }

  function magazadanCikar(p: Personel) {
    Alert.alert(
      'Personeli Çıkar',
      `${p.ad} bu mağazadan çıkarılacak (havuzda kalmaya devam eder). Emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Çıkar',
          style: 'destructive',
          onPress: async () => {
            try {
              await updatePersonel(p.id, {
                magazaIdleri: (p.magazaIdleri ?? []).filter((id) => id !== magazaId),
              });
              await load();
            } catch (e: any) {
              Alert.alert('Hata', e?.message ?? 'Çıkarılamadı');
            }
          },
        },
      ]
    );
  }

  // BM bölge dışı mağaza deep-link koruması (tüm hook'lardan sonra)
  if (saltOkunur && !bmYukleniyor && !bmMagazalar.has(magazaId)) {
    return <ErisimYok />;
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: magazaAd || 'Mağaza',
          headerBackTitle: 'Geri',
          headerTintColor: '#4f46e5',
          headerStyle: { backgroundColor: '#ffffff' },
          headerShadowVisible: false,
        }}
      />

      <View style={styles.ustSatir}>
        <TextInput
          style={styles.aramaInput}
          placeholder="Personel ara..."
          placeholderTextColor="#94a3b8"
          value={arama}
          onChangeText={setArama}
          clearButtonMode="while-editing"
        />
        {!saltOkunur && (
          <TouchableOpacity style={styles.havuzBtn} onPress={havuzuAc} activeOpacity={0.85}>
            <Text style={styles.havuzBtnText}>+ Personel</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#4f46e5" size="large" />
        </View>
      ) : (
        <FlatList
          data={filtrelenmis}
          keyExtractor={(p) => p.id}
          contentContainerStyle={filtrelenmis.length === 0 ? styles.flex : { paddingBottom: 32 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.satir}
              activeOpacity={saltOkunur ? 1 : 0.8}
              onPress={saltOkunur ? undefined : () => raporModalAc(item)}
              onLongPress={saltOkunur ? undefined : () => magazadanCikar(item)}
              delayLongPress={450}
              disabled={saltOkunur}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.ad.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.satirInfo}>
                <Text style={styles.personelAd}>{item.ad}</Text>
                {(item.magazaIdleri?.length ?? 0) > 1 && (
                  <Text style={styles.cokluMagaza}>{item.magazaIdleri!.length} mağazada görevli</Text>
                )}
              </View>
              {!saltOkunur && (
                <View style={styles.raporBtn}>
                  <Text style={styles.raporBtnText}>▶ Rapor</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>👥</Text>
              <Text style={styles.emptyTitle}>
                {arama
                  ? 'Sonuç bulunamadı'
                  : saltOkunur
                    ? 'Bu mağazada personel yok.'
                    : 'Bu mağazada personel yok.\n"+ Personel" ile havuzdan ekleyin.'}
              </Text>
            </View>
          }
        />
      )}

      {/* ── Rapor modalı: devam eden + yeni ── */}
      <Modal visible={!!raporPersonel} transparent animationType="slide" onRequestClose={() => setRaporPersonel(null)}>
        <View style={styles.modalArka}>
          <View style={styles.modalSayfa}>
            <View style={styles.modalBaslikSatiri}>
              <Text style={styles.modalBaslik}>{raporPersonel?.ad}</Text>
              <TouchableOpacity onPress={() => setRaporPersonel(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={styles.modalKapat}>Kapat</Text>
              </TouchableOpacity>
            </View>

            {raporYukleniyor ? (
              <ActivityIndicator color="#4f46e5" style={{ marginVertical: 32 }} />
            ) : (
              <FlatList
                data={formlar}
                keyExtractor={(f) => f.id}
                ListHeaderComponent={
                  acikRaporlar.length > 0 ? (
                    <View style={{ marginBottom: 14 }}>
                      <Text style={styles.grupBaslik}>Devam Eden Raporlar</Text>
                      {acikRaporlar.map((d) => (
                        <TouchableOpacity key={d.id} style={styles.devamKart} onPress={() => devamEt(d)} activeOpacity={0.8}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.devamAd}>{d.formAd}</Text>
                            <Text style={styles.devamAlt}>
                              {AYLAR[d.ay]} {d.yil} · {d.izlenmeler?.length ?? 0} izlenme
                            </Text>
                          </View>
                          <Text style={styles.devamOk}>Devam Et ›</Text>
                        </TouchableOpacity>
                      ))}
                      <Text style={[styles.grupBaslik, { marginTop: 14 }]}>Yeni Rapor Başlat</Text>
                    </View>
                  ) : (
                    <Text style={styles.grupBaslik}>Form Seçin</Text>
                  )
                }
                renderItem={({ item: form }) => {
                  const matrisMi = form.puanli && form.puanGirisTipi !== 'manuel';
                  return (
                    <TouchableOpacity style={styles.formKart} onPress={() => yeniRapor(form)} activeOpacity={0.8}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.formAd}>{form.ad}</Text>
                        <Text style={styles.formTip}>
                          {matrisMi ? 'Puanlı · Aylık Matris' : form.puanli ? 'Yorumlu Puanlı' : 'Puansız'}
                        </Text>
                      </View>
                      <View style={[styles.tipRozet, { backgroundColor: matrisMi ? '#eef2ff' : form.puanli ? '#fdf4ff' : '#f0fdf4' }]}>
                        <Text style={[styles.tipRozetText, { color: matrisMi ? '#4f46e5' : form.puanli ? '#a21caf' : '#15803d' }]}>
                          {matrisMi ? 'MATRİS' : form.puanli ? 'PUANLI' : 'PUANSIZ'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                }}
                contentContainerStyle={{ paddingBottom: 30 }}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* ── Havuz modalı ── */}
      <Modal visible={havuzAcik} transparent animationType="slide" onRequestClose={() => setHavuzAcik(false)}>
        <View style={styles.modalArka}>
          <View style={styles.modalSayfa}>
            <View style={styles.modalBaslikSatiri}>
              <Text style={styles.modalBaslik}>Havuzdan Personel Ekle</Text>
              <TouchableOpacity onPress={() => setHavuzAcik(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={styles.modalKapat}>Kapat</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.aramaInput, { marginBottom: 12 }]}
              placeholder="Personel ara..."
              placeholderTextColor="#94a3b8"
              value={havuzArama}
              onChangeText={setHavuzArama}
              autoFocus
            />
            {havuzYukleniyor ? (
              <ActivityIndicator color="#4f46e5" style={{ marginVertical: 32 }} />
            ) : (
              <FlatList
                data={havuzAdaylari}
                keyExtractor={(p) => p.id}
                renderItem={({ item }) => (
                  <View style={styles.havuzSatir}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{item.ad.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.personelAd}>{item.ad}</Text>
                      <Text style={styles.cokluMagaza}>
                        {(item.magazaIdleri?.length ?? 0) > 0 ? `${item.magazaIdleri!.length} mağazada görevli` : 'Mağaza ataması yok'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.ekleBtn, ekleniyor === item.id && { opacity: 0.5 }]}
                      disabled={ekleniyor !== null}
                      onPress={() => havuzdanEkle(item)}
                    >
                      <Text style={styles.ekleBtnText}>{ekleniyor === item.id ? '...' : '+ Ekle'}</Text>
                    </TouchableOpacity>
                  </View>
                )}
                ListEmptyComponent={
                  <Text style={styles.havuzBos}>
                    {havuzArama ? 'Sonuç bulunamadı' : 'Eklenebilecek personel kalmadı'}
                  </Text>
                }
                contentContainerStyle={{ paddingBottom: 30 }}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  ustSatir: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 },
  aramaInput: {
    flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: '#0f172a',
  },
  havuzBtn: {
    backgroundColor: '#4f46e5', borderRadius: 12, paddingHorizontal: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  havuzBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  satir: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 8,
    borderRadius: 14, padding: 13, borderWidth: 1, borderColor: '#f1f5f9',
  },
  avatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#eef2ff',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  avatarText: { fontSize: 14, fontWeight: '700', color: '#4f46e5' },
  satirInfo: { flex: 1 },
  personelAd: { fontSize: 14.5, fontWeight: '700', color: '#0f172a' },
  cokluMagaza: { fontSize: 11.5, color: '#94a3b8', marginTop: 2 },
  raporBtn: {
    backgroundColor: '#eef2ff', borderRadius: 9, paddingHorizontal: 13, paddingVertical: 8,
  },
  raporBtnText: { fontSize: 12.5, fontWeight: '700', color: '#4f46e5' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 12 },
  emptyIcon: { fontSize: 44 },
  emptyTitle: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 21 },

  modalArka: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  modalSayfa: {
    backgroundColor: '#f8fafc', borderTopLeftRadius: 22, borderTopRightRadius: 22,
    paddingHorizontal: 18, paddingTop: 18, maxHeight: '82%',
  },
  modalBaslikSatiri: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  modalBaslik: { fontSize: 17, fontWeight: '800', color: '#0f172a' },
  modalKapat: { fontSize: 14, fontWeight: '600', color: '#4f46e5' },
  grupBaslik: {
    fontSize: 11, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase',
    letterSpacing: 1, marginBottom: 8,
  },
  devamKart: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a',
    borderRadius: 12, padding: 13, marginBottom: 8,
  },
  devamAd: { fontSize: 14, fontWeight: '700', color: '#92400e' },
  devamAlt: { fontSize: 12, color: '#b45309', marginTop: 2 },
  devamOk: { fontSize: 13, fontWeight: '800', color: '#d97706' },
  formKart: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#f1f5f9',
    borderRadius: 12, padding: 13, marginBottom: 8,
  },
  formAd: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  formTip: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  tipRozet: { borderRadius: 7, paddingHorizontal: 9, paddingVertical: 5 },
  tipRozetText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  havuzSatir: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: '#f1f5f9',
  },
  ekleBtn: { backgroundColor: '#10b981', borderRadius: 9, paddingHorizontal: 13, paddingVertical: 8 },
  ekleBtnText: { color: '#fff', fontSize: 12.5, fontWeight: '700' },
  havuzBos: { textAlign: 'center', color: '#94a3b8', fontSize: 14, marginTop: 30 },
});
