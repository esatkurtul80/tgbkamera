import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Stack, useRouter } from 'expo-router';

/** Rolün erişemediği ekranlarda gösterilen engel görünümü (deep-link koruması). */
export default function ErisimYok() {
  const router = useRouter();
  return (
    <View style={st.wrap}>
      <Stack.Screen options={{ headerShown: false }} />
      <Text style={st.ikon}>🔒</Text>
      <Text style={st.baslik}>Erişim Yok</Text>
      <Text style={st.aciklama}>Bu sayfayı görüntüleme yetkiniz bulunmuyor.</Text>
      <TouchableOpacity style={st.btn} activeOpacity={0.8} onPress={() => router.replace('/(tabs)')}>
        <Text style={st.btnText}>Panele Dön</Text>
      </TouchableOpacity>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#edf2ee', padding: 30 },
  ikon: { fontSize: 44, marginBottom: 14 },
  baslik: { fontSize: 18, fontWeight: '800', color: '#15201b' },
  aciklama: { fontSize: 13.5, color: '#77857e', marginTop: 6, textAlign: 'center' },
  btn: {
    marginTop: 22, backgroundColor: '#15201b', borderRadius: 22,
    paddingHorizontal: 26, paddingVertical: 13,
  },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
});
