import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { getDegerlendirme, getOncekiRaporPuanlari } from '@/lib/firestore';
import { soruPuanHesapla } from '@/lib/skorlama';
import type { CevapSecenegi, Degerlendirme, PuansizCevapDegeri, SoruTipi } from '@/lib/types';

const AYLAR = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];

function CevapBadge({ cevap }: { cevap: string }) {
  const config = {
    evet: { bg: '#f0fdf4', text: '#10b981', label: 'Evet ✓' },
    hayir: { bg: '#fef2f2', text: '#ef4444', label: 'Hayır ✗' },
    muaf: { bg: '#f8fafc', text: '#94a3b8', label: 'Muaf —' },
  }[cevap] ?? { bg: '#f8fafc', text: '#94a3b8', label: cevap };

  return (
    <View style={[styles.cevapBadge, { backgroundColor: config.bg }]}>
      <Text style={[styles.cevapBadgeText, { color: config.text }]}>{config.label}</Text>
    </View>
  );
}

function PuansizDeger({ tip, cevap }: { tip: SoruTipi; cevap: PuansizCevapDegeri | null }) {
  if (tip === 'evet_hayir_muaf') {
    return cevap?.evetHayirMuaf ? <CevapBadge cevap={cevap.evetHayirMuaf} /> : (
      <View style={styles.cevapBadge}><Text style={styles.cevapBadgeText}>—</Text></View>
    );
  }
  const metin =
    tip === 'sayi' ? (cevap?.sayi !== undefined ? String(cevap.sayi) : null) :
    tip === 'tarih' ? cevap?.tarih ?? null :
    tip === 'saat' ? cevap?.saat ?? null :
    tip === 'kisa_metin' ? cevap?.kisaMetin ?? null :
    cevap?.yorum ?? null;
  return <Text style={styles.puansizDegerText}>{metin || '—'}</Text>;
}

export default function DegerlendirmeDetay() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [deg, setDeg] = useState<Degerlendirme | null>(null);
  const [sonRaporlar, setSonRaporlar] = useState<Degerlendirme[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyukFoto, setBuyukFoto] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getDegerlendirme(id).then((d) => {
      setDeg(d);
      setLoading(false);
      // Personelin önceki son 3 rapor puanı — okunamazsa alan gösterilmez
      if (d) getOncekiRaporPuanlari(d).then(setSonRaporlar).catch(() => {});
    });
  }, [id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#4f46e5" size="large" />
      </View>
    );
  }

  if (!deg) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFound}>Değerlendirme bulunamadı.</Text>
      </View>
    );
  }

  const isMatris = deg.puanli && deg.puanGirisTipi !== 'manuel';
  // Yeni format: çoklu izlenme matrisi (webdeki aylık matris). Eski kayıtlarda cevaplar alanı kullanılır.
  const izlenmeler = deg.izlenmeler ?? [];
  const yeniFormat = isMatris && izlenmeler.length > 0;
  const sistem = deg.skorlamaSistemi ?? 'oran';
  const donem = deg.ay !== undefined && deg.yil !== undefined ? `${AYLAR[deg.ay]} ${deg.yil}` : null;

  const yuzde =
    deg.puanli && deg.toplamPuan !== null && deg.maxPuan && deg.maxPuan > 0
      ? Math.round((deg.toplamPuan / deg.maxPuan) * 100)
      : null;

  const izlenmeTarihi = deg.izlenmeTarihi?.toDate?.().toLocaleDateString('tr-TR', {
    day: 'numeric', month: 'long', year: 'numeric',
  }) ?? '—';

  const raporlamaTarihi = deg.raporlamaTarihi?.toDate?.().toLocaleDateString('tr-TR', {
    day: 'numeric', month: 'long', year: 'numeric',
  }) ?? '—';

  // Bölümleri bolumSnapshot'tan yeniden oluştur
  const bolumler = Object.entries(deg.bolumSnapshot ?? {}).map(([bolumId, snap]) => ({
    id: bolumId,
    ad: snap.ad,
    sorular: (snap.soruIdleri ?? []).map((soruId) => ({
      id: soruId,
      metin: deg.soruSnapshot?.[soruId]?.metin ?? soruId,
      puan: deg.soruSnapshot?.[soruId]?.puan ?? 0,
      tip: deg.soruSnapshot?.[soruId]?.tip ?? ('evet_hayir_muaf' as SoruTipi),
      cevap: deg.cevaplar?.[soruId] ?? null,
      puansizCevap: deg.puansizCevaplar?.[soruId] ?? null,
    })),
  }));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: deg?.formAd ?? 'Değerlendirme' }} />
      {/* Özet kart */}
      <View style={styles.ozetKart}>
        <View style={styles.ozetRow}>
          <View style={styles.ozetAvatar}>
            <Text style={styles.ozetAvatarText}>{deg.personelAd.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.ozetInfo}>
            <Text style={styles.ozetPersonel}>{deg.personelAd}</Text>
            <Text style={styles.ozetMagaza}>{deg.magazaAd || '—'}</Text>
          </View>
          {yuzde !== null && (
            <View style={[styles.puanDaire, {
              backgroundColor:
                yuzde >= 80 ? '#f0fdf4' : yuzde >= 50 ? '#fffbeb' : '#fef2f2',
            }]}>
              <Text style={[styles.puanDaireText, {
                color: yuzde >= 80 ? '#10b981' : yuzde >= 50 ? '#f59e0b' : '#ef4444',
              }]}>
                %{yuzde}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.ozetMetaBolum}>
          <View style={styles.ozetMetaItem}>
            <Text style={styles.ozetMetaLabel}>Form</Text>
            <Text style={styles.ozetMetaValue}>{deg.formAd}</Text>
          </View>
          <View style={styles.ozetMetaItem}>
            <Text style={styles.ozetMetaLabel}>{yeniFormat ? 'Dönem' : 'İzlenme'}</Text>
            <Text style={styles.ozetMetaValue}>
              {yeniFormat ? `${donem ?? '—'} · ${izlenmeler.length} izlenme` : izlenmeTarihi}
            </Text>
          </View>
          <View style={styles.ozetMetaItem}>
            <Text style={styles.ozetMetaLabel}>Rapor</Text>
            <Text style={styles.ozetMetaValue}>{raporlamaTarihi}</Text>
          </View>
          <View style={styles.ozetMetaItem}>
            <Text style={styles.ozetMetaLabel}>Tür</Text>
            <View style={[styles.turBadge, deg.puanli ? styles.turPuanli : styles.turPuansiz]}>
              <Text style={[styles.turText, deg.puanli ? styles.turPuanliText : styles.turPuansizText]}>
                {deg.puanli ? (deg.puanGirisTipi === 'manuel' ? 'Yorumlu Puanlı' : 'Puanlı') : 'Puansız'}
              </Text>
            </View>
          </View>
          {!isMatris && deg.puanli && deg.toplamPuan !== null && (
            <View style={styles.ozetMetaItem}>
              <Text style={styles.ozetMetaLabel}>Toplam Puan</Text>
              <Text style={styles.ozetMetaValue}>{deg.toplamPuan}</Text>
            </View>
          )}
        </View>

        {/* Puan çubuğu */}
        {yuzde !== null && (
          <View style={styles.puanBar}>
            <View style={[styles.puanBarFill, {
              width: `${yuzde}%`,
              backgroundColor: yuzde >= 80 ? '#10b981' : yuzde >= 50 ? '#f59e0b' : '#ef4444',
            }]} />
          </View>
        )}
      </View>

      {/* Son 3 rapor puanı (weble aynı) */}
      {sonRaporlar.length > 0 && (
        <View style={styles.sonKart}>
          <Text style={styles.sonBaslik}>SON {sonRaporlar.length} RAPOR PUANI</Text>
          {sonRaporlar.map((r) => {
            const y =
              r.toplamPuan !== null && r.maxPuan && r.maxPuan > 0
                ? Math.round((r.toplamPuan / r.maxPuan) * 100)
                : null;
            return (
              <View key={r.id} style={styles.sonSatir}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.sonTarih}>
                    {r.olusturmaTarihi?.toDate?.().toLocaleDateString('tr-TR') ?? '—'}
                  </Text>
                  <Text style={styles.sonForm} numberOfLines={1}>{r.formAd}</Text>
                </View>
                <Text style={styles.sonPuan}>{y !== null ? `%${y}` : r.toplamPuan}</Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Sorular */}
      {bolumler.map((bolum) => (
        <View key={bolum.id} style={styles.bolumKart}>
          <View style={styles.bolumHeader}>
            <Text style={styles.bolumAd}>{bolum.ad}</Text>
          </View>
          {bolum.sorular.map((soru, i) => (
            <View key={soru.id} style={[styles.soruRow, i > 0 && styles.soruRowBorder]}>
              <View style={styles.soruContent}>
                {/* Soru üstte, cevaplar altta */}
                <Text style={styles.soruMetin}>
                  <Text style={styles.soruNo}>{i + 1}. </Text>
                  {soru.metin}
                </Text>
                {isMatris && <Text style={styles.soruPuan}>{soru.puan} puan</Text>}

                <View style={styles.cevapAlan}>
                  {yeniFormat ? (
                    (() => {
                      const sonuc = soruPuanHesapla(
                        soru.id,
                        deg.soruSnapshot[soru.id],
                        izlenmeler.map((iz) => ({ cevaplar: iz.cevaplar as Record<string, CevapSecenegi> })),
                        sistem
                      );
                      return (
                        <>
                          <View style={styles.statRozetSatiri}>
                            <View style={[styles.statRozet, { backgroundColor: '#10b981' }]}>
                              <Text style={styles.statRozetText}>{sonuc.evetSayisi}E</Text>
                            </View>
                            <View style={[styles.statRozet, { backgroundColor: '#ef4444' }]}>
                              <Text style={styles.statRozetText}>{sonuc.hayirSayisi}H</Text>
                            </View>
                            <View style={[styles.statRozet, { backgroundColor: '#94a3b8' }]}>
                              <Text style={styles.statRozetText}>{sonuc.muafSayisi}M</Text>
                            </View>
                          </View>
                          {sonuc.toplamIzlenme > 0 && (
                            <Text style={[styles.statOran, { color: sonuc.gecti ? '#10b981' : '#ef4444' }]}>
                              %{sonuc.oran} · {sonuc.kazanilanPuan}/{soru.puan}P
                            </Text>
                          )}
                        </>
                      );
                    })()
                  ) : isMatris ? (
                    soru.cevap ? <CevapBadge cevap={soru.cevap} /> : (
                      <View style={styles.cevapBadge}>
                        <Text style={styles.cevapBadgeText}>—</Text>
                      </View>
                    )
                  ) : (
                    <View style={{ flex: 1 }}>
                      <PuansizDeger tip={soru.tip} cevap={soru.puansizCevap} />
                    </View>
                  )}
                </View>
                {yeniFormat && (() => {
                  const notlar = izlenmeler
                    .filter((iz) => iz.notlar?.[soru.id])
                    .map((iz) => ({ tarih: iz.tarih.toDate(), not: iz.notlar![soru.id] }));
                  if (notlar.length === 0) return null;
                  return (
                    <View style={styles.notListe}>
                      {notlar.map((n, ni) => (
                        <Text key={ni} style={styles.notSatir}>
                          📝 {n.tarih.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })}{' '}
                          {n.tarih.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} — {n.not}
                        </Text>
                      ))}
                    </View>
                  );
                })()}
                {!isMatris && (soru.puansizCevap?.fotograflar?.length ?? 0) > 0 && (
                  <View style={styles.fotoStrip}>
                    {soru.puansizCevap!.fotograflar!.map((uri) => (
                      <TouchableOpacity key={uri} onPress={() => setBuyukFoto(uri)} activeOpacity={0.8}>
                        <Image source={{ uri }} style={styles.fotoThumb} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>
      ))}

      <Modal visible={!!buyukFoto} transparent animationType="fade" onRequestClose={() => setBuyukFoto(null)}>
        <TouchableOpacity style={styles.fotoViewerOverlay} activeOpacity={1} onPress={() => setBuyukFoto(null)}>
          {buyukFoto && <Image source={{ uri: buyukFoto }} style={styles.fotoViewerImage} resizeMode="contain" />}
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' },
  notFound: { fontSize: 15, color: '#94a3b8' },
  ozetKart: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  ozetRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  ozetAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  ozetAvatarText: { fontSize: 16, fontWeight: '700', color: '#4f46e5' },
  ozetInfo: { flex: 1 },
  ozetPersonel: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  ozetMagaza: { fontSize: 13, color: '#94a3b8', marginTop: 2 },
  puanDaire: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  puanDaireText: { fontSize: 16, fontWeight: '800' },
  ozetMetaBolum: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  ozetMetaItem: { flex: 1, minWidth: '45%' },
  ozetMetaLabel: { fontSize: 11, fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 3 },
  ozetMetaValue: { fontSize: 13, color: '#334155', fontWeight: '500' },
  turBadge: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  turPuanli: { backgroundColor: '#eef2ff' },
  turPuansiz: { backgroundColor: '#f1f5f9' },
  turText: { fontSize: 12, fontWeight: '600' },
  turPuanliText: { color: '#4f46e5' },
  turPuansizText: { color: '#64748b' },
  puanBar: {
    height: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  puanBarFill: { height: '100%', borderRadius: 3 },
  bolumKart: {
    backgroundColor: '#fff',
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    overflow: 'hidden',
  },
  bolumHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  bolumAd: { fontSize: 13, fontWeight: '700', color: '#1e293b' },
  soruRow: {
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  soruRowBorder: { borderTopWidth: 1, borderTopColor: '#f8fafc' },
  soruContent: { flex: 1 },
  soruMetin: { fontSize: 13, color: '#334155', lineHeight: 19 },
  soruNo: { fontWeight: '600', color: '#94a3b8' },
  soruPuan: { fontSize: 11, color: '#4f46e5', fontWeight: '600', marginTop: 4 },
  // Cevaplar sorunun ALTINDA gösterilir (üstte soru, altta cevap düzeni)
  cevapAlan: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  cevapBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#f8fafc',
    alignSelf: 'flex-start',
  },
  cevapBadgeText: { fontSize: 12, fontWeight: '600', color: '#94a3b8' },
  puansizDegerText: {
    fontSize: 13, color: '#0f172a', fontWeight: '600',
    backgroundColor: '#f8fafc', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 7,
  },
  sonKart: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  sonBaslik: { fontSize: 10, fontWeight: '800', color: '#94a3b8', letterSpacing: 1, marginBottom: 10 },
  sonSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#f8fafc',
    gap: 10,
  },
  sonTarih: { fontSize: 13, fontWeight: '700', color: '#334155' },
  sonForm: { fontSize: 11.5, color: '#94a3b8', marginTop: 1 },
  sonPuan: { fontSize: 16, fontWeight: '800', color: '#4f46e5' },
  statRozetSatiri: { flexDirection: 'row', gap: 3 },
  statRozet: { minWidth: 26, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 3, alignItems: 'center' },
  statRozetText: { fontSize: 10, fontWeight: '800', color: '#fff' },
  statOran: { fontSize: 11, fontWeight: '800' },
  notListe: { marginTop: 8, gap: 4 },
  notSatir: {
    fontSize: 12,
    color: '#92400e',
    backgroundColor: '#fffbeb',
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  fotoStrip: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  fotoThumb: { width: 52, height: 52, borderRadius: 8, backgroundColor: '#f1f5f9' },
  fotoViewerOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.9)', alignItems: 'center', justifyContent: 'center' },
  fotoViewerImage: { width: '100%', height: '80%' },
});
