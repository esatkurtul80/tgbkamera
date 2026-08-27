import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
  ScrollView,
  TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Timestamp } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import {
  getForm,
  getBolum,
  getSoru,
  getDegerlendirme,
  getAcikDegerlendirmeler,
  createDegerlendirme,
  updateDegerlendirmeIzlenmeler,
  finalizeDegerlendirme,
} from '@/lib/firestore';
import { hesaplaPuanFromIzlenmeler, soruPuanHesapla } from '@/lib/skorlama';
import type {
  CevapSecenegi,
  SkorlamaSistemi,
  BolumSnapshot,
  SoruSnapshot,
  SoruIzlenme,
} from '@/lib/types';

/* ─── Sabitler ──────────────────────────────────────────────────────────────── */
const AYLAR = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
const GUN_TR = ['Paz','Pzt','Sal','Çar','Per','Cum','Cmt'];

const CEVAPLAR: { deger: CevapSecenegi; etiket: string; renk: string; zemin: string }[] = [
  { deger: 'evet', etiket: 'EVET', renk: '#10b981', zemin: '#ecfdf5' },
  { deger: 'hayir', etiket: 'HAYIR', renk: '#ef4444', zemin: '#fef2f2' },
  { deger: 'muaf', etiket: 'MUAF', renk: '#94a3b8', zemin: '#f8fafc' },
];

interface IzlenmeLocal {
  id: string;
  tarih: Date;
  cevaplar: Record<string, CevapSecenegi | undefined>;
  notlar?: Record<string, string>;
  kaydedenId?: string;
  kaydedenAd?: string;
}

interface SoruSatiri {
  id: string;
  metin: string;
  puan: number;
  hedefYuzde?: number;
  bolumAd: string;
  bolumSira: number;
  soruSira: number;
}

function saatEtiketi(t: Date): string {
  if (t.getHours() === 0 && t.getMinutes() === 0) return '--:--';
  return `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
}

/* ─── Ana Bileşen ───────────────────────────────────────────────────────────── */
export default function MatrisScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, kullanici } = useAuth();
  const params = useLocalSearchParams<{
    devam?: string;
    formId?: string;
    magazaId?: string;
    personelId?: string;
    formAd?: string;
    magazaAd?: string;
    personelAd?: string;
  }>();

  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState('');
  const [degId, setDegId] = useState<string | null>(null);
  const [baslik, setBaslik] = useState({ personelAd: '', magazaAd: '', formAd: '' });
  const [ayYil, setAyYil] = useState<{ ay: number; yil: number }>(() => {
    const n = new Date();
    return { ay: n.getMonth(), yil: n.getFullYear() };
  });
  const [puanli, setPuanli] = useState(true);
  const [sistem, setSistem] = useState<SkorlamaSistemi>('oran');
  const [soruSnap, setSoruSnap] = useState<Record<string, SoruSnapshot>>({});
  const [soruSatirlari, setSoruSatirlari] = useState<SoruSatiri[]>([]);
  const [izlenmeler, setIzlenmeler] = useState<IzlenmeLocal[]>([]);

  const [seciliGun, setSeciliGun] = useState(() => new Date().getDate());
  const [seciliIzlenmeId, setSeciliIzlenmeId] = useState<string | null>(null);

  const [saatModal, setSaatModal] = useState<{ izId: string; deger: string } | null>(null);
  const [hucreMenu, setHucreMenu] = useState<{ izId: string; soruId: string } | null>(null);
  const [notModal, setNotModal] = useState<{ izId: string; soruId: string; taslak: string } | null>(null);
  const [hucrePano, setHucrePano] = useState<{ cevap: CevapSecenegi | undefined; not?: string } | null>(null);

  const [senkron, setSenkron] = useState(false);
  const [kaydediliyor, setKaydediliyor] = useState(false);

  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const olusturulduRef = useRef(false);
  const gunListRef = useRef<FlatList<number>>(null);

  /* ── Yükleme ── */
  useEffect(() => {
    if (!user) return;
    let iptal = false;

    async function snapshotlardanKur(
      bolumSnapshot: Record<string, BolumSnapshot>,
      soruSnapshot: Record<string, SoruSnapshot>
    ) {
      const satirlar: SoruSatiri[] = [];
      Object.entries(bolumSnapshot).forEach(([, bolum], bIdx) => {
        bolum.soruIdleri.forEach((sid, sIdx) => {
          const s = soruSnapshot[sid];
          if (!s) return;
          satirlar.push({
            id: sid, metin: s.metin, puan: s.puan, hedefYuzde: s.hedefYuzde,
            bolumAd: bolum.ad, bolumSira: bIdx, soruSira: sIdx,
          });
        });
      });
      setSoruSnap(soruSnapshot);
      setSoruSatirlari(satirlar);
    }

    function izlenmeleriYukle(izler: SoruIzlenme[]) {
      const locals: IzlenmeLocal[] = (izler || []).map((iz) => ({
        id: iz.id,
        tarih: iz.tarih.toDate(),
        cevaplar: iz.cevaplar as Record<string, CevapSecenegi | undefined>,
        notlar: iz.notlar,
        kaydedenId: iz.kaydedenId,
        kaydedenAd: iz.kaydedenAd,
      }));
      setIzlenmeler(locals);
    }

    async function yukle() {
      try {
        if (params.devam) {
          /* ── Devam modu: açık raporu yükle ── */
          const deg = await getDegerlendirme(params.devam);
          if (!deg || deg.durum === 'kapali') {
            if (!iptal) setHata('Açık rapor bulunamadı ya da kapatılmış.');
            return;
          }
          if (iptal) return;
          setDegId(deg.id);
          setBaslik({ personelAd: deg.personelAd, magazaAd: deg.magazaAd, formAd: deg.formAd });
          setAyYil({ ay: deg.ay, yil: deg.yil });
          setPuanli(deg.puanli);
          setSistem(deg.skorlamaSistemi ?? 'oran');
          await snapshotlardanKur(deg.bolumSnapshot, deg.soruSnapshot);
          izlenmeleriYukle(deg.izlenmeler);
          // Son izlenmenin gününü seç
          const son = (deg.izlenmeler || [])[deg.izlenmeler.length - 1];
          if (son) {
            const t = son.tarih.toDate();
            setSeciliGun(t.getDate());
            setSeciliIzlenmeId(son.id);
          }
        } else if (params.formId && params.magazaId && params.personelId) {
          /* ── Yeni rapor ── */
          const now = new Date();
          const form = await getForm(params.formId);
          if (!form) { if (!iptal) setHata('Form bulunamadı.'); return; }

          // Bu ay için zaten açık rapor var mı? Varsa onu devam ettir.
          const acikler = await getAcikDegerlendirmeler(
            params.personelId, params.magazaId, now.getMonth(), now.getFullYear()
          );
          const mevcut = acikler.find((d) => d.formId === params.formId);
          if (mevcut) {
            if (iptal) return;
            setDegId(mevcut.id);
            setBaslik({ personelAd: mevcut.personelAd, magazaAd: mevcut.magazaAd, formAd: mevcut.formAd });
            setAyYil({ ay: mevcut.ay, yil: mevcut.yil });
            setPuanli(mevcut.puanli);
            setSistem(mevcut.skorlamaSistemi ?? 'oran');
            await snapshotlardanKur(mevcut.bolumSnapshot, mevcut.soruSnapshot);
            izlenmeleriYukle(mevcut.izlenmeler);
            return;
          }

          // Form detaylarını yükle → snapshot kur → açık raporu hemen oluştur
          const bolumSnapshot: Record<string, BolumSnapshot> = {};
          const soruSnapshot: Record<string, SoruSnapshot> = {};
          for (const bid of form.bolumIdleri) {
            const b = await getBolum(bid);
            if (!b) continue;
            bolumSnapshot[b.id] = { ad: b.ad, soruIdleri: b.soruIdleri };
            for (const sid of b.soruIdleri) {
              const s = await getSoru(sid);
              if (s) soruSnapshot[s.id] = { metin: s.metin, puan: s.puan, hedefYuzde: s.hedefYuzde, tip: s.tip };
            }
          }
          if (iptal) return;

          setBaslik({
            personelAd: params.personelAd ?? '',
            magazaAd: params.magazaAd ?? '',
            formAd: form.ad,
          });
          setAyYil({ ay: now.getMonth(), yil: now.getFullYear() });
          setPuanli(form.puanli);
          setSistem(form.skorlamaSistemi ?? 'oran');
          await snapshotlardanKur(bolumSnapshot, soruSnapshot);
          setIzlenmeler([]);

          if (!olusturulduRef.current) {
            olusturulduRef.current = true;
            const yeniId = await createDegerlendirme({
              formId: form.id, formAd: form.ad,
              personelId: params.personelId, personelAd: params.personelAd ?? '',
              magazaId: params.magazaId, magazaAd: params.magazaAd ?? '',
              kameramanId: user!.uid, kameramanAd: kullanici?.displayName ?? user!.displayName ?? '',
              izlenmeTarihi: Timestamp.now(), raporlamaTarihi: Timestamp.now(),
              ay: now.getMonth(), yil: now.getFullYear(),
              durum: 'acik', izlenmeler: [],
              puanli: form.puanli, puanGirisTipi: form.puanGirisTipi, skorlamaSistemi: form.skorlamaSistemi,
              toplamPuan: null, maxPuan: null,
              cevaplar: {}, puansizCevaplar: {},
              bolumSnapshot, soruSnapshot,
            });
            if (!iptal) setDegId(yeniId);
          }
        } else {
          setHata('Eksik parametre — bu ekran panelden açılmalı.');
        }
      } catch (e: any) {
        if (!iptal) setHata(e?.message ?? 'Yükleme hatası');
      } finally {
        if (!iptal) setYukleniyor(false);
      }
    }

    yukle();
    return () => { iptal = true; };
  }, [user, params.devam, params.formId, params.magazaId, params.personelId]);

  /* ── Ay/gün türetmeleri ── */
  const gunSayisi = useMemo(
    () => new Date(ayYil.yil, ayYil.ay + 1, 0).getDate(),
    [ayYil]
  );
  const gunler = useMemo(() => Array.from({ length: gunSayisi }, (_, i) => i + 1), [gunSayisi]);

  const gunlukMap = useMemo(() => {
    const map = new Map<number, IzlenmeLocal[]>();
    for (let g = 1; g <= gunSayisi; g++) map.set(g, []);
    for (const iz of izlenmeler)
      if (iz.tarih.getMonth() === ayYil.ay && iz.tarih.getFullYear() === ayYil.yil)
        map.get(iz.tarih.getDate())?.push(iz);
    return map;
  }, [izlenmeler, ayYil, gunSayisi]);

  const gununIzlenmeleri = gunlukMap.get(seciliGun) ?? [];
  const seciliIzlenme = gununIzlenmeleri.find((i) => i.id === seciliIzlenmeId) ?? null;

  // Seçili gün değişince o günün ilk izlenmesini otomatik seç
  useEffect(() => {
    if (!gununIzlenmeleri.find((i) => i.id === seciliIzlenmeId)) {
      setSeciliIzlenmeId(gununIzlenmeleri[0]?.id ?? null);
    }
  }, [seciliGun, izlenmeler]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Puan ── */
  const puan = useMemo(() => {
    if (!puanli) return null;
    return hesaplaPuanFromIzlenmeler(
      izlenmeler.map((i) => ({ cevaplar: i.cevaplar as Record<string, CevapSecenegi> })),
      soruSnap, sistem
    );
  }, [izlenmeler, soruSnap, sistem, puanli]);
  const puanYuzdesi = puan && puan.maxPuan > 0 ? Math.round((puan.toplamPuan / puan.maxPuan) * 100) : null;

  /* ── Otomatik kayıt (800ms debounce, weble aynı) ── */
  useEffect(() => {
    if (!degId || yukleniyor) return;
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(async () => {
      const izlenmelerFS = izlenmeler.map((i) => ({
        id: i.id,
        tarih: Timestamp.fromDate(i.tarih),
        cevaplar: Object.fromEntries(
          Object.entries(i.cevaplar).filter(([, v]) => v)
        ) as Record<string, CevapSecenegi>,
        ...(i.notlar && Object.keys(i.notlar).length > 0 ? { notlar: i.notlar } : {}),
        kaydedenId: i.kaydedenId,
        kaydedenAd: i.kaydedenAd,
      }));
      let tp: number | null = null, mp: number | null = null;
      if (puanli && Object.keys(soruSnap).length > 0) {
        const h = hesaplaPuanFromIzlenmeler(izlenmelerFS.map((i) => ({ cevaplar: i.cevaplar })), soruSnap, sistem);
        tp = h.toplamPuan; mp = h.maxPuan;
      }
      setSenkron(true);
      updateDegerlendirmeIzlenmeler(degId, izlenmelerFS, tp, mp, {
        id: user!.uid,
        ad: kullanici?.displayName ?? user!.displayName ?? '',
      })
        .then(() => setSenkron(false))
        .catch(() => setSenkron(false));
    }, 800);
  }, [izlenmeler]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Aksiyonlar ── */
  function izlenmeEkle() {
    // Saat kasıtlı olarak 00:00 — kullanıcı gerçek saati kendisi girer.
    const t = new Date(ayYil.yil, ayYil.ay, seciliGun, 0, 0);
    const yeni: IzlenmeLocal = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      tarih: t,
      cevaplar: {},
      kaydedenId: user?.uid,
      kaydedenAd: kullanici?.displayName ?? user?.displayName ?? '',
    };
    setIzlenmeler((p) => [...p, yeni]);
    setSeciliIzlenmeId(yeni.id);
    setSaatModal({ izId: yeni.id, deger: '' });
  }

  function izlenmeSil(izId: string) {
    Alert.alert('Saati Sil', 'Bu saate ait tüm cevaplar silinecek. Emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil', style: 'destructive',
        onPress: () => setIzlenmeler((p) => p.filter((i) => i.id !== izId)),
      },
    ]);
  }

  function saatKaydet() {
    if (!saatModal) return;
    const raw = saatModal.deger.replace(/[^\d:]/g, '');
    if (raw.trim() !== '') {
      const parts = raw.includes(':') ? raw.split(':') : [raw.slice(0, 2), raw.slice(2, 4)];
      const h = Math.min(23, Math.max(0, parseInt(parts[0] || '0') || 0));
      const m = Math.min(59, Math.max(0, parseInt(parts[1] || '0') || 0));
      setIzlenmeler((p) =>
        p.map((i) => {
          if (i.id !== saatModal.izId) return i;
          const t = new Date(i.tarih);
          t.setHours(h, m);
          return { ...i, tarih: t };
        })
      );
    }
    setSaatModal(null);
  }

  const setCevap = useCallback((izId: string, soruId: string, cevap: CevapSecenegi | undefined) => {
    setIzlenmeler((p) => p.map((i) => (i.id !== izId ? i : { ...i, cevaplar: { ...i.cevaplar, [soruId]: cevap } })));
  }, []);

  const setNot = useCallback((izId: string, soruId: string, not: string | undefined) => {
    setIzlenmeler((p) =>
      p.map((i) => {
        if (i.id !== izId) return i;
        const notlar = { ...(i.notlar ?? {}) };
        const temiz = not?.trim();
        if (temiz) notlar[soruId] = temiz;
        else delete notlar[soruId];
        return { ...i, notlar };
      })
    );
  }, []);

  async function handleKaydet() {
    if (!degId || !user) return;
    Alert.alert('Değerlendirmeyi Kaydet', 'Rapor kapatılacak ve tamamlanmış olarak işaretlenecek. Emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Kaydet',
        onPress: async () => {
          setKaydediliyor(true);
          if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
          try {
            const izlenmelerFS = izlenmeler
              .filter((i) => Object.values(i.cevaplar).some((v) => v !== undefined))
              .map((i) => ({
                id: i.id,
                tarih: Timestamp.fromDate(i.tarih),
                cevaplar: Object.fromEntries(Object.entries(i.cevaplar).filter(([, v]) => v)) as Record<string, CevapSecenegi>,
                ...(i.notlar && Object.keys(i.notlar).length > 0 ? { notlar: i.notlar } : {}),
                kaydedenId: i.kaydedenId,
                kaydedenAd: i.kaydedenAd,
              }));
            let tp: number | null = null, mp: number | null = null;
            if (puanli) {
              const h = hesaplaPuanFromIzlenmeler(izlenmelerFS.map((i) => ({ cevaplar: i.cevaplar })), soruSnap, sistem);
              tp = h.toplamPuan; mp = h.maxPuan;
            }
            await finalizeDegerlendirme(degId, izlenmelerFS, tp, mp, {
              id: user.uid,
              ad: kullanici?.displayName ?? user.displayName ?? '',
            });
            router.replace(`/degerlendirme/${degId}`);
          } catch (e: any) {
            Alert.alert('Hata', e?.message ?? 'Kaydedilemedi');
          } finally {
            setKaydediliyor(false);
          }
        },
      },
    ]);
  }

  /* ── Render ── */
  if (yukleniyor)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );

  if (hata)
    return (
      <View style={styles.center}>
        <Text style={styles.hataText}>{hata}</Text>
        <TouchableOpacity style={styles.geriBtn} onPress={() => router.back()}>
          <Text style={styles.geriBtnText}>← Geri</Text>
        </TouchableOpacity>
      </View>
    );

  const bugun = new Date();
  const buAyMi = bugun.getMonth() === ayYil.ay && bugun.getFullYear() === ayYil.yil;

  const hucreNot = (izId: string | null, soruId: string) =>
    izId ? izlenmeler.find((i) => i.id === izId)?.notlar?.[soruId] : undefined;

  return (
    <View style={styles.container}>
      {/* ── Üst bilgi ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.headerGeri}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerAd} numberOfLines={1}>{baslik.personelAd}</Text>
          <Text style={styles.headerAlt} numberOfLines={1}>
            {baslik.magazaAd} · {baslik.formAd} · {AYLAR[ayYil.ay]} {ayYil.yil}
          </Text>
        </View>
        {puan && puan.maxPuan > 0 && (
          <View style={styles.headerPuan}>
            <Text style={styles.headerPuanDeger}>{puan.toplamPuan}<Text style={styles.headerPuanMax}>/{puan.maxPuan}</Text></Text>
            {puanYuzdesi !== null && <Text style={styles.headerPuanYuzde}>%{puanYuzdesi}</Text>}
          </View>
        )}
      </View>

      {/* ── Gün şeridi ── */}
      <View style={styles.gunSeridi}>
        <FlatList
          ref={gunListRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          data={gunler}
          keyExtractor={(g) => String(g)}
          initialScrollIndex={Math.max(0, seciliGun - 3)}
          getItemLayout={(_, index) => ({ length: 52, offset: 52 * index, index })}
          renderItem={({ item: gun }) => {
            const d = new Date(ayYil.yil, ayYil.ay, gun);
            const sayi = gunlukMap.get(gun)?.length ?? 0;
            const secili = gun === seciliGun;
            const bugunMu = buAyMi && gun === bugun.getDate();
            return (
              <TouchableOpacity
                style={[styles.gunChip, secili && styles.gunChipSecili, bugunMu && !secili && styles.gunChipBugun]}
                onPress={() => setSeciliGun(gun)}
                activeOpacity={0.7}
              >
                <Text style={[styles.gunChipGun, secili && styles.gunChipTextSecili]}>{GUN_TR[d.getDay()]}</Text>
                <Text style={[styles.gunChipSayi, secili && styles.gunChipTextSecili]}>{String(gun).padStart(2, '0')}</Text>
                {sayi > 0 ? (
                  <View style={[styles.gunRozet, secili && styles.gunRozetSecili]}>
                    <Text style={[styles.gunRozetText, secili && { color: '#4f46e5' }]}>{sayi}</Text>
                  </View>
                ) : (
                  <View style={styles.gunRozetBos} />
                )}
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={{ paddingHorizontal: 12 }}
        />
      </View>

      {/* ── Saat çipleri ── */}
      <View style={styles.saatSatiri}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, gap: 8, alignItems: 'center' }}>
          {gununIzlenmeleri.map((iz) => {
            const secili = iz.id === seciliIzlenmeId;
            return (
              <TouchableOpacity
                key={iz.id}
                style={[styles.saatChip, secili && styles.saatChipSecili]}
                onPress={() => setSeciliIzlenmeId(iz.id)}
                onLongPress={() => izlenmeSil(iz.id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.saatChipText, secili && styles.saatChipTextSecili]}>{saatEtiketi(iz.tarih)}</Text>
                <TouchableOpacity
                  onPress={() => setSaatModal({ izId: iz.id, deger: saatEtiketi(iz.tarih) === '--:--' ? '' : saatEtiketi(iz.tarih) })}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                >
                  <Text style={[styles.saatDuzenle, secili && { color: '#c7d2fe' }]}>✎</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity style={styles.saatEkleBtn} onPress={izlenmeEkle} activeOpacity={0.7}>
            <Text style={styles.saatEkleText}>+ Saat Ekle</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* ── Sorular ── */}
      {gununIzlenmeleri.length === 0 ? (
        <View style={styles.bosGun}>
          <Text style={styles.bosGunIcon}>🕐</Text>
          <Text style={styles.bosGunText}>
            {String(seciliGun).padStart(2, '0')} {AYLAR[ayYil.ay]} için henüz izlenme yok.{'\n'}"+ Saat Ekle" ile başlayın.
          </Text>
        </View>
      ) : (
        <FlatList
          data={soruSatirlari}
          keyExtractor={(s) => s.id}
          contentContainerStyle={{ paddingBottom: 90 }}
          renderItem={({ item: soru, index }) => {
            const oncekiBolum = index > 0 ? soruSatirlari[index - 1].bolumAd : null;
            const bolumBasi = soru.bolumAd !== oncekiBolum;
            const cevap = seciliIzlenme?.cevaplar[soru.id];
            const not = hucreNot(seciliIzlenmeId, soru.id);
            const sonuc = soruPuanHesapla(
              soru.id, soruSnap[soru.id],
              izlenmeler.map((i) => ({ cevaplar: i.cevaplar as Record<string, CevapSecenegi> })),
              sistem
            );
            return (
              <View>
                {bolumBasi && (
                  <Text style={styles.bolumBaslik}>{soru.bolumAd}</Text>
                )}
                <TouchableOpacity
                  style={styles.soruKart}
                  activeOpacity={0.9}
                  onLongPress={() => seciliIzlenmeId && setHucreMenu({ izId: seciliIzlenmeId, soruId: soru.id })}
                  delayLongPress={350}
                >
                  <View style={styles.soruUst}>
                    <Text style={styles.soruNo}>{soru.soruSira + 1}</Text>
                    <Text style={styles.soruMetin}>{soru.metin}</Text>
                    {not ? <Text style={styles.notIsareti}>📝</Text> : null}
                  </View>

                  {not ? (
                    <Text style={styles.notMetin} numberOfLines={2}>Not: {not}</Text>
                  ) : null}

                  <View style={styles.cevapSatiri}>
                    {CEVAPLAR.map((c) => {
                      const aktif = cevap === c.deger;
                      return (
                        <TouchableOpacity
                          key={c.deger}
                          style={[
                            styles.cevapBtn,
                            { backgroundColor: aktif ? c.renk : c.zemin, borderColor: aktif ? c.renk : '#e2e8f0' },
                          ]}
                          onPress={() =>
                            seciliIzlenmeId && setCevap(seciliIzlenmeId, soru.id, aktif ? undefined : c.deger)
                          }
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.cevapBtnText, { color: aktif ? '#fff' : c.renk }]}>{c.etiket}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {sonuc.toplamIzlenme + sonuc.muafSayisi > 0 && (
                    <View style={styles.statSatiri}>
                      <Text style={styles.statText}>
                        <Text style={{ color: '#10b981', fontWeight: '700' }}>{sonuc.evetSayisi}E</Text>
                        {'  '}
                        <Text style={{ color: '#ef4444', fontWeight: '700' }}>{sonuc.hayirSayisi}H</Text>
                        {'  '}
                        <Text style={{ color: '#94a3b8', fontWeight: '700' }}>{sonuc.muafSayisi}M</Text>
                        {sonuc.toplamIzlenme > 0 && (
                          <Text style={{ color: '#64748b' }}>{'   ·   %'}{sonuc.oran}</Text>
                        )}
                        {soru.hedefYuzde !== undefined && (
                          <Text style={{ color: '#94a3b8' }}>{'   ·   Hedef %'}{soru.hedefYuzde}</Text>
                        )}
                      </Text>
                      {puanli && sonuc.toplamIzlenme > 0 && (
                        <Text style={[styles.statPuan, { color: sonuc.gecti ? '#10b981' : '#ef4444' }]}>
                          {sonuc.kazanilanPuan}/{soru.puan}P
                        </Text>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}

      {/* ── Alt bar ── */}
      <View style={[styles.altBar, { paddingBottom: 10 + Math.max(insets.bottom, 0) }]}>
        <View>
          {senkron ? (
            <Text style={styles.senkronText}>Kaydediliyor…</Text>
          ) : (
            <Text style={styles.senkronOk}>✓ Otomatik kaydedildi</Text>
          )}
          <Text style={styles.izlenmeSayisi}>{izlenmeler.length} izlenme</Text>
        </View>
        <TouchableOpacity
          style={[styles.kaydetBtn, kaydediliyor && { opacity: 0.6 }]}
          onPress={handleKaydet}
          disabled={kaydediliyor}
          activeOpacity={0.85}
        >
          <Text style={styles.kaydetBtnText}>{kaydediliyor ? 'Kaydediliyor…' : 'Raporu Kapat'}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Saat modalı ── */}
      <Modal visible={!!saatModal} transparent animationType="fade" onRequestClose={() => setSaatModal(null)}>
        <View style={styles.modalArka}>
          <View style={styles.modalKutu}>
            <Text style={styles.modalBaslik}>İzlenme Saati</Text>
            <TextInput
              style={styles.saatInput}
              placeholder="14:30"
              placeholderTextColor="#94a3b8"
              keyboardType="numbers-and-punctuation"
              value={saatModal?.deger ?? ''}
              onChangeText={(t) => setSaatModal((p) => (p ? { ...p, deger: t } : p))}
              autoFocus
              maxLength={5}
            />
            <View style={styles.modalBtnSatiri}>
              <TouchableOpacity style={styles.modalIptalBtn} onPress={() => setSaatModal(null)}>
                <Text style={styles.modalIptalText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalTamamBtn} onPress={saatKaydet}>
                <Text style={styles.modalTamamText}>Tamam</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Hücre menüsü (uzun basış): not / kopyala / yapıştır / sil ── */}
      <Modal visible={!!hucreMenu} transparent animationType="fade" onRequestClose={() => setHucreMenu(null)}>
        <TouchableOpacity style={styles.modalArka} activeOpacity={1} onPress={() => setHucreMenu(null)}>
          <View style={styles.menuKutu}>
            {(() => {
              if (!hucreMenu) return null;
              const iz = izlenmeler.find((i) => i.id === hucreMenu.izId);
              const cevap = iz?.cevaplar[hucreMenu.soruId];
              const not = iz?.notlar?.[hucreMenu.soruId];
              const dolu = cevap !== undefined || !!not;
              const kapat = () => setHucreMenu(null);
              return (
                <>
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => { setNotModal({ izId: hucreMenu.izId, soruId: hucreMenu.soruId, taslak: not ?? '' }); kapat(); }}
                  >
                    <Text style={styles.menuItemText}>📝 {not ? 'Notu Düzenle' : 'Hücreye Not Ekle'}</Text>
                  </TouchableOpacity>
                  {not ? (
                    <TouchableOpacity style={styles.menuItem} onPress={() => { setNot(hucreMenu.izId, hucreMenu.soruId, undefined); kapat(); }}>
                      <Text style={styles.menuItemText}>🗑 Notu Kaldır</Text>
                    </TouchableOpacity>
                  ) : null}
                  <View style={styles.menuAyrac} />
                  <TouchableOpacity
                    style={[styles.menuItem, !dolu && styles.menuItemPasif]}
                    disabled={!dolu}
                    onPress={() => { setHucrePano({ cevap, not }); kapat(); }}
                  >
                    <Text style={styles.menuItemText}>⧉ Kopyala</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.menuItem, !hucrePano && styles.menuItemPasif]}
                    disabled={!hucrePano}
                    onPress={() => {
                      if (hucrePano) {
                        setCevap(hucreMenu.izId, hucreMenu.soruId, hucrePano.cevap);
                        setNot(hucreMenu.izId, hucreMenu.soruId, hucrePano.not);
                      }
                      kapat();
                    }}
                  >
                    <Text style={styles.menuItemText}>📋 Yapıştır</Text>
                  </TouchableOpacity>
                  <View style={styles.menuAyrac} />
                  <TouchableOpacity
                    style={[styles.menuItem, !dolu && styles.menuItemPasif]}
                    disabled={!dolu}
                    onPress={() => {
                      setCevap(hucreMenu.izId, hucreMenu.soruId, undefined);
                      setNot(hucreMenu.izId, hucreMenu.soruId, undefined);
                      kapat();
                    }}
                  >
                    <Text style={[styles.menuItemText, { color: '#dc2626' }]}>✕ Hücreyi Temizle</Text>
                  </TouchableOpacity>
                </>
              );
            })()}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Not modalı ── */}
      <Modal visible={!!notModal} transparent animationType="fade" onRequestClose={() => setNotModal(null)}>
        <View style={styles.modalArka}>
          <View style={styles.modalKutu}>
            <Text style={styles.modalBaslik}>📝 Hücre Notu</Text>
            <TextInput
              style={styles.notInput}
              placeholder="Bu hücreye özel notunuzu yazın…"
              placeholderTextColor="#94a3b8"
              value={notModal?.taslak ?? ''}
              onChangeText={(t) => setNotModal((p) => (p ? { ...p, taslak: t } : p))}
              multiline
              autoFocus
            />
            <View style={styles.modalBtnSatiri}>
              <TouchableOpacity style={styles.modalIptalBtn} onPress={() => setNotModal(null)}>
                <Text style={styles.modalIptalText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalTamamBtn}
                onPress={() => {
                  if (notModal) setNot(notModal.izId, notModal.soruId, notModal.taslak);
                  setNotModal(null);
                }}
              >
                <Text style={styles.modalTamamText}>Kaydet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ─── Stiller ───────────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', gap: 12 },
  hataText: { fontSize: 14, color: '#dc2626', textAlign: 'center', paddingHorizontal: 32 },
  geriBtn: { marginTop: 8, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  geriBtnText: { fontSize: 14, fontWeight: '600', color: '#475569' },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#0f172a', paddingTop: 54, paddingBottom: 14, paddingHorizontal: 16,
  },
  headerGeri: { fontSize: 30, color: '#94a3b8', fontWeight: '600', marginTop: -4 },
  headerInfo: { flex: 1, minWidth: 0 },
  headerAd: { fontSize: 16, fontWeight: '800', color: '#fff', textTransform: 'uppercase' },
  headerAlt: { fontSize: 11.5, color: '#94a3b8', marginTop: 2 },
  headerPuan: { alignItems: 'flex-end' },
  headerPuanDeger: { fontSize: 20, fontWeight: '800', color: '#34d399' },
  headerPuanMax: { fontSize: 12, fontWeight: '600', color: '#34d39999' },
  headerPuanYuzde: { fontSize: 11, fontWeight: '700', color: '#94a3b8', marginTop: 1 },

  gunSeridi: { backgroundColor: '#fff', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  gunChip: {
    width: 44, marginRight: 8, borderRadius: 12, paddingVertical: 7,
    alignItems: 'center', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#f1f5f9',
  },
  gunChipSecili: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
  gunChipBugun: { borderColor: '#f59e0b' },
  gunChipGun: { fontSize: 9, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' },
  gunChipSayi: { fontSize: 15, fontWeight: '800', color: '#334155', marginTop: 1 },
  gunChipTextSecili: { color: '#fff' },
  gunRozet: {
    minWidth: 16, height: 16, borderRadius: 8, backgroundColor: '#eef2ff',
    alignItems: 'center', justifyContent: 'center', marginTop: 3, paddingHorizontal: 4,
  },
  gunRozetSecili: { backgroundColor: '#fff' },
  gunRozetText: { fontSize: 9, fontWeight: '800', color: '#4f46e5' },
  gunRozetBos: { height: 16, marginTop: 3 },

  saatSatiri: { backgroundColor: '#fff', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  saatChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0',
  },
  saatChipSecili: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
  saatChipText: { fontSize: 13, fontWeight: '700', color: '#475569' },
  saatChipTextSecili: { color: '#fff' },
  saatDuzenle: { fontSize: 12, color: '#94a3b8' },
  saatEkleBtn: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1, borderColor: '#c7d2fe', borderStyle: 'dashed', backgroundColor: '#eef2ff',
  },
  saatEkleText: { fontSize: 13, fontWeight: '700', color: '#4f46e5' },

  bosGun: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 40 },
  bosGunIcon: { fontSize: 40 },
  bosGunText: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 21 },

  bolumBaslik: {
    fontSize: 11, fontWeight: '800', color: '#4f46e5', textTransform: 'uppercase',
    letterSpacing: 1, paddingHorizontal: 18, paddingTop: 14, paddingBottom: 6,
  },
  soruKart: {
    backgroundColor: '#fff', marginHorizontal: 12, marginBottom: 8,
    borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#f1f5f9',
  },
  soruUst: { flexDirection: 'row', gap: 8 },
  soruNo: { fontSize: 13, fontWeight: '800', color: '#cbd5e1', minWidth: 18 },
  soruMetin: { flex: 1, fontSize: 13.5, fontWeight: '600', color: '#334155', lineHeight: 19 },
  notIsareti: { fontSize: 13 },
  notMetin: {
    fontSize: 12, color: '#92400e', backgroundColor: '#fffbeb',
    borderLeftWidth: 3, borderLeftColor: '#f59e0b', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 6, marginTop: 8, marginLeft: 26,
  },
  cevapSatiri: { flexDirection: 'row', gap: 8, marginTop: 10, marginLeft: 26 },
  cevapBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 9, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  cevapBtnText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  statSatiri: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 9, marginLeft: 26,
  },
  statText: { fontSize: 11, color: '#64748b' },
  statPuan: { fontSize: 11, fontWeight: '800' },

  altBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e2e8f0',
    paddingHorizontal: 16, paddingVertical: 10,
  },
  senkronText: { fontSize: 12, color: '#f59e0b', fontWeight: '600' },
  senkronOk: { fontSize: 12, color: '#10b981', fontWeight: '600' },
  izlenmeSayisi: { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  kaydetBtn: { backgroundColor: '#4f46e5', borderRadius: 12, paddingHorizontal: 22, paddingVertical: 12 },
  kaydetBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  modalArka: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalKutu: { width: '100%', maxWidth: 380, backgroundColor: '#fff', borderRadius: 18, padding: 20 },
  modalBaslik: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginBottom: 12 },
  saatInput: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 18, fontWeight: '700', color: '#0f172a', textAlign: 'center', letterSpacing: 2,
  },
  notInput: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: '#0f172a', minHeight: 90, textAlignVertical: 'top',
  },
  modalBtnSatiri: { flexDirection: 'row', gap: 10, marginTop: 16 },
  modalIptalBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center',
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0',
  },
  modalIptalText: { fontSize: 14, fontWeight: '600', color: '#475569' },
  modalTamamBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', backgroundColor: '#4f46e5' },
  modalTamamText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  menuKutu: { width: 260, backgroundColor: '#fff', borderRadius: 14, paddingVertical: 6, overflow: 'hidden' },
  menuItem: { paddingHorizontal: 18, paddingVertical: 13 },
  menuItemPasif: { opacity: 0.35 },
  menuItemText: { fontSize: 14, fontWeight: '600', color: '#334155' },
  menuAyrac: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 2 },
});
