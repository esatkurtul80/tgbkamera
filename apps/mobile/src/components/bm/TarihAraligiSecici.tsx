import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform, Modal } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ARALIK_SECENEKLERI, onAyarAraligi, ozelAralik, tarihKisa, type TarihAraligi } from '@/lib/bmRapor';
import { R } from './tema';

/**
 * Bölge müdürü ekranlarının ortak tarih aralığı seçicisi: hızlı çipler (Bu Ay, Geçen Ay,
 * Son 3 Ay, Tümü) + Özel seçimde başlangıç/bitiş tarih düğmeleri (natif tarih seçici).
 */
export default function TarihAraligiSecici({
  deger, onChange,
}: {
  deger: TarihAraligi;
  onChange: (a: TarihAraligi) => void;
}) {
  const [secilen, setSecilen] = useState<'baslangic' | 'bitis' | null>(null);
  const [iosDeger, setIosDeger] = useState<Date>(new Date());

  function pickerAc(alan: 'baslangic' | 'bitis') {
    setIosDeger((alan === 'baslangic' ? deger.baslangic : deger.bitis) ?? new Date());
    setSecilen(alan);
  }

  function tarihUygula(alan: 'baslangic' | 'bitis', tarih: Date) {
    const b = alan === 'baslangic' ? tarih : deger.baslangic ?? tarih;
    const s = alan === 'bitis' ? tarih : deger.bitis ?? tarih;
    onChange(ozelAralik(b, s));
  }

  return (
    <View style={st.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.cipler}>
        {ARALIK_SECENEKLERI.map((s) => {
          const aktif = deger.tur === s.tur;
          return (
            <TouchableOpacity
              key={s.tur}
              style={[st.cip, aktif && st.cipAktif]}
              activeOpacity={0.75}
              onPress={() => onChange(onAyarAraligi(s.tur))}
            >
              <Text style={[st.cipText, aktif && st.cipTextAktif]}>{s.ad}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {deger.tur === 'ozel' && (
        <View style={st.ozelSatir}>
          <TouchableOpacity style={st.tarihBtn} activeOpacity={0.75} onPress={() => pickerAc('baslangic')}>
            <Text style={st.tarihEtiket}>Başlangıç</Text>
            <Text style={st.tarihDeger}>{tarihKisa(deger.baslangic)}</Text>
          </TouchableOpacity>
          <Text style={st.tire}>–</Text>
          <TouchableOpacity style={st.tarihBtn} activeOpacity={0.75} onPress={() => pickerAc('bitis')}>
            <Text style={st.tarihEtiket}>Bitiş</Text>
            <Text style={st.tarihDeger}>{tarihKisa(deger.bitis)}</Text>
          </TouchableOpacity>
        </View>
      )}

      {secilen && Platform.OS === 'android' && (
        <DateTimePicker
          value={iosDeger}
          mode="date"
          display="default"
          onChange={(event, selected) => {
            const alan = secilen;
            setSecilen(null);
            if (event.type === 'dismissed' || !selected) return;
            tarihUygula(alan, selected);
          }}
        />
      )}
      {secilen && Platform.OS === 'ios' && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setSecilen(null)}>
          <View style={st.overlay}>
            <View style={st.pickerKart}>
              <DateTimePicker
                value={iosDeger}
                mode="date"
                display="spinner"
                locale="tr-TR"
                onChange={(_, selected) => selected && setIosDeger(selected)}
              />
              <View style={st.pickerBtnSatir}>
                <TouchableOpacity style={st.pickerIptal} onPress={() => setSecilen(null)}>
                  <Text style={st.pickerIptalText}>İptal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={st.pickerTamam}
                  onPress={() => { tarihUygula(secilen, iosDeger); setSecilen(null); }}
                >
                  <Text style={st.pickerTamamText}>Tamam</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { gap: 8 },
  cipler: { paddingHorizontal: 18, gap: 8 },
  cip: { backgroundColor: R.kart, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8 },
  cipAktif: { backgroundColor: R.murekkep },
  cipText: { fontSize: 12.5, fontWeight: '700', color: R.gri },
  cipTextAktif: { color: '#fff' },
  ozelSatir: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18 },
  tarihBtn: { flex: 1, backgroundColor: R.kart, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 },
  tarihEtiket: { fontSize: 10, fontWeight: '700', color: R.soluk, letterSpacing: 0.5 },
  tarihDeger: { fontSize: 13.5, fontWeight: '800', color: R.murekkep, marginTop: 1 },
  tire: { color: R.soluk, fontSize: 16 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  pickerKart: { backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingBottom: 24 },
  pickerBtnSatir: { flexDirection: 'row', gap: 10, paddingHorizontal: 16 },
  pickerIptal: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 14, backgroundColor: R.griBg },
  pickerIptalText: { fontWeight: '700', color: R.gri },
  pickerTamam: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 14, backgroundColor: R.murekkep },
  pickerTamamText: { fontWeight: '800', color: '#fff' },
});
