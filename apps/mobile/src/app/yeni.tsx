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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Timestamp } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import {
  getFormlar,
  getMagazalar,
  getPersonellerByMagaza,
  getForm,
  getBolum,
  getSoru,
  createDegerlendirme,
} from '@/lib/firestore';
import { hesaplaPuan } from '@/lib/skorlama';
import type {
  Form,
  Magaza,
  Personel,
  Bolum,
  Soru,
  CevapSecenegi,
  BolumSnapshot,
  SoruSnapshot,
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
  const { user, kullanici } = useAuth();
  const router = useRouter();

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

  const [yukleniyor, setYukleniyor] = useState(true);
  const [baslaniyor, setBaslaniyor] = useState(false);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [personelYukleniyor, setPersonelYukleniyor] = useState(false);

  useEffect(() => {
    Promise.all([getFormlar(), getMagazalar()]).then(([f, m]) => {
      setFormlar(f);
      setMagazalar(m);
      setYukleniyor(false);
    });
  }, []);

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
    setBaslaniyor(true);

    const form = await getForm(seciliForm.id);
    if (!form) { setBaslaniyor(false); return; }

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

    setBolumDetaylar(detaylar);
    setCevaplar({});
    setAdim('cevapla');
    setBaslaniyor(false);
  }

  function setCevap(soruId: string, cevap: CevapSecenegi) {
    setCevaplar((prev) => ({ ...prev, [soruId]: cevap }));
  }

  const tumSorular = bolumDetaylar.flatMap((b) => b.sorular);
  const cevaplananSayisi = tumSorular.filter((s) => cevaplar[s.id]).length;
  const tamamlandi = cevaplananSayisi === tumSorular.length && tumSorular.length > 0;
  const ilerleme = tumSorular.length > 0 ? cevaplananSayisi / tumSorular.length : 0;

  async function handleKaydet() {
    if (!seciliForm || !seciliPersonel || !seciliMagaza || !user) return;
    setKaydediliyor(true);

    const soruSnapshot: Record<string, SoruSnapshot> = {};
    tumSorular.forEach((s) => {
      soruSnapshot[s.id] = { metin: s.metin, puan: s.puan, hedefYuzde: s.hedefYuzde };
    });

    const bolumSnapshot: Record<string, BolumSnapshot> = {};
    bolumDetaylar.forEach((b) => {
      bolumSnapshot[b.id] = { ad: b.ad, soruIdleri: b.soruIdleri };
    });

    let toplamPuan: number | null = null;
    let maxPuan: number | null = null;
    if (seciliForm.puanli) {
      const hesap = hesaplaPuan(cevaplar, soruSnapshot);
      toplamPuan = hesap.toplamPuan;
      maxPuan = hesap.maxPuan;
    }

    try {
      const id = await createDegerlendirme({
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
        puanli: seciliForm.puanli,
        skorlamaSistemi: seciliForm.skorlamaSistemi,
        toplamPuan,
        maxPuan,
        cevaplar,
        bolumSnapshot,
        soruSnapshot,
      });

      router.replace(`/degerlendirme/${id}`);
    } catch {
      Alert.alert('Hata', 'Değerlendirme kaydedilemedi. Lütfen tekrar deneyin.');
      setKaydediliyor(false);
    }
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
                {bolum.sorular.filter((s) => cevaplar[s.id]).length}/{bolum.sorular.length}
              </Text>
            </View>

            {bolum.sorular.map((soru, i) => {
              const cevap = cevaplar[soru.id];
              return (
                <View key={soru.id} style={[styles.soruRow, i > 0 && styles.soruRowBorder]}>
                  <Text style={styles.soruMetin}>
                    <Text style={styles.soruNo}>{i + 1}. </Text>
                    {soru.metin}
                    {seciliForm?.puanli && (
                      <Text style={styles.soruPuan}> ({soru.puan}p)</Text>
                    )}
                  </Text>
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
                        onPress={() => setCevap(soru.id, opt)}
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
                </View>
              );
            })}
          </View>
        ))}

        {/* Kaydet butonu */}
        <TouchableOpacity
          style={[styles.kaydetBtn, (!tamamlandi || kaydediliyor) && styles.kaydetBtnDisabled]}
          onPress={handleKaydet}
          disabled={!tamamlandi || kaydediliyor}
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
    </View>
  );
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
});
