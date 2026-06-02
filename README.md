# TGB Kamera Monorepo

Bu proje Turborepo kullanarak organize edilmiş bir monorepo yapısıdır.

## Yapı

```
.
├── apps/          # Uygulamalar (web apps, CLI tools, vb.)
├── packages/      # Paylaşılan paketler (libraries, utilities, vb.)
├── turbo.json     # Turborepo konfigürasyonu
└── package.json   # Root package.json
```

## Mevcut Komutlar

- `npm run dev` - Tüm paketleri development modunda çalıştır
- `npm run build` - Tüm paketleri build et
- `npm run lint` - Linting kontrolü yap
- `npm run type-check` - Type checking yap
- `npm run test` - Test'leri çalıştır
- `npm run clean` - Turbo cache'i temizle

## Yeni Workspace Eklemek

### Uygulama Eklemek (apps içine)
```bash
mkdir apps/my-app
cd apps/my-app
npm init -y
```

### Paket Eklemek (packages içine)
```bash
mkdir packages/my-package
cd packages/my-package
npm init -y
```

Her package.json'a ihtiyaç duydunuz scripitleri ekleyin (build, dev, lint, test, vb.)
