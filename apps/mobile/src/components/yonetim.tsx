import { ReactNode, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  Switch,
  ActivityIndicator,
  ScrollView,
} from 'react-native';

/** Yönetim (CRUD) ekranlarının ortak yapı taşları — webdeki form alanlarının mobil karşılıkları. */

export function Girdi({
  etiket, deger, onChange, coklu, sayisal, zorunlu,
}: {
  etiket: string; deger: string; onChange(v: string): void;
  coklu?: boolean; sayisal?: boolean; zorunlu?: boolean;
}) {
  return (
    <View style={s.alan}>
      <Text style={s.etiket}>{etiket}{zorunlu ? ' *' : ''}</Text>
      <TextInput
        style={[s.girdi, coklu && s.girdiCoklu]}
        value={deger}
        onChangeText={onChange}
        multiline={coklu}
        keyboardType={sayisal ? 'numeric' : 'default'}
        placeholderTextColor="#94a3b8"
      />
    </View>
  );
}

export function AnahtarSatir({ etiket, deger, onChange }: { etiket: string; deger: boolean; onChange(v: boolean): void }) {
  return (
    <View style={s.anahtarSatir}>
      <Text style={s.etiket}>{etiket}</Text>
      <Switch value={deger} onValueChange={onChange} trackColor={{ true: '#a5b4fc' }} thumbColor={deger ? '#4f46e5' : '#f1f5f9'} />
    </View>
  );
}

/** Tek seçim: satıra dokununca modal liste açılır. */
export function TekSecim({
  etiket, deger, secenekler, onSelect, bosEtiket = 'Seçilmedi',
}: {
  etiket: string;
  deger?: string;
  secenekler: { id: string; ad: string }[];
  onSelect(id: string | undefined): void;
  bosEtiket?: string;
}) {
  const [acik, setAcik] = useState(false);
  const secili = secenekler.find((x) => x.id === deger);
  return (
    <View style={s.alan}>
      <Text style={s.etiket}>{etiket}</Text>
      <TouchableOpacity style={s.secici} onPress={() => setAcik(true)} activeOpacity={0.7}>
        <Text style={secili ? s.seciciDolu : s.seciciBos}>{secili?.ad ?? bosEtiket}</Text>
        <Text style={s.ok}>›</Text>
      </TouchableOpacity>
      <Modal visible={acik} transparent animationType="slide" onRequestClose={() => setAcik(false)}>
        <View style={s.modalArka}>
          <View style={s.modalSayfa}>
            <View style={s.modalBaslikSatiri}>
              <Text style={s.modalBaslik}>{etiket}</Text>
              <TouchableOpacity onPress={() => setAcik(false)}><Text style={s.kapat}>Kapat</Text></TouchableOpacity>
            </View>
            <FlatList
              data={[{ id: '__bos__', ad: bosEtiket }, ...secenekler]}
              keyExtractor={(x) => x.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={s.modalSatir}
                  onPress={() => { onSelect(item.id === '__bos__' ? undefined : item.id); setAcik(false); }}
                >
                  <Text style={[s.modalSatirText, item.id === (deger ?? '__bos__') && { color: '#4f46e5', fontWeight: '800' }]}>
                    {item.ad}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

/** Çoklu seçim + isteğe bağlı sıralama (yukarı/aşağı oklar — webdeki sürükle-bırakın karşılığı). */
export function CokluSecim({
  etiket, seciliIdler, secenekler, onChange, sirali,
}: {
  etiket: string;
  seciliIdler: string[];
  secenekler: { id: string; ad: string }[];
  onChange(idler: string[]): void;
  sirali?: boolean;
}) {
  const [acik, setAcik] = useState(false);
  const adBul = (id: string) => secenekler.find((x) => x.id === id)?.ad ?? id;

  function toggle(id: string) {
    onChange(seciliIdler.includes(id) ? seciliIdler.filter((x) => x !== id) : [...seciliIdler, id]);
  }
  function tasi(id: string, yon: -1 | 1) {
    const i = seciliIdler.indexOf(id);
    const j = i + yon;
    if (i < 0 || j < 0 || j >= seciliIdler.length) return;
    const yeni = [...seciliIdler];
    [yeni[i], yeni[j]] = [yeni[j], yeni[i]];
    onChange(yeni);
  }

  return (
    <View style={s.alan}>
      <Text style={s.etiket}>{etiket} ({seciliIdler.length})</Text>
      {seciliIdler.map((id, i) => (
        <View key={id} style={s.seciliSatir}>
          {sirali ? <Text style={s.siraNo}>{i + 1}</Text> : null}
          <Text style={s.seciliAd} numberOfLines={1}>{adBul(id)}</Text>
          {sirali ? (
            <>
              <TouchableOpacity onPress={() => tasi(id, -1)} hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}>
                <Text style={[s.tasiBtn, i === 0 && s.pasif]}>↑</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => tasi(id, 1)} hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}>
                <Text style={[s.tasiBtn, i === seciliIdler.length - 1 && s.pasif]}>↓</Text>
              </TouchableOpacity>
            </>
          ) : null}
          <TouchableOpacity onPress={() => toggle(id)} hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}>
            <Text style={s.cikarBtn}>✕</Text>
          </TouchableOpacity>
        </View>
      ))}
      <TouchableOpacity style={s.ekleBtn} onPress={() => setAcik(true)} activeOpacity={0.7}>
        <Text style={s.ekleBtnText}>+ Ekle / Düzenle</Text>
      </TouchableOpacity>

      <Modal visible={acik} transparent animationType="slide" onRequestClose={() => setAcik(false)}>
        <View style={s.modalArka}>
          <View style={s.modalSayfa}>
            <View style={s.modalBaslikSatiri}>
              <Text style={s.modalBaslik}>{etiket}</Text>
              <TouchableOpacity onPress={() => setAcik(false)}><Text style={s.kapat}>Tamam</Text></TouchableOpacity>
            </View>
            <FlatList
              data={secenekler}
              keyExtractor={(x) => x.id}
              renderItem={({ item }) => {
                const secili = seciliIdler.includes(item.id);
                return (
                  <TouchableOpacity style={s.modalSatir} onPress={() => toggle(item.id)}>
                    <Text style={[s.kutucuk, secili && s.kutucukSecili]}>{secili ? '✓' : ''}</Text>
                    <Text style={[s.modalSatirText, { flex: 1 }]} numberOfLines={2}>{item.ad}</Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

/** Alt sayfa (bottom sheet) form kabı: başlık + içerik + Kaydet/İptal. */
export function FormSayfasi({
  acik, baslik, onKapat, onKaydet, kaydediyor, children,
}: {
  acik: boolean; baslik: string; onKapat(): void; onKaydet(): void; kaydediyor?: boolean; children: ReactNode;
}) {
  return (
    <Modal visible={acik} transparent animationType="slide" onRequestClose={onKapat}>
      <View style={s.modalArka}>
        <View style={s.modalSayfa}>
          <View style={s.modalBaslikSatiri}>
            <Text style={s.modalBaslik}>{baslik}</Text>
            <TouchableOpacity onPress={onKapat}><Text style={s.kapat}>İptal</Text></TouchableOpacity>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 16 }}>
            {children}
          </ScrollView>
          <TouchableOpacity style={[s.kaydetBtn, kaydediyor && { opacity: 0.6 }]} onPress={onKaydet} disabled={kaydediyor} activeOpacity={0.85}>
            {kaydediyor ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.kaydetText}>Kaydet</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  alan: { marginBottom: 14 },
  etiket: { fontSize: 12.5, fontWeight: '700', color: '#475569', marginBottom: 6 },
  girdi: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#0f172a',
  },
  girdiCoklu: { minHeight: 80, textAlignVertical: 'top' },
  anahtarSatir: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 14, paddingVertical: 4,
  },
  secici: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 12,
  },
  seciciDolu: { fontSize: 14, color: '#0f172a', fontWeight: '600' },
  seciciBos: { fontSize: 14, color: '#94a3b8' },
  ok: { fontSize: 18, color: '#cbd5e1' },
  seciliSatir: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#eef2f6', borderRadius: 9,
    paddingHorizontal: 10, paddingVertical: 9, marginBottom: 6,
  },
  siraNo: { fontSize: 12, fontWeight: '800', color: '#c7d2fe', minWidth: 18 },
  seciliAd: { flex: 1, fontSize: 13.5, fontWeight: '600', color: '#334155' },
  tasiBtn: { fontSize: 16, color: '#4f46e5', fontWeight: '800', paddingHorizontal: 4 },
  pasif: { opacity: 0.25 },
  cikarBtn: { fontSize: 14, color: '#ef4444', fontWeight: '800', paddingHorizontal: 4 },
  ekleBtn: {
    borderWidth: 1, borderColor: '#c7d2fe', borderStyle: 'dashed', backgroundColor: '#eef2ff',
    borderRadius: 9, paddingVertical: 10, alignItems: 'center', marginTop: 2,
  },
  ekleBtnText: { fontSize: 13, fontWeight: '700', color: '#4f46e5' },
  modalArka: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  modalSayfa: {
    backgroundColor: '#f8fafc', borderTopLeftRadius: 22, borderTopRightRadius: 22,
    paddingHorizontal: 18, paddingTop: 18, paddingBottom: 20, maxHeight: '88%',
  },
  modalBaslikSatiri: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  modalBaslik: { fontSize: 17, fontWeight: '800', color: '#0f172a' },
  kapat: { fontSize: 14, fontWeight: '600', color: '#4f46e5' },
  modalSatir: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12,
    marginBottom: 6, borderWidth: 1, borderColor: '#f1f5f9',
  },
  modalSatirText: { fontSize: 14, fontWeight: '600', color: '#334155' },
  kutucuk: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: '#cbd5e1',
    textAlign: 'center', fontSize: 13, fontWeight: '900', color: '#fff', lineHeight: 20,
  },
  kutucukSecili: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
  kaydetBtn: {
    backgroundColor: '#4f46e5', borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 4,
  },
  kaydetText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
