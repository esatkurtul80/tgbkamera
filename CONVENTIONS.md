# tgbkamera — Proje Kuralları & Geliştirme Standartları

## 🔑 Firestore Belge ID Standardı

### Kural: Tüm yeni koleksiyonlar okunabilir ID kullanır

Bu projede Firestore belgelerine **asla otomatik rastgele ID** (`addDoc`) verilmez.
Her yeni `create*` fonksiyonu **`setDoc` + `generateCustomId()`** ile yazılmalıdır.

### Format

```
ISIM-XXX-DDMMYYYY
```

| Parça | Açıklama | Örnek |
|---|---|---|
| `ISIM` | Kaydın adı (ilk kelime, maks 12 karakter, Türkçe normalize) | `MARMARA` |
| `XXX` | 3 haneli rastgele alfanumerik | `AQ9` |
| `DDMMYYYY` | Kayıt oluşturma tarihi | `09062026` |

**Örnek:** `MARMARA-AQ9-09062026`, `AHMETYILMAZ-BF3-09062026`

---

### Doğru Kullanım

```typescript
// ✅ DOĞRU — setDoc + generateCustomId
import { generateCustomId } from "@/lib/idUtils";   // admin
import { generateCustomId } from "./idUtils";         // mobile

export async function createXxx(data: { ad: string; ... }): Promise<string> {
  const customId = generateCustomId(data.ad);         // veya data.metin, data.name vs.
  await setDoc(doc(db, "kolleksiyonAdi", customId), {
    ...cleanData(data),
    olusturmaTarihi: serverTimestamp(),
    guncellemeTarihi: serverTimestamp(),
  });
  return customId;
}
```

```typescript
// ❌ YANLIŞ — asla addDoc kullanma
const ref = await addDoc(collection(db, "kolleksiyonAdi"), { ... });
return ref.id;
```

---

### `nameField` Seçim Kılavuzu

| Koleksiyon tipi | ID için kullanılacak alan |
|---|---|
| İsimli kayıtlar (`ad` alanı var) | `data.ad` |
| Sorular, metinler | `data.metin` (ilk kelime otomatik alınır) |
| Değerlendirmeler | `data.personelAd` |
| Birden fazla alan varsa | En anlamlı/kısa olanı seç |

---

### İstisna: `users` Koleksiyonu

```typescript
// ⛔ users koleksiyonuna DOKUNMA — Firebase Auth UID ile eşleşmeli
// createKullanici addDoc kullanmaz, Auth'tan gelen UID belge ID'si olmalıdır
```

---

### Mevcut Utility Dosyaları

- **Admin:** [`apps/admin/src/lib/idUtils.ts`](./apps/admin/src/lib/idUtils.ts)
- **Mobile:** [`apps/mobile/src/lib/idUtils.ts`](./apps/mobile/src/lib/idUtils.ts)

Her iki dosya da aynı `generateCustomId(name: string): string` API'sini export eder.

---

## 📁 Koleksiyon Referans Haritası

Yeni bir koleksiyon başka koleksiyonlara referans veriyorsa,
ilgili `create*` ve `update*` fonksiyonlarında **her iki tarafı da güncelle.**

```
bolgeler
  └─ id ← magazalar.bolgeId
           users.bolgeId

magazalar
  └─ id ← personel.magazaIdleri[]
           degerlendirmeler.magazaId
           users.magazaId

sorular
  └─ id ← bolumler.soruIdleri[]
           degerlendirmeler.cevaplar (key)
           degerlendirmeler.soruSnapshot (key)

bolumler
  └─ id ← formlar.bolumIdleri[]
           degerlendirmeler.bolumSnapshot (key)

formlar
  └─ id ← degerlendirmeler.formId

personel
  └─ id ← degerlendirmeler.personelId
```

---

## 🗂️ Admin Paneli Sayfa Yapısı

```
apps/admin/src/app/
  ├── [koleksiyon]/
  │   ├── page.tsx          ← Liste (DataTable)
  │   ├── yeni/page.tsx     ← Oluşturma formu
  │   └── [id]/page.tsx     ← Detay / düzenleme
  ├── degerlendirmeler/     ← Silme + düzenleme modal ile
  └── layout.tsx
```

---

## 🧩 Stack

- **Admin:** Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Mobile:** React Native (Expo), TypeScript
- **Backend:** Firebase Firestore, Firebase Auth
- **Monorepo:** Turborepo
