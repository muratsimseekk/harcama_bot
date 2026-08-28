# Harcama — Mobil (Expo, Faz M1)

Yakalama MVP: ses/yazı → yapay zeka → akıllı onay → kaydet → geçmiş (düzelt/sil).

## Kurulum

```bash
cd mobile
npm install
npx expo install --fix        # SDK ile sürümleri hizala
cp .env.example .env           # değerleri doldur
```

`.env`:
- `EXPO_PUBLIC_API_URL` — FastAPI adresi. Yerelde: Mac'in LAN IP'si + `:8000`
  (`ipconfig getifaddr en0`). Telefon **aynı Wi-Fi'de** olmalı.
- `EXPO_PUBLIC_SUPABASE_URL` — `https://mwuuicgxxruoesutbicv.supabase.co`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` — Supabase → Project Settings → API → anon/public key

## Çalıştırma

1. API'yi başlat (repo kökünde): `uvicorn api.main:app --host 0.0.0.0 --port 8000`
2. `npx expo start` → Expo Go ile QR kodu okut
3. E-posta gir → gelen 6 haneli kod → giriş

> Supabase panelinde **Authentication → Email Templates → Magic Link** şablonunu
> `{{ .Token }}` içerecek şekilde düzenle (yoksa mail'de kod yerine link gelir).

## Yapı

```
app/
  _layout.tsx          oturum guard + sağlayıcılar
  (auth)/login.tsx     e-posta → OTP
  (auth)/verify.tsx    kod doğrula
  (app)/index.tsx      YAKALAMA (bas-konuş mikrofon + metin)
  (app)/history.tsx    son kayıtlar, satıra dokun → düzelt/sil
  confirm.tsx          onay ekranı (modal) — adayları düzenle, Onayla
lib/
  api.ts    FastAPI istemcisi (access_token ekler)
  supabase.ts / auth.tsx   Supabase Auth + oturum
  queries.ts   react-query kancaları
```

## Notlar
- Ses kaydı `expo-av` ile (Expo Go uyumlu). `.m4a` olarak `/v1/capture`'a yüklenir.
- Gerçek App Store / Play satın alması bu fazda yok — `profiles.plan` + aylık limit var.
