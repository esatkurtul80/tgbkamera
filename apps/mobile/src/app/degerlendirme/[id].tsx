import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { getDegerlendirme } from '@/lib/firestore';
import type { Degerlendirme } from '@/lib/types';

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

export default function DegerlendirmeDetay() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [deg, setDeg] = useState<Degerlendirme | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    getDegerlendirme(id).then((d) => {
      setDeg(d);
      setLoading(false);
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
      cevap: deg.cevaplar?.[soruId] ?? null,
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
            <Text style={styles.ozetMetaLabel}>İzlenme</Text>
            <Text style={styles.ozetMetaValue}>{izlenmeTarihi}</Text>
          </View>
          <View style={styles.ozetMetaItem}>
            <Text style={styles.ozetMetaLabel}>Rapor</Text>
            <Text style={styles.ozetMetaValue}>{raporlamaTarihi}</Text>
          </View>
          <View style={styles.ozetMetaItem}>
            <Text style={styles.ozetMetaLabel}>Tür</Text>
            <View style={[styles.turBadge, deg.puanli ? styles.turPuanli : styles.turPuansiz]}>
              <Text style={[styles.turText, deg.puanli ? styles.turPuanliText : styles.turPuansizText]}>
                {deg.puanli ? 'Puanlı' : 'Puansız'}
              </Text>
            </View>
          </View>
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

      {/* Sorular */}
      {bolumler.map((bolum) => (
        <View key={bolum.id} style={styles.bolumKart}>
          <View style={styles.bolumHeader}>
            <Text style={styles.bolumAd}>{bolum.ad}</Text>
          </View>
          {bolum.sorular.map((soru, i) => (
            <View key={soru.id} style={[styles.soruRow, i > 0 && styles.soruRowBorder]}>
              <View style={styles.soruSol}>
                <Text style={styles.soruMetin}>
                  <Text style={styles.soruNo}>{i + 1}. </Text>
                  {soru.metin}
                </Text>
                {deg.puanli && (
                  <Text style={styles.soruPuan}>{soru.puan} puan</Text>
                )}
              </View>
              {soru.cevap ? <CevapBadge cevap={soru.cevap} /> : (
                <View style={styles.cevapBadge}>
                  <Text style={styles.cevapBadgeText}>—</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      ))}
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  soruRowBorder: { borderTopWidth: 1, borderTopColor: '#f8fafc' },
  soruSol: { flex: 1, marginRight: 12 },
  soruMetin: { fontSize: 13, color: '#334155', lineHeight: 19 },
  soruNo: { fontWeight: '600', color: '#94a3b8' },
  soruPuan: { fontSize: 11, color: '#4f46e5', fontWeight: '600', marginTop: 4 },
  cevapBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#f8fafc',
  },
  cevapBadgeText: { fontSize: 12, fontWeight: '600', color: '#94a3b8' },
});
