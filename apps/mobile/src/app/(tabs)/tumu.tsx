import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Modal,
} from 'react-native';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Timestamp } from 'firebase/firestore';
import {
  getDegerlendirmelerFiltreli,
  getMagazalar,
  getFormlar,
  getKullanicilar,
  getPersoneller,
  type DegerlendirmeFiltre,
} from '@/lib/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { useBmBolge } from '@/hooks/useBmBolge';
import type { Degerlendirme } from '@/lib/types';

const SAYFA_BOYU = 100;
const AYLAR = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];

type TipFiltre = 'matris' | 'yorumlu' | 'puansiz';
type PuanFiltre = 'yuksek' | 'orta' | 'dusuk';

/** Ekranda tutulan filtre durumu — undefined alan "Tümü" demektir. */
interface Filtreler {
  durum?: 'acik' | 'kapali';
  tip?: TipFiltre;
  puan?: PuanFiltre;
  magazaId?: string;
  formId?: string;
  kameramanId?: string;
  personelId?: string;
  donem?: string; // "ay-yil"
}

interface Secenek {
  id: string;
  ad: string;
}

const DURUM_SECENEK = [
  { id: undefined, ad: 'Tümü' },
  { id: 'acik' as const, ad: 'Devam Eden' },
  { id: 'kapali' as const, ad: 'Kapalı' },
];
const TIP_SECENEK = [
  { id: undefined, ad: 'Tümü' },
  { id: 'matris' as const, ad: 'Puanlı' },
  { id: 'yorumlu' as const, ad: 'Yorumlu' },
  { id: 'puansiz' as const, ad: 'Puansız' },
];
const PUAN_SECENEK = [
  { id: undefined, ad: 'Tümü' },
  { id: 'yuksek' as const, ad: '%80+' },
  { id: 'orta' as const, ad: '%50–79' },
  { id: 'dusuk' as const, ad: '%50 altı' },
];

function filtreSayisi(f: Filtreler): number {
  return Object.values(f).filter((v) => v !== undefined).length;
}

function sunucuFiltresi(f: Filtreler): DegerlendirmeFiltre {
  const out: DegerlendirmeFiltre = {
    durum: f.durum,
    tip: f.tip,
    puan: f.puan,
    magazaId: f.magazaId,
    formId: f.formId,
    kameramanId: f.kameramanId,
    personelId: f.personelId,
  };
  if (f.donem) {
    const [ay, yil] = f.donem.split('-').map(Number);
    out.ay = ay;
    out.yil = yil;
  }
  return out;
}

/* ────────────────────────── Filtre paneli ────────────────────────── */

type SecimSayfa = 'magaza' | 'form' | 'kameraman' | 'personel' | 'donem';

const SECIM_BASLIK: Record<SecimSayfa, string> = {
  magaza: 'Mağaza',
  form: 'Form',
  kameraman: 'Kameraman',
  personel: 'Personel',
  donem: 'Dönem',
};

function Segment<T extends string>({
  deger, secenekler, onSec,
}: {
  deger?: T;
  secenekler: { id?: T; ad: string }[];
  onSec(v?: T): void;
}) {
  return (
    <View style={st.segment}>
      {secenekler.map((s) => {
        const secili = deger === s.id;
        return (
          <TouchableOpacity
            key={s.ad}
            style={[st.segmentBtn, secili && st.segmentBtnAktif]}
            onPress={() => onSec(s.id)}
            activeOpacity={0.7}
          >
            <Text style={[st.segmentText, secili && st.segmentTextAktif]} numberOfLines={1}>{s.ad}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function FiltrePaneli({
  acik, mevcut, secenekler, onUygula, onKapat,
}: {
  acik: boolean;
  mevcut: Filtreler;
  secenekler: Record<SecimSayfa, Secenek[]>;
  onUygula(f: Filtreler): void;
  onKapat(): void;
}) {
  const [taslak, setTaslak] = useState<Filtreler>(mevcut);
  const [sayfa, setSayfa] = useState<'ana' | SecimSayfa>('ana');
  const [arama, setArama] = useState('');
  // Tablette görev çubuğu pencerenin altına taşıyor — panel altına güvenli alan payı
  const insets = useSafeAreaInsets();

  // Panel her açıldığında taslağı ekrandaki geçerli filtrelerden başlat
  useEffect(() => {
    if (acik) {
      setTaslak(mevcut);
      setSayfa('ana');
      setArama('');
    }
  }, [acik]); // eslint-disable-line react-hooks/exhaustive-deps

  function secimDegeri(s: SecimSayfa): string | undefined {
    if (s === 'magaza') return taslak.magazaId;
    if (s === 'form') return taslak.formId;
    if (s === 'kameraman') return taslak.kameramanId;
    if (s === 'personel') return taslak.personelId;
    return taslak.donem;
  }
  function secimYaz(s: SecimSayfa, id: string | undefined) {
    setTaslak((t) => ({
      ...t,
      ...(s === 'magaza' ? { magazaId: id } : {}),
      ...(s === 'form' ? { formId: id } : {}),
      ...(s === 'kameraman' ? { kameramanId: id } : {}),
      ...(s === 'personel' ? { personelId: id } : {}),
      ...(s === 'donem' ? { donem: id } : {}),
    }));
  }
  function secimAdi(s: SecimSayfa): string {
    const id = secimDegeri(s);
    if (!id) return 'Tümü';
    return secenekler[s].find((x) => x.id === id)?.ad ?? 'Tümü';
  }

  const sayi = filtreSayisi(taslak);

  return (
    <Modal visible={acik} transparent animationType="slide" onRequestClose={onKapat}>
      <View style={st.modalArka}>
        <View style={[st.panel, { paddingBottom: 16 + Math.max(insets.bottom, 10) }]}>
          {sayfa === 'ana' ? (
            <>
              <View style={st.panelBaslikSatiri}>
                <Text style={st.panelBaslik}>Filtrele</Text>
                <TouchableOpacity onPress={onKapat} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={st.panelKapat}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={{ flexGrow: 0, flexShrink: 1 }} showsVerticalScrollIndicator={false}>
                <Text style={st.grupEtiket}>DURUM</Text>
                <Segment deger={taslak.durum} secenekler={DURUM_SECENEK} onSec={(v) => setTaslak((t) => ({ ...t, durum: v }))} />

                <Text style={st.grupEtiket}>RAPOR TİPİ</Text>
                <Segment deger={taslak.tip} secenekler={TIP_SECENEK} onSec={(v) => setTaslak((t) => ({ ...t, tip: v }))} />

                <Text style={st.grupEtiket}>PUAN ARALIĞI</Text>
                <Segment deger={taslak.puan} secenekler={PUAN_SECENEK} onSec={(v) => setTaslak((t) => ({ ...t, puan: v }))} />

                <Text style={st.grupEtiket}>KAYIT</Text>
                <View style={st.secimKart}>
                  {(['magaza', 'form', 'kameraman', 'personel', 'donem'] as SecimSayfa[]).map((s, i) => (
                    <TouchableOpacity
                      key={s}
                      style={[st.secimSatir, i > 0 && st.secimAyrac]}
                      activeOpacity={0.7}
                      onPress={() => { setArama(''); setSayfa(s); }}
                    >
                      <Text style={st.secimEtiket}>{SECIM_BASLIK[s]}</Text>
                      <View style={st.secimSag}>
                        <Text style={[st.secimDeger, secimDegeri(s) && st.secimDegerAktif]} numberOfLines={1}>
                          {secimAdi(s)}
                        </Text>
                        <Text style={st.secimOk}>›</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <View style={st.panelAltSatir}>
                <TouchableOpacity style={st.sifirlaBtn} onPress={() => setTaslak({})} activeOpacity={0.7}>
                  <Text style={st.sifirlaText}>Sıfırla</Text>
                </TouchableOpacity>
                <TouchableOpacity style={st.uygulaBtn} onPress={() => onUygula(taslak)} activeOpacity={0.8}>
                  <Text style={st.uygulaText}>{sayi > 0 ? `Uygula (${sayi} filtre)` : 'Uygula'}</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <View style={st.panelBaslikSatiri}>
                <TouchableOpacity onPress={() => setSayfa('ana')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={st.panelGeri}>‹ Geri</Text>
                </TouchableOpacity>
                <Text style={st.panelBaslik}>{SECIM_BASLIK[sayfa]}</Text>
                <View style={{ width: 44 }} />
              </View>
              {secenekler[sayfa].length > 8 && (
                <TextInput
                  style={st.panelArama}
                  placeholder="Ara..."
                  placeholderTextColor="#94a3b8"
                  value={arama}
                  onChangeText={setArama}
                  autoCorrect={false}
                />
              )}
              <FlatList
                style={{ flexGrow: 0, flexShrink: 1 }}
                data={[
                  { id: '__tumu__', ad: 'Tümü' },
                  ...(arama.trim()
                    ? secenekler[sayfa].filter((s) => s.ad.toLowerCase().includes(arama.trim().toLowerCase()))
                    : secenekler[sayfa]),
                ]}
                keyExtractor={(x) => x.id}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => {
                  const secili = (secimDegeri(sayfa) ?? '__tumu__') === item.id;
                  return (
                    <TouchableOpacity
                      style={[st.listeSatir, secili && st.listeSatirSecili]}
                      activeOpacity={0.7}
                      onPress={() => { secimYaz(sayfa, item.id === '__tumu__' ? undefined : item.id); setSayfa('ana'); }}
                    >
                      <Text style={[st.listeSatirText, secili && st.listeSatirTextSecili]}>{item.ad}</Text>
                      {secili && <Text style={st.listeCheck}>✓</Text>}
                    </TouchableOpacity>
                  );
                }}
              />
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

/* ────────────────────────── Ana ekran ────────────────────────── */

export default function TumDegerlendirmelerScreen() {
  const router = useRouter();
  const { kullanici } = useAuth();
  // Bölge müdürü: sonuçlar her koşulda kendi bölgesinin mağazalarıyla sınırlanır
  const bm = kullanici?.rol === 'bolge_muduru';
  const { magazalar: bmMagazalar, magazaIdSet, loading: bmYukleniyor } = useBmBolge();
  const [raporlar, setRaporlar] = useState<Degerlendirme[]>([]);
  const [loading, setLoading] = useState(true);
  const [dahaYukleniyor, setDahaYukleniyor] = useState(false);
  const [dahaVar, setDahaVar] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [arama, setArama] = useState('');
  const [filtre, setFiltre] = useState<Filtreler>({});
  const [panelAcik, setPanelAcik] = useState(false);

  // Seçim listeleri
  const [magazalar, setMagazalar] = useState<Secenek[]>([]);
  const [formlar, setFormlar] = useState<Secenek[]>([]);
  const [kameramanlar, setKameramanlar] = useState<Secenek[]>([]);
  const [personeller, setPersoneller] = useState<Secenek[]>([]);

  const imlecRef = useRef<Timestamp | null>(null);
  const yukleSayacRef = useRef(0); // eski isteğin sonucu yenisini ezmesin

  // Başka ekranlardan filtreli açılış (örn. BM panelinde mağaza/personel satırına
  // dokunma). `t` her dokunuşta değişir ki aynı seçim tekrar tetiklenebilsin.
  const params = useLocalSearchParams<{ magazaId?: string; personelId?: string; t?: string }>();
  useEffect(() => {
    if (!params.magazaId && !params.personelId) return;
    setLoading(true);
    setFiltre((f) => ({
      ...f,
      ...(params.magazaId ? { magazaId: params.magazaId } : {}),
      ...(params.personelId ? { personelId: params.personelId } : {}),
    }));
  }, [params.magazaId, params.personelId, params.t]);

  const donemler: Secenek[] = (() => {
    const simdi = new Date();
    return Array.from({ length: 24 }, (_, i) => {
      const d = new Date(simdi.getFullYear(), simdi.getMonth() - i, 1);
      return { id: `${d.getMonth()}-${d.getFullYear()}`, ad: `${AYLAR[d.getMonth()]} ${d.getFullYear()}` };
    });
  })();

  useEffect(() => {
    (async () => {
      try {
        const [m, f, k, p] = await Promise.all([getMagazalar(), getFormlar(), getKullanicilar(), getPersoneller()]);
        setMagazalar(m.map((x) => ({ id: x.id, ad: x.ad })));
        setFormlar(f.map((x) => ({ id: x.id, ad: x.ad })));
        setKameramanlar(k.filter((x) => x.rol === 'kameraman' && x.aktif !== false).map((x) => ({ id: x.id, ad: x.displayName })));
        setPersoneller(p.map((x) => ({ id: x.id, ad: x.ad })));
      } catch {
        // Seçim listeleri yüklenemese de rapor listesi çalışmaya devam eder
      }
    })();
  }, []);

  const yukle = useCallback(async (sifirla: boolean) => {
    // BM: bölge çözülmeden yükleme yapma — kapsamsız liste asla görünmesin
    if (bm && bmYukleniyor) return;
    const sayac = ++yukleSayacRef.current;
    try {
      if (bm && magazaIdSet.size === 0) {
        // Bölge atanmamış veya bölgede mağaza yok
        imlecRef.current = null;
        setRaporlar([]);
        setDahaVar(false);
        return;
      }
      const sonuc = await getDegerlendirmelerFiltreli(
        { ...sunucuFiltresi(filtre), ...(bm ? { magazaIdleri: [...magazaIdSet] } : {}) },
        SAYFA_BOYU,
        sifirla ? undefined : imlecRef.current ?? undefined
      );
      if (sayac !== yukleSayacRef.current) return; // araya yeni istek girdi
      imlecRef.current = sonuc.imlec;
      setRaporlar((p) => (sifirla ? sonuc.liste : [...p, ...sonuc.liste]));
      setDahaVar(sonuc.dahaVar);
    } finally {
      if (sayac === yukleSayacRef.current) {
        setLoading(false);
        setRefreshing(false);
        setDahaYukleniyor(false);
      }
    }
  }, [filtre, bm, bmYukleniyor, magazaIdSet]);

  // İlk açılış, sekmeye dönüş ve filtre değişimi: listeyi baştan yükle
  useFocusEffect(useCallback(() => { yukle(true); }, [yukle]));

  function dahaYukle() {
    if (dahaYukleniyor || loading || !dahaVar) return;
    setDahaYukleniyor(true);
    yukle(false);
  }

  function filtreUygula(f: Filtreler) {
    setPanelAcik(false);
    setLoading(true);
    setFiltre(f);
  }
  function filtreKaldir(alan: keyof Filtreler) {
    setLoading(true);
    setFiltre((f) => ({ ...f, [alan]: undefined }));
  }
  function filtreleriTemizle() {
    setLoading(true);
    setFiltre({});
  }

  const aktifSayi = filtreSayisi(filtre);
  const filtreAktif = aktifSayi > 0;

  // BM: mağaza filtre seçenekleri yalnız bölge mağazaları
  const magazaSecenekleri: Secenek[] = bm
    ? bmMagazalar.map((m) => ({ id: m.id, ad: m.ad }))
    : magazalar;

  // Metin araması anlık, yüklü liste üzerinde çalışır
  const gorunen = arama.trim()
    ? raporlar.filter((d) => {
        const q = arama.trim().toLowerCase();
        return (
          d.personelAd.toLowerCase().includes(q) ||
          d.formAd.toLowerCase().includes(q) ||
          (d.magazaAd ?? '').toLowerCase().includes(q) ||
          (d.kameramanAd ?? '').toLowerCase().includes(q)
        );
      })
    : raporlar;

  // Aktif filtre çipleri (tek tek kaldırılabilir)
  const aktifCipler: { alan: keyof Filtreler; etiket: string }[] = [];
  if (filtre.durum) aktifCipler.push({ alan: 'durum', etiket: filtre.durum === 'acik' ? 'Devam Eden' : 'Kapalı' });
  if (filtre.tip) aktifCipler.push({ alan: 'tip', etiket: TIP_SECENEK.find((s) => s.id === filtre.tip)?.ad ?? '' });
  if (filtre.puan) aktifCipler.push({ alan: 'puan', etiket: PUAN_SECENEK.find((s) => s.id === filtre.puan)?.ad ?? '' });
  if (filtre.magazaId) aktifCipler.push({ alan: 'magazaId', etiket: magazaSecenekleri.find((m) => m.id === filtre.magazaId)?.ad ?? 'Mağaza' });
  if (filtre.formId) aktifCipler.push({ alan: 'formId', etiket: formlar.find((f) => f.id === filtre.formId)?.ad ?? 'Form' });
  if (filtre.kameramanId) aktifCipler.push({ alan: 'kameramanId', etiket: kameramanlar.find((k) => k.id === filtre.kameramanId)?.ad ?? 'Kameraman' });
  if (filtre.personelId) aktifCipler.push({ alan: 'personelId', etiket: personeller.find((p) => p.id === filtre.personelId)?.ad ?? 'Personel' });
  if (filtre.donem) aktifCipler.push({ alan: 'donem', etiket: donemler.find((d) => d.id === filtre.donem)?.ad ?? 'Dönem' });

  return (
    <View style={st.container}>
      <View style={st.header}>
        <Text style={st.headerTitle}>{bm ? 'Bölge Raporları' : 'Tüm Değerlendirmeler'}</Text>
        <Text style={st.headerSub}>
          {loading
            ? 'Yükleniyor...'
            : filtreAktif || arama.trim()
              ? `${gorunen.length} sonuç${dahaVar ? ' · daha eskiler için listeyi kaydırın' : ''}`
              : `Son ${raporlar.length} rapor`}
        </Text>
      </View>

      {/* Arama + Filtrele */}
      <View style={st.aramaSatir}>
        <TextInput
          style={st.aramaInput}
          placeholder="Personel, form, mağaza ara..."
          placeholderTextColor="#94a3b8"
          value={arama}
          onChangeText={setArama}
          clearButtonMode="while-editing"
        />
        <TouchableOpacity style={[st.filtreBtn, filtreAktif && st.filtreBtnAktif]} onPress={() => setPanelAcik(true)} activeOpacity={0.7}>
          <View style={st.huni}>
            <View style={[st.huniCizgi, { width: 16 }, filtreAktif && st.huniCizgiAktif]} />
            <View style={[st.huniCizgi, { width: 10 }, filtreAktif && st.huniCizgiAktif]} />
            <View style={[st.huniCizgi, { width: 4 }, filtreAktif && st.huniCizgiAktif]} />
          </View>
          <Text style={[st.filtreBtnText, filtreAktif && st.filtreBtnTextAktif]}>Filtrele</Text>
          {filtreAktif && (
            <View style={st.rozet}><Text style={st.rozetText}>{aktifSayi}</Text></View>
          )}
        </TouchableOpacity>
      </View>

      {/* Aktif filtre çipleri */}
      {aktifCipler.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={st.cipSerit}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 7, alignItems: 'center' }}
        >
          {aktifCipler.map((c) => (
            <TouchableOpacity key={c.alan} style={st.cip} onPress={() => filtreKaldir(c.alan)} activeOpacity={0.7}>
              <Text style={st.cipText} numberOfLines={1}>{c.etiket}</Text>
              <Text style={st.cipKaldir}>✕</Text>
            </TouchableOpacity>
          ))}
          {aktifCipler.length > 1 && (
            <TouchableOpacity onPress={filtreleriTemizle} activeOpacity={0.7}>
              <Text style={st.temizleText}>Tümünü temizle</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}

      {loading ? (
        <View style={st.center}><ActivityIndicator color="#4f46e5" size="large" /></View>
      ) : (
        <FlatList
          data={gorunen}
          keyExtractor={(d) => d.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); yukle(true); }} tintColor="#4f46e5" />
          }
          contentContainerStyle={{ paddingBottom: 20, flexGrow: 1 }}
          onEndReachedThreshold={0.4}
          onEndReached={dahaYukle}
          renderItem={({ item }) => {
            const acik = item.durum === 'acik';
            const tarih = item.olusturmaTarihi?.toDate?.().toLocaleDateString('tr-TR') ?? '—';
            const yuzde =
              item.puanli && item.toplamPuan !== null && item.maxPuan && item.maxPuan > 0
                ? Math.round((item.toplamPuan / item.maxPuan) * 100)
                : null;
            return (
              <TouchableOpacity style={st.satir} activeOpacity={0.7} onPress={() => router.push(`/degerlendirme/${item.id}`)}>
                <View style={st.satirLeft}>
                  <View style={[st.avatar, acik && { backgroundColor: '#fffbeb' }]}>
                    <Text style={[st.avatarText, acik && { color: '#d97706' }]}>{item.personelAd.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={st.satirInfo}>
                    <Text style={st.personelAd}>{item.personelAd}</Text>
                    <Text style={st.formAd} numberOfLines={1}>{item.formAd}</Text>
                    <Text style={st.altBilgi} numberOfLines={1}>
                      📍 {item.magazaAd || '—'}{item.kameramanAd ? `  ·  🎥 ${item.kameramanAd}` : ''}
                    </Text>
                  </View>
                </View>
                <View style={st.satirRight}>
                  {acik ? (
                    <View style={st.acikRozet}><Text style={st.acikRozetText}>DEVAM EDİYOR</Text></View>
                  ) : yuzde !== null ? (
                    <Text style={[st.puan, { color: yuzde >= 80 ? '#10b981' : yuzde >= 50 ? '#f59e0b' : '#ef4444' }]}>%{yuzde}</Text>
                  ) : item.puanli && item.toplamPuan !== null ? (
                    <Text style={[st.puan, { color: '#4f46e5' }]}>{item.toplamPuan}</Text>
                  ) : (
                    <View style={st.puansizBadge}><Text style={st.puansizText}>Puansız</Text></View>
                  )}
                  <Text style={st.tarih}>{tarih}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
          ListFooterComponent={
            dahaVar ? (
              <TouchableOpacity style={st.dahaBtn} onPress={dahaYukle} disabled={dahaYukleniyor} activeOpacity={0.8}>
                {dahaYukleniyor ? (
                  <ActivityIndicator color="#4f46e5" size="small" />
                ) : (
                  <Text style={st.dahaBtnText}>
                    {filtreAktif ? 'Daha Eski Kayıtlarda Ara' : 'Daha Fazla Yükle (100)'}
                  </Text>
                )}
              </TouchableOpacity>
            ) : null
          }
          ListEmptyComponent={
            <View style={st.empty}>
              <Text style={st.emptyIcon}>🔍</Text>
              <Text style={st.emptyTitle}>
                {filtreAktif || arama.trim() ? 'Filtreye uyan sonuç bulunamadı' : 'Henüz rapor yok'}
              </Text>
              {filtreAktif && (
                <TouchableOpacity onPress={filtreleriTemizle} activeOpacity={0.7}>
                  <Text style={st.emptyTemizle}>Filtreleri temizle</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      <FiltrePaneli
        acik={panelAcik}
        mevcut={filtre}
        secenekler={{ magaza: magazaSecenekleri, form: formlar, kameraman: kameramanlar, personel: personeller, donem: donemler }}
        onUygula={filtreUygula}
        onKapat={() => setPanelAcik(false)}
      />
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#edf2ee' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 10 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  headerSub: { fontSize: 13, color: '#94a3b8', marginTop: 2 },

  aramaSatir: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  aramaInput: {
    flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: '#0f172a',
  },
  filtreBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12,
    paddingHorizontal: 13,
  },
  filtreBtnAktif: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
  huni: { gap: 2.5, alignItems: 'center' },
  huniCizgi: { height: 2, borderRadius: 1, backgroundColor: '#475569' },
  huniCizgiAktif: { backgroundColor: '#fff' },
  filtreBtnText: { fontSize: 13, fontWeight: '700', color: '#475569' },
  filtreBtnTextAktif: { color: '#fff' },
  rozet: {
    backgroundColor: '#fff', borderRadius: 9, minWidth: 18, height: 18,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  rozetText: { fontSize: 10.5, fontWeight: '800', color: '#4f46e5' },

  cipSerit: { maxHeight: 40, marginBottom: 8 },
  cip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: 190,
    paddingHorizontal: 11, paddingVertical: 7, borderRadius: 16,
    backgroundColor: '#eef2ff', borderWidth: 1, borderColor: '#c7d2fe',
  },
  cipText: { fontSize: 12, fontWeight: '700', color: '#4338ca', flexShrink: 1 },
  cipKaldir: { fontSize: 11, fontWeight: '800', color: '#818cf8' },
  temizleText: { fontSize: 12, fontWeight: '700', color: '#ef4444', paddingHorizontal: 6 },

  satir: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 8,
    borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#f1f5f9',
  },
  satirLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#eef2ff',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  avatarText: { fontSize: 14, fontWeight: '700', color: '#4f46e5' },
  satirInfo: { flex: 1 },
  personelAd: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  formAd: { fontSize: 12, color: '#64748b', marginTop: 1 },
  altBilgi: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  satirRight: { alignItems: 'flex-end', minWidth: 70 },
  puan: { fontSize: 15, fontWeight: '700' },
  acikRozet: { backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  acikRozetText: { fontSize: 9, fontWeight: '800', color: '#d97706', letterSpacing: 0.4 },
  puansizBadge: { backgroundColor: '#f8fafc', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  puansizText: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
  tarih: { fontSize: 11, color: '#cbd5e1', marginTop: 4 },
  dahaBtn: {
    marginHorizontal: 16, marginTop: 4, marginBottom: 24,
    backgroundColor: '#eef2ff', borderWidth: 1, borderColor: '#c7d2fe',
    borderRadius: 12, paddingVertical: 13, alignItems: 'center',
  },
  dahaBtnText: { fontSize: 13.5, fontWeight: '700', color: '#4f46e5' },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyIcon: { fontSize: 44 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: '#475569' },
  emptyTemizle: { fontSize: 13.5, fontWeight: '700', color: '#4f46e5', padding: 8 },

  /* Filtre paneli */
  modalArka: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  panel: {
    backgroundColor: '#f8fafc', borderTopLeftRadius: 22, borderTopRightRadius: 22,
    paddingHorizontal: 18, paddingTop: 16, maxHeight: '86%',
  },
  panelBaslikSatiri: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  panelBaslik: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  panelKapat: { fontSize: 16, fontWeight: '700', color: '#94a3b8', padding: 4 },
  panelGeri: { fontSize: 15, fontWeight: '700', color: '#4f46e5', width: 60 },
  grupEtiket: {
    fontSize: 10.5, fontWeight: '800', color: '#94a3b8', letterSpacing: 1.2,
    marginTop: 14, marginBottom: 7,
  },
  segment: { flexDirection: 'row', backgroundColor: '#e2e8f0', borderRadius: 11, padding: 3, gap: 3 },
  segmentBtn: { flex: 1, borderRadius: 8, paddingVertical: 9, alignItems: 'center' },
  segmentBtnAktif: { backgroundColor: '#fff', shadowColor: '#0f172a', shadowOpacity: 0.08, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  segmentText: { fontSize: 12.5, fontWeight: '600', color: '#64748b' },
  segmentTextAktif: { color: '#4f46e5', fontWeight: '800' },
  secimKart: { backgroundColor: '#fff', borderRadius: 13, borderWidth: 1, borderColor: '#f1f5f9', overflow: 'hidden' },
  secimSatir: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 13 },
  secimAyrac: { borderTopWidth: 1, borderTopColor: '#f8fafc' },
  secimEtiket: { fontSize: 14, fontWeight: '600', color: '#334155' },
  secimSag: { flexDirection: 'row', alignItems: 'center', gap: 7, flexShrink: 1, maxWidth: '60%' },
  secimDeger: { fontSize: 13.5, color: '#94a3b8', flexShrink: 1 },
  secimDegerAktif: { color: '#4f46e5', fontWeight: '700' },
  secimOk: { fontSize: 18, color: '#cbd5e1', fontWeight: '300' },
  panelAltSatir: { flexDirection: 'row', gap: 10, marginTop: 18 },
  sifirlaBtn: {
    flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center',
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0',
  },
  sifirlaText: { fontSize: 14.5, fontWeight: '700', color: '#64748b' },
  uygulaBtn: { flex: 2, borderRadius: 12, paddingVertical: 14, alignItems: 'center', backgroundColor: '#4f46e5' },
  uygulaText: { fontSize: 14.5, fontWeight: '800', color: '#fff' },
  panelArama: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, color: '#0f172a', marginTop: 8, marginBottom: 10,
  },
  listeSatir: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13,
    marginBottom: 6, borderWidth: 1, borderColor: '#f1f5f9',
  },
  listeSatirSecili: { borderColor: '#c7d2fe', backgroundColor: '#eef2ff' },
  listeSatirText: { fontSize: 14, fontWeight: '600', color: '#334155' },
  listeSatirTextSecili: { color: '#4338ca', fontWeight: '800' },
  listeCheck: { fontSize: 14, fontWeight: '800', color: '#4f46e5' },
});
