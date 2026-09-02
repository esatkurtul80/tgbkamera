import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
  Platform,
  TextInput,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Timestamp } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '@/contexts/AuthContext';
import {
  getFormlar,
  getMagazalar,
  getPersonellerByMagaza,
  getForm,
  getBolum,
  getSoru,
  createDegerlendirme,
  getDegerlendirme,
  updatePuansizDegerlendirme,
} from '@/lib/firestore';
import { hesaplaPuan } from '@/lib/skorlama';
import ErisimYok from '@/components/erisim-yok';
import { puansizCevapDoluMu } from '@/lib/puansiz';
import { uploadDegerlendirmeFoto } from '@/lib/storage';
import { generateCustomId } from '@/lib/idUtils';
import type {
  Form,
  Magaza,
  Personel,
  Bolum,
  Soru,
  CevapSecenegi,
  BolumSnapshot,
  SoruSnapshot,
  SoruTipi,
  PuansizCevapDegeri,
} from '@/lib/types';

interface BolumDetay extends Bolum {
  sorular: Soru[];
}

type Adim = 'secim' | 'cevapla';

// ─── Seçici Modal ────────────────────────────────────────────────────────────

function SeciciModal<T extends { id: string; ad: string }>({
  visible,
  onClose,
  onSelect,
  items,
  title,
  placeholder,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (item: T) => void;
  items: T[];
  title: string;
  placeholder: string;
}) {
  const [arama, setArama] = useState('');
  const filtrelenmis = arama.trim()
    ? items.filter((i) => i.ad.toLowerCase().includes(arama.toLowerCase()))
    : items;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={modalStyles.container}>
        <View style={modalStyles.header}>
          <Text style={modalStyles.title}>{title}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={modalStyles.closeBtn}>İptal</Text>
          </TouchableOpacity>
        </View>
        <View style={modalStyles.aramaWrap}>
          <TextInput
            style={modalStyles.aramaInput}
            placeholder={placeholder}
            placeholderTextColor="#94a3b8"
            value={arama}
            onChangeText={setArama}
            clearButtonMode="while-editing"
            autoFocus
          />
        </View>
        <FlatList
          data={filtrelenmis}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={modalStyles.item}
              onPress={() => { onSelect(item); setArama(''); }}
              activeOpacity={0.7}
            >
              <Text style={modalStyles.itemText}>{item.ad}</Text>
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={modalStyles.sep} />}
          ListEmptyComponent={
            <View style={modalStyles.empty}>
              <Text style={modalStyles.emptyText}>Sonuç bulunamadı</Text>
            </View>
          }
        />
      </View>
    </Modal>
  );
}

// ─── Ana Bileşen ─────────────────────────────────────────────────────────────

export default function YeniDegerlendirme() {
  const { kullanici } = useAuth();
  // Bölge müdürü değerlendirme oluşturamaz (salt okunur rol)
  if (kullanici?.rol === 'bolge_muduru') return <ErisimYok />;
  return <YeniDegerlendirmeIcerik />;
}

function YeniDegerlendirmeIcerik() {
  const { user, kullanici } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{
    devam?: string;
    formId?: string;
    magazaId?: string;
    personelId?: string;
    formAd?: string;
    magazaAd?: string;
    personelAd?: string;
  }>();

  // Devam edilen açık raporun ID'si (puansız / yorumlu puanlı)
  const [devamDegId, setDevamDegId] = useState<string | null>(null);

  // Adım 1
  const [adim, setAdim] = useState<Adim>('secim');
  const [formlar, setFormlar] = useState<Form[]>([]);
  const [magazalar, setMagazalar] = useState<Magaza[]>([]);
  const [personeller, setPersoneller] = useState<Personel[]>([]);

  const [seciliForm, setSeciliForm] = useState<Form | null>(null);
  const [seciliMagaza, setSeciliMagaza] = useState<Magaza | null>(null);
  const [seciliPersonel, setSeciliPersonel] = useState<Personel | null>(null);
  const [izlenmeTarihi, setIzlenmeTarihi] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Modaller
  const [formModal, setFormModal] = useState(false);
  const [magazaModal, setMagazaModal] = useState(false);
  const [personelModal, setPersonelModal] = useState(false);

  // Adım 2
  const [bolumDetaylar, setBolumDetaylar] = useState<BolumDetay[]>([]);
  const [cevaplar, setCevaplar] = useState<Record<string, CevapSecenegi>>({});
  const [puansizCevaplar, setPuansizCevaplar] = useState<Record<string, PuansizCevapDegeri>>({});
  const [toplamPuanGiris, setToplamPuanGiris] = useState('');
  const [tarihSaatSecici, setTarihSaatSecici] = useState<{ soruId: string; tip: 'tarih' | 'saat' } | null>(null);
  const [iosPickerDeger, setIosPickerDeger] = useState(new Date());

  const [yukleniyor, setYukleniyor] = useState(true);
  const [baslaniyor, setBaslaniyor] = useState(false);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [personelYukleniyor, setPersonelYukleniyor] = useState(false);

  useEffect(() => {
    async function boot() {
      try {
        const [f, m] = await Promise.all([getFormlar(), getMagazalar()]);
        setFormlar(f);
        setMagazalar(m);

        if (params.devam) {
          /* ── Devam modu: açık puansız / yorumlu puanlı raporu yükle ── */
          const deg = await getDegerlendirme(params.devam);
          if (!deg || deg.durum === 'kapali') return;
          // Matris raporsa doğru ekrana yönlendir (emniyet)
          if (deg.puanli && deg.puanGirisTipi !== 'manuel') {
            router.replace({ pathname: '/matris', params: { devam: deg.id } });
            return;
          }
          setDevamDegId(deg.id);
          setSeciliForm({
            id: deg.formId, ad: deg.formAd, aciklama: '',
            puanli: deg.puanli, puanGirisTipi: deg.puanGirisTipi,
            skorlamaSistemi: deg.skorlamaSistemi,
            bolumIdleri: Object.keys(deg.bolumSnapshot),
          });
          setSeciliMagaza({ id: deg.magazaId, ad: deg.magazaAd, aktif: true } as Magaza);
          setSeciliPersonel({ id: deg.personelId, ad: deg.personelAd, tc: '', magazaIdleri: [], aktif: true } as Personel);
          if (deg.izlenmeTarihi) setIzlenmeTarihi(deg.izlenmeTarihi.toDate().toISOString().split('T')[0]);
          setPuansizCevaplar(deg.puansizCevaplar ?? {});
          setToplamPuanGiris(deg.toplamPuan != null ? String(deg.toplamPuan) : '');
          setBolumDetaylar(snapshotlardanDetay(deg.bolumSnapshot, deg.soruSnapshot));
          setAdim('cevapla');
        } else if (params.formId && params.magazaId && params.personelId) {
          /* ── Panelden parametrelerle gelindi: seçimleri atla, direkt başla ── */
          const form = f.find((x) => x.id === params.formId) ?? (await getForm(params.formId));
          if (!form) return;
          if (form.puanli && form.puanGirisTipi !== 'manuel') {
            router.replace({
              pathname: '/matris',
              params: {
                formId: form.id, formAd: form.ad,
                magazaId: params.magazaId!, magazaAd: params.magazaAd ?? '',
                personelId: params.personelId!, personelAd: params.personelAd ?? '',
              },
            });
            return;
          }
          const magaza =
            m.find((x) => x.id === params.magazaId) ??
            ({ id: params.magazaId, ad: params.magazaAd ?? '', aktif: true } as Magaza);
          setSeciliForm(form);
          setSeciliMagaza(magaza);
          setSeciliPersonel({ id: params.personelId, ad: params.personelAd ?? '', tc: '', magazaIdleri: [], aktif: true } as Personel);
          setBolumDetaylar(await bolumleriYukle(form));
          setCevaplar({});
          setPuansizCevaplar({});
          setToplamPuanGiris('');
          setAdim('cevapla');
        }
      } finally {
        setYukleniyor(false);
      }
    }
    boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Rapor snapshot'larından bölüm/soru detayları üretir (devam modunda canlı doküman çekilmez). */
  function snapshotlardanDetay(
    bolumSnapshot: Record<string, BolumSnapshot>,
    soruSnapshot: Record<string, SoruSnapshot>
  ): BolumDetay[] {
    return Object.entries(bolumSnapshot).map(([bid, b]) => ({
      id: bid,
      ad: b.ad,
      aciklama: '',
      soruIdleri: b.soruIdleri,
      sorular: b.soruIdleri
        .map((sid) => {
          const s = soruSnapshot[sid];
          return s ? ({ id: sid, metin: s.metin, puan: s.puan, hedefYuzde: s.hedefYuzde, tip: s.tip } as Soru) : null;
        })
        .filter(Boolean) as Soru[],
    }));
  }

  /** Formun bölüm ve soru dokümanlarını yükler. */
  async function bolumleriYukle(form: Form): Promise<BolumDetay[]> {
    const detaylar: BolumDetay[] = [];
    for (const bolumId of form.bolumIdleri) {
      const bolum = await getBolum(bolumId);
      if (!bolum) continue;
      const sorular: Soru[] = [];
      for (const soruId of bolum.soruIdleri) {
        const soru = await getSoru(soruId);
        if (soru) sorular.push(soru);
      }
      detaylar.push({ ...bolum, sorular });
    }
    return detaylar;
  }

  async function handleMagazaSec(magaza: Magaza) {
    setSeciliMagaza(magaza);
    setSeciliPersonel(null);
    setMagazaModal(false);
    setPersonelYukleniyor(true);
    const liste = await getPersonellerByMagaza(magaza.id);
    setPersoneller(liste);
    setPersonelYukleniyor(false);
  }

  async function handleBasla() {
    if (!seciliForm || !seciliPersonel || !seciliMagaza) return;

    // Puanlı (otomatik) formlar artık webdeki gibi aylık matris ekranında doldurulur —
    // eski tek-cevap formatı kullanılmaz.
    if (seciliForm.puanli && seciliForm.puanGirisTipi !== 'manuel') {
      router.replace({
        pathname: '/matris',
        params: {
          formId: seciliForm.id, formAd: seciliForm.ad,
          magazaId: seciliMagaza.id, magazaAd: seciliMagaza.ad,
          personelId: seciliPersonel.id, personelAd: seciliPersonel.ad,
        },
      });
      return;
    }

    setBaslaniyor(true);
    const form = await getForm(seciliForm.id);
    if (!form) { setBaslaniyor(false); return; }

    setBolumDetaylar(await bolumleriYukle(form));
    setCevaplar({});
    setPuansizCevaplar({});
    setToplamPuanGiris('');
    setAdim('cevapla');
    setBaslaniyor(false);
  }

  function setCevap(soruId: string, cevap: CevapSecenegi) {
    setCevaplar((prev) => ({ ...prev, [soruId]: cevap }));
  }

  function setPuansizCevap(soruId: string, patch: Partial<PuansizCevapDegeri>) {
    setPuansizCevaplar((prev) => ({ ...prev, [soruId]: { ...prev[soruId], ...patch } }));
  }

  // "matris": klasik puanlı evet/hayır/muaf akışı. "serbest": puansız veya yorumlu puanlı
  // (ikisi de aynı şekilde, serbest tipli sorularla cevaplanır).
  const cevaplamaSekli: 'matris' | 'serbest' =
    seciliForm?.puanli && seciliForm?.puanGirisTipi !== 'manuel' ? 'matris' : 'serbest';
  const isManuelPuan = seciliForm?.puanli === true && seciliForm?.puanGirisTipi === 'manuel';

  function soruCevaplandiMi(soru: Soru): boolean {
    if (cevaplamaSekli === 'matris') return !!cevaplar[soru.id];
    return puansizCevapDoluMu(soru.tip ?? 'evet_hayir_muaf', puansizCevaplar[soru.id]);
  }

  const tumSorular = bolumDetaylar.flatMap((b) => b.sorular);
  const cevaplananSayisi = tumSorular.filter(soruCevaplandiMi).length;
  const tamamlandi = cevaplananSayisi === tumSorular.length && tumSorular.length > 0;
  const ilerleme = tumSorular.length > 0 ? cevaplananSayisi / tumSorular.length : 0;
  const toplamPuanGirisSayisi = Number(toplamPuanGiris);
  const skorGecerli =
    !isManuelPuan ||
    (toplamPuanGiris.trim() !== '' && Number.isFinite(toplamPuanGirisSayisi) && toplamPuanGirisSayisi >= 0 && toplamPuanGirisSayisi <= 100);

  async function handleKaydet() {
    if (!seciliForm || !seciliPersonel || !seciliMagaza || !user) return;
    setKaydediliyor(true);

    /* ── Devam modu: mevcut açık raporu güncelle ve kapat ── */
    if (devamDegId) {
      try {
        const entries = await Promise.all(
          Object.entries(puansizCevaplar).map(async ([soruId, cevap]) => {
            const fotolar = cevap.fotograflar ?? [];
            if (fotolar.length === 0) return [soruId, cevap] as const;
            // Yalnızca cihazdaki yeni fotoğrafları yükle; zaten yüklenmiş (https) olanları koru
            const yuklenenler = await Promise.all(
              fotolar.map((uri, i) =>
                uri.startsWith('http')
                  ? Promise.resolve(uri)
                  : uploadDegerlendirmeFoto(
                      { degerlendirmeId: devamDegId, soruId, magazaAd: seciliMagaza.ad, personelAd: seciliPersonel.ad, tarih: izlenmeTarihi },
                      uri,
                      i
                    )
              )
            );
            return [soruId, { ...cevap, fotograflar: yuklenenler }] as const;
          })
        );
        // Rapor sahibi (kameramanId/Ad) ilk oluşturan kişide sabit kalır
        await updatePuansizDegerlendirme(devamDegId, {
          puansizCevaplar: Object.fromEntries(entries),
          izlenmeTarihi: Timestamp.fromDate(new Date(izlenmeTarihi + 'T12:00:00')),
          toplamPuan: isManuelPuan ? Number(toplamPuanGiris) : null,
          maxPuan: null,
          durum: 'kapali',
        });
        router.replace(`/degerlendirme/${devamDegId}`);
      } catch {
        Alert.alert('Hata', 'Değerlendirme kaydedilemedi. Lütfen tekrar deneyin.');
        setKaydediliyor(false);
      }
      return;
    }

    const soruSnapshot: Record<string, SoruSnapshot> = {};
    tumSorular.forEach((s) => {
      soruSnapshot[s.id] = { metin: s.metin, puan: s.puan, hedefYuzde: s.hedefYuzde, tip: s.tip };
    });

    const bolumSnapshot: Record<string, BolumSnapshot> = {};
    bolumDetaylar.forEach((b) => {
      bolumSnapshot[b.id] = { ad: b.ad, soruIdleri: b.soruIdleri };
    });

    let toplamPuan: number | null = null;
    let maxPuan: number | null = null;
    if (cevaplamaSekli === 'matris') {
      const hesap = hesaplaPuan(cevaplar, soruSnapshot);
      toplamPuan = hesap.toplamPuan;
      maxPuan = hesap.maxPuan;
    } else if (isManuelPuan) {
      toplamPuan = Number(toplamPuanGiris);
    }

    try {
      const customId = generateCustomId(seciliPersonel.ad);
      let uploadedPuansizCevaplar: Record<string, PuansizCevapDegeri> = puansizCevaplar;

      if (cevaplamaSekli === 'serbest') {
        const entries = await Promise.all(
          Object.entries(puansizCevaplar).map(async ([soruId, cevap]) => {
            if (!cevap.fotograflar || cevap.fotograflar.length === 0) return [soruId, cevap] as const;
            const yuklenenler = await Promise.all(
              cevap.fotograflar.map((uri, i) =>
                uploadDegerlendirmeFoto(
                  { degerlendirmeId: customId, soruId, magazaAd: seciliMagaza.ad, personelAd: seciliPersonel.ad, tarih: izlenmeTarihi },
                  uri,
                  i
                )
              )
            );
            return [soruId, { ...cevap, fotograflar: yuklenenler }] as const;
          })
        );
        uploadedPuansizCevaplar = Object.fromEntries(entries);
      }

      const id = await createDegerlendirme(
        {
          formId: seciliForm.id,
          formAd: seciliForm.ad,
          personelId: seciliPersonel.id,
          personelAd: seciliPersonel.ad,
          magazaId: seciliMagaza.id,
          magazaAd: seciliMagaza.ad,
          kameramanId: user.uid,
          kameramanAd: kullanici?.displayName ?? user.displayName ?? '',
          izlenmeTarihi: Timestamp.fromDate(new Date(izlenmeTarihi + 'T12:00:00')),
          raporlamaTarihi: Timestamp.fromDate(new Date()),
          ay: new Date(izlenmeTarihi + 'T12:00:00').getMonth(),
          yil: new Date(izlenmeTarihi + 'T12:00:00').getFullYear(),
          durum: 'kapali',
          izlenmeler: [],
          puanli: seciliForm.puanli,
          puanGirisTipi: seciliForm.puanGirisTipi,
          skorlamaSistemi: seciliForm.skorlamaSistemi,
          toplamPuan,
          maxPuan,
          cevaplar: cevaplamaSekli === 'matris' ? cevaplar : {},
          puansizCevaplar: cevaplamaSekli === 'matris' ? undefined : uploadedPuansizCevaplar,
          bolumSnapshot,
          soruSnapshot,
        },
        customId
      );

      router.replace(`/degerlendirme/${id}`);
    } catch {
      Alert.alert('Hata', 'Değerlendirme kaydedilemedi. Lütfen tekrar deneyin.');
      setKaydediliyor(false);
    }
  }

  async function fotografEkle(soruId: string) {
    const izin = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!izin.granted) {
      Alert.alert('İzin gerekli', 'Fotoğraf eklemek için galeri erişim izni vermelisiniz.');
      return;
    }
    const sonuc = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.7,
    });
    if (sonuc.canceled || sonuc.assets.length === 0) return;
    const yeniUrler = sonuc.assets.map((a) => a.uri);
    setPuansizCevap(soruId, {
      fotograflar: [...(puansizCevaplar[soruId]?.fotograflar ?? []), ...yeniUrler],
    });
  }

  function fotografSil(soruId: string, uri: string) {
    setPuansizCevap(soruId, {
      fotograflar: (puansizCevaplar[soruId]?.fotograflar ?? []).filter((u) => u !== uri),
    });
  }

  if (yukleniyor) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#4f46e5" size="large" />
      </View>
    );
  }

  // ─── Adım 1: Seçim ─────────────────────────────────────────────────────────

  if (adim === 'secim') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          {/* Mağaza */}
          <View style={styles.alan}>
            <Text style={styles.alanLabel}>Mağaza</Text>
            <TouchableOpacity
              style={[styles.secici, seciliMagaza && styles.seciciDolu]}
              onPress={() => setMagazaModal(true)}
            >
              <Text style={seciliMagaza ? styles.seciciDoluText : styles.seciciPlaceholder}>
                {seciliMagaza ? seciliMagaza.ad : 'Mağaza seçin...'}
              </Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Form */}
          <View style={styles.alan}>
            <Text style={styles.alanLabel}>Form</Text>
            <TouchableOpacity
              style={[styles.secici, seciliForm && styles.seciciDolu]}
              onPress={() => setFormModal(true)}
            >
              <Text style={seciliForm ? styles.seciciDoluText : styles.seciciPlaceholder}>
                {seciliForm ? seciliForm.ad : 'Form seçin...'}
              </Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Personel */}
          <View style={styles.alan}>
            <Text style={styles.alanLabel}>
              Personel {personelYukleniyor && <ActivityIndicator size="small" color="#94a3b8" />}
            </Text>
            <TouchableOpacity
              style={[
                styles.secici,
                seciliPersonel && styles.seciciDolu,
                !seciliMagaza && styles.seciciDisabled,
              ]}
              onPress={() => seciliMagaza && setPersonelModal(true)}
              disabled={!seciliMagaza || personelYukleniyor}
            >
              <Text
                style={
                  !seciliMagaza
                    ? styles.seciciDisabledText
                    : seciliPersonel
                    ? styles.seciciDoluText
                    : styles.seciciPlaceholder
                }
              >
                {!seciliMagaza
                  ? 'Önce mağaza seçin'
                  : personelYukleniyor
                  ? 'Yükleniyor...'
                  : seciliPersonel
                  ? seciliPersonel.ad
                  : 'Personel seçin...'}
              </Text>
              {seciliMagaza && !personelYukleniyor && <Text style={styles.chevron}>›</Text>}
            </TouchableOpacity>
          </View>

          {/* Tarih */}
          <View style={styles.alan}>
            <Text style={styles.alanLabel}>İzlenme Tarihi</Text>
            <TextInput
              style={styles.tarihInput}
              value={izlenmeTarihi}
              onChangeText={setIzlenmeTarihi}
              placeholder="YYYY-AA-GG"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              maxLength={10}
            />
          </View>

          <TouchableOpacity
            style={[
              styles.baslaBtn,
              (!seciliForm || !seciliPersonel || !seciliMagaza || baslaniyor) && styles.baslaBtnDisabled,
            ]}
            onPress={handleBasla}
            disabled={!seciliForm || !seciliPersonel || !seciliMagaza || baslaniyor}
            activeOpacity={0.85}
          >
            {baslaniyor ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.baslaBtnText}>Başla →</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Modaller */}
        <SeciciModal
          visible={magazaModal}
          onClose={() => setMagazaModal(false)}
          onSelect={handleMagazaSec}
          items={magazalar}
          title="Mağaza Seç"
          placeholder="Mağaza ara..."
        />
        <SeciciModal
          visible={formModal}
          onClose={() => setFormModal(false)}
          onSelect={(f) => { setSeciliForm(f as Form); setFormModal(false); }}
          items={formlar}
          title="Form Seç"
          placeholder="Form ara..."
        />
        <SeciciModal
          visible={personelModal}
          onClose={() => setPersonelModal(false)}
          onSelect={(p) => { setSeciliPersonel(p as Personel); setPersonelModal(false); }}
          items={personeller}
          title="Personel Seç"
          placeholder="Personel ara..."
        />
      </ScrollView>
    );
  }

  // ─── Adım 2: Cevapla ───────────────────────────────────────────────────────

  function renderFotoStrip(soru: Soru) {
    const fotograflar = puansizCevaplar[soru.id]?.fotograflar ?? [];
    return (
      <View style={styles.fotoStrip}>
        {fotograflar.map((uri) => (
          <TouchableOpacity key={uri} onLongPress={() => fotografSil(soru.id, uri)} activeOpacity={0.8}>
            <Image source={{ uri }} style={styles.fotoThumb} />
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.fotoEkleBtn} onPress={() => fotografEkle(soru.id)} activeOpacity={0.75}>
          <Text style={styles.fotoEkleBtnText}>+ Foto</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function renderCevapAlani(soru: Soru) {
    const tip: SoruTipi = soru.tip ?? 'evet_hayir_muaf';

    if (tip === 'evet_hayir_muaf') {
      const cevap = cevaplamaSekli === 'matris' ? cevaplar[soru.id] : puansizCevaplar[soru.id]?.evetHayirMuaf;
      return (
        <View style={styles.cevapBtnRow}>
          {(['evet', 'hayir', 'muaf'] as CevapSecenegi[]).map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[
                styles.cevapBtn,
                cevap === opt && opt === 'evet' && styles.cevapBtnEvet,
                cevap === opt && opt === 'hayir' && styles.cevapBtnHayir,
                cevap === opt && opt === 'muaf' && styles.cevapBtnMuaf,
              ]}
              onPress={() =>
                cevaplamaSekli === 'matris' ? setCevap(soru.id, opt) : setPuansizCevap(soru.id, { evetHayirMuaf: opt })
              }
              activeOpacity={0.75}
            >
              <Text
                style={[
                  styles.cevapBtnText,
                  cevap === opt && opt === 'evet' && styles.cevapTextEvet,
                  cevap === opt && opt === 'hayir' && styles.cevapTextHayir,
                  cevap === opt && opt === 'muaf' && styles.cevapTextMuaf,
                ]}
              >
                {opt === 'evet' ? 'Evet' : opt === 'hayir' ? 'Hayır' : 'Muaf'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      );
    }

    if (tip === 'sayi') {
      const deger = puansizCevaplar[soru.id]?.sayi;
      return (
        <TextInput
          style={styles.puansizInput}
          value={deger === undefined ? '' : String(deger)}
          onChangeText={(v) => setPuansizCevap(soru.id, { sayi: v === '' ? undefined : Number(v) })}
          keyboardType="numeric"
          placeholder="Sayı girin..."
          placeholderTextColor="#94a3b8"
        />
      );
    }

    if (tip === 'tarih' || tip === 'saat') {
      const deger = tip === 'tarih' ? puansizCevaplar[soru.id]?.tarih : puansizCevaplar[soru.id]?.saat;
      return (
        <TouchableOpacity
          style={styles.puansizSecici}
          onPress={() => { setIosPickerDeger(new Date()); setTarihSaatSecici({ soruId: soru.id, tip }); }}
          activeOpacity={0.75}
        >
          <Text style={deger ? styles.puansizSeciciDoluText : styles.seciciPlaceholder}>
            {deger || (tip === 'tarih' ? 'Tarih seçin...' : 'Saat seçin...')}
          </Text>
        </TouchableOpacity>
      );
    }

    if (tip === 'kisa_metin') {
      return (
        <TextInput
          style={styles.puansizInput}
          value={puansizCevaplar[soru.id]?.kisaMetin ?? ''}
          onChangeText={(v) => setPuansizCevap(soru.id, { kisaMetin: v })}
          placeholder="Kısa cevap..."
          placeholderTextColor="#94a3b8"
        />
      );
    }

    // yorum
    return (
      <TextInput
        style={[styles.puansizInput, styles.puansizYorumInput]}
        value={puansizCevaplar[soru.id]?.yorum ?? ''}
        onChangeText={(v) => setPuansizCevap(soru.id, { yorum: v })}
        placeholder="Yorumunuzu yazın..."
        placeholderTextColor="#94a3b8"
        multiline
      />
    );
  }

  return (
    <View style={styles.flex}>
      {/* Progress bar */}
      <View style={styles.progressWrap}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${ilerleme * 100}%` }]} />
        </View>
        <Text style={styles.progressText}>{cevaplananSayisi} / {tumSorular.length}</Text>
      </View>

      {/* İçerik */}
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Özet */}
        <View style={styles.ozetKart}>
          <Text style={styles.ozetForm}>{seciliForm?.ad}</Text>
          <Text style={styles.ozetPersonel}>{seciliPersonel?.ad} · {seciliMagaza?.ad}</Text>
        </View>

        {/* Bölümler */}
        {bolumDetaylar.map((bolum) => (
          <View key={bolum.id} style={styles.bolumKart}>
            <View style={styles.bolumHeader}>
              <Text style={styles.bolumAd}>{bolum.ad}</Text>
              <Text style={styles.bolumSayac}>
                {bolum.sorular.filter(soruCevaplandiMi).length}/{bolum.sorular.length}
              </Text>
            </View>

            {bolum.sorular.map((soru, i) => (
              <View key={soru.id} style={[styles.soruRow, i > 0 && styles.soruRowBorder]}>
                <Text style={styles.soruMetin}>
                  <Text style={styles.soruNo}>{i + 1}. </Text>
                  {soru.metin}
                  {cevaplamaSekli === 'matris' && (
                    <Text style={styles.soruPuan}> ({soru.puan}p)</Text>
                  )}
                </Text>
                {renderCevapAlani(soru)}
                {cevaplamaSekli === 'serbest' && renderFotoStrip(soru)}
              </View>
            ))}
          </View>
        ))}

        {/* Toplam Puan (yorumlu puanlı) */}
        {isManuelPuan && (
          <View style={styles.bolumKart}>
            <View style={styles.bolumHeader}>
              <Text style={styles.bolumAd}>Toplam Puan (0-100)</Text>
            </View>
            <View style={styles.soruRow}>
              <TextInput
                style={styles.puansizInput}
                value={toplamPuanGiris}
                onChangeText={setToplamPuanGiris}
                keyboardType="numeric"
                placeholder="ör. 87"
                placeholderTextColor="#94a3b8"
              />
            </View>
            {toplamPuanGiris.trim() !== '' && !skorGecerli && (
              <Text style={{ color: '#ef4444', fontSize: 12, paddingHorizontal: 14, paddingBottom: 10 }}>
                Puan 0 ile 100 arasında olmalıdır.
              </Text>
            )}
          </View>
        )}

        {/* Kaydet butonu */}
        <TouchableOpacity
          style={[styles.kaydetBtn, (!tamamlandi || !skorGecerli || kaydediliyor) && styles.kaydetBtnDisabled]}
          onPress={handleKaydet}
          disabled={!tamamlandi || !skorGecerli || kaydediliyor}
          activeOpacity={0.85}
        >
          {kaydediliyor ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.kaydetBtnText}>
              {tamamlandi ? 'Değerlendirmeyi Tamamla ✓' : `${tumSorular.length - cevaplananSayisi} soru kaldı`}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Tarih/Saat Seçici */}
      {tarihSaatSecici && Platform.OS === 'android' && (
        <DateTimePicker
          value={new Date()}
          mode={tarihSaatSecici.tip === 'tarih' ? 'date' : 'time'}
          display="default"
          onChange={(event, selected) => {
            const { soruId, tip } = tarihSaatSecici;
            setTarihSaatSecici(null);
            if (event.type === 'dismissed' || !selected) return;
            setPuansizCevap(soruId, tip === 'tarih' ? { tarih: formatTarih(selected) } : { saat: formatSaat(selected) });
          }}
        />
      )}
      {tarihSaatSecici && Platform.OS === 'ios' && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setTarihSaatSecici(null)}>
          <View style={modalStyles.pickerOverlay}>
            <View style={modalStyles.pickerCard}>
              <DateTimePicker
                value={iosPickerDeger}
                mode={tarihSaatSecici.tip === 'tarih' ? 'date' : 'time'}
                display="spinner"
                onChange={(_, selected) => selected && setIosPickerDeger(selected)}
              />
              <View style={modalStyles.pickerBtnRow}>
                <TouchableOpacity onPress={() => setTarihSaatSecici(null)} style={modalStyles.pickerBtnCancel}>
                  <Text style={modalStyles.pickerBtnCancelText}>İptal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    const { soruId, tip } = tarihSaatSecici;
                    setPuansizCevap(soruId, tip === 'tarih' ? { tarih: formatTarih(iosPickerDeger) } : { saat: formatSaat(iosPickerDeger) });
                    setTarihSaatSecici(null);
                  }}
                  style={modalStyles.pickerBtnConfirm}
                >
                  <Text style={modalStyles.pickerBtnConfirmText}>Tamam</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

function formatTarih(d: Date): string {
  return d.toISOString().split('T')[0];
}

function formatSaat(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#f8fafc' },
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  alan: { marginBottom: 16 },
  alanLabel: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6 },
  secici: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  seciciDolu: { borderColor: '#c7d2fe', backgroundColor: '#eef2ff' },
  seciciDisabled: { backgroundColor: '#f8fafc', borderColor: '#f1f5f9' },
  seciciPlaceholder: { color: '#94a3b8', fontSize: 14 },
  seciciDoluText: { color: '#3730a3', fontSize: 14, fontWeight: '600', flex: 1 },
  seciciDisabledText: { color: '#cbd5e1', fontSize: 14 },
  chevron: { color: '#94a3b8', fontSize: 20, marginLeft: 4 },
  tarihInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 14,
    color: '#0f172a',
    backgroundColor: '#fff',
  },
  baslaBtn: {
    marginTop: 8,
    backgroundColor: '#4f46e5',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  baslaBtnDisabled: { opacity: 0.45 },
  baslaBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  // Progress
  progressWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 10,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#4f46e5', borderRadius: 3 },
  progressText: { fontSize: 12, color: '#94a3b8', fontWeight: '600', minWidth: 40, textAlign: 'right' },
  // Özet
  ozetKart: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  ozetForm: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  ozetPersonel: { fontSize: 12, color: '#94a3b8', marginTop: 3 },
  // Bölüm
  bolumKart: {
    backgroundColor: '#fff',
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    overflow: 'hidden',
  },
  bolumHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  bolumAd: { fontSize: 13, fontWeight: '700', color: '#1e293b' },
  bolumSayac: { fontSize: 12, color: '#94a3b8' },
  soruRow: { paddingHorizontal: 16, paddingVertical: 14 },
  soruRowBorder: { borderTopWidth: 1, borderTopColor: '#f8fafc' },
  soruMetin: { fontSize: 14, color: '#334155', lineHeight: 20, marginBottom: 10 },
  soruNo: { fontWeight: '600', color: '#94a3b8' },
  soruPuan: { color: '#4f46e5', fontWeight: '600' },
  cevapBtnRow: { flexDirection: 'row', gap: 8 },
  cevapBtn: {
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  cevapBtnEvet: { borderColor: '#10b981', backgroundColor: '#f0fdf4' },
  cevapBtnHayir: { borderColor: '#ef4444', backgroundColor: '#fef2f2' },
  cevapBtnMuaf: { borderColor: '#94a3b8', backgroundColor: '#f8fafc' },
  cevapBtnText: { fontSize: 13, fontWeight: '600', color: '#94a3b8' },
  cevapTextEvet: { color: '#10b981' },
  cevapTextHayir: { color: '#ef4444' },
  cevapTextMuaf: { color: '#64748b' },
  // Puansız cevap alanları
  puansizInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
    backgroundColor: '#fff',
  },
  puansizYorumInput: { minHeight: 70, textAlignVertical: 'top' },
  puansizSecici: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: '#fff',
  },
  puansizSeciciDoluText: { color: '#0f172a', fontSize: 14, fontWeight: '600' },
  // Fotoğraf
  fotoStrip: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  fotoThumb: { width: 56, height: 56, borderRadius: 8, backgroundColor: '#f1f5f9' },
  fotoEkleBtn: {
    width: 56,
    height: 56,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  fotoEkleBtnText: { fontSize: 11, fontWeight: '600', color: '#4f46e5' },
  // Kaydet
  kaydetBtn: {
    marginTop: 16,
    backgroundColor: '#4f46e5',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  kaydetBtnDisabled: { opacity: 0.5 },
  kaydetBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

const modalStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 20 : 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  title: { fontSize: 17, fontWeight: '700', color: '#0f172a' },
  closeBtn: { fontSize: 15, color: '#4f46e5', fontWeight: '600' },
  aramaWrap: { padding: 16 },
  aramaInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: '#0f172a',
  },
  item: { paddingHorizontal: 20, paddingVertical: 15 },
  itemText: { fontSize: 15, color: '#1e293b' },
  sep: { height: 1, backgroundColor: '#f8fafc', marginHorizontal: 20 },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#94a3b8', fontSize: 14 },
  // Tarih/Saat Seçici (iOS)
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', justifyContent: 'flex-end' },
  pickerCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 24 },
  pickerBtnRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 8 },
  pickerBtnCancel: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  pickerBtnCancelText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  pickerBtnConfirm: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#4f46e5', alignItems: 'center' },
  pickerBtnConfirmText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});
