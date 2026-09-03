# DEVAM — Harcama Uygulaması (mobil + API) Kaldığımız Yer & Yol Haritası

> **Bu dosya ne için:** Başka bir bilgisayardan devam etmek için tek kaynak. Yeni makinede
> repoyu `clone` et, `faz-m1-mobil` dalına geç, bu dosyayı Claude'a ver:
> _"`docs/DEVAM.md` dosyasını oku, kaldığımız yerden devam edelim."_
>
> `~/.claude/` altındaki hafıza ve plan dosyaları makineye özeldir, taşınmaz — bu dosya
> onların yerine geçer. Güncel tutulmalı: her önemli adımdan sonra Claude bunu günceller.

Son güncelleme: 2026-09-03 · Dal: `faz-m1-mobil` · Son commit: `e0d72e9`

---

## 0. Bir bakışta durum

| | |
|---|---|
| **Ne yapıyoruz** | Telegram harcama botunun mantığını, satılabilir bir **mobil uygulamaya** (Expo/React Native) + **FastAPI backend**'e taşıyoruz. App Store + Play Store, abonelikli. |
| **Telegram botu** | `main` dalında, Render'da canlı, **DONDURULDU**. Bu projeyle karışmıyor. Asla `main`'e merge etme. |
| **Bu proje** | `faz-m1-mobil` dalı. Backend (`core/` + `api/`) + mobil (`mobile/`) burada. GitHub'a push edildi. |
| **Deploy durumu** | API **henüz Render'a deploy edilmedi** (sadece yerelde çalışıyor). Mobil **henüz build alınmadı** (EAS projesi bağlandı ama build yok). |
| **Şu an hangi fazdayız** | **Faz 0** (yayına hazır teknik temel). Kod bitti; hesap/deploy adımları sürüyor. |
| **Sıradaki somut adım** | API'yi Render'a deploy et → EAS env değişkenleri → ilk Android build. (Bkz. §5) |
| **Testler** | `PYTHONPATH=. .venv/bin/pytest -q` → 70 geçiyor · `cd mobile && npx tsc --noEmit` temiz · `npx expo-doctor` 18/18 |

---

## 1. Yeni bilgisayarda kurulum

```bash
git clone https://github.com/muratsimseekk/harcama_bot.git
cd harcama_bot
git checkout faz-m1-mobil

# --- Python (backend) ---
python3.11 -m venv .venv            # Python 3.11 şart
.venv/bin/pip install -r requirements.txt

# --- Node (mobil) ---
cd mobile && npm install && cd ..
npm install -g eas-cli             # EAS CLI (paket adı eas-cli, "eas" değil)
```

### Ortam değişkenleri

İki dosya oluştur (ikisi de `.gitignore`'da, repoda yok):

**`.env`** (repo kökü — backend). Şablon: yok, aşağıdaki anahtarları doldur.
Değerleri **eski makinenin `.env`'inden** ya da şu kaynaklardan al:

| Anahtar | Nereden |
|---|---|
| `SUPABASE_URL` | `https://mwuuicgxxruoesutbicv.supabase.co` (sabit) |
| `SUPABASE_SERVICE_KEY` | Supabase → Project Settings → API → `service_role` key |
| `SUPABASE_ANON_KEY` | Supabase → Project Settings → API → `anon` key |
| `SUPABASE_JWT_SECRET` | Supabase → Project Settings → API → JWT Secret (opsiyonel; hızlı doğrulama) |
| `GROQ_API_KEY` | console.groq.com |
| `DEV_BYPASS_USER_ID` | yerelde test için `8756827826` (Telegram id — 495 içe aktarılan kayıt bu id'de); **prod'da BOŞ** |
| `CRON_SECRET` | `openssl rand -hex 32` (Render + GitHub secret ile aynı olmalı) |
| `FREE_AYLIK_LIMIT` | `50` |
| `SENTRY_DSN` | Sentry API projesi DSN'i (opsiyonel) |

**`mobile/.env`** — şablonu var: `cp mobile/.env.example mobile/.env`, sonra doldur:

| Anahtar | Değer |
|---|---|
| `EXPO_PUBLIC_API_URL` | yerelde: `http://<mac-lan-ip>:8000` (`ipconfig getifaddr en0`); telefon aynı Wi-Fi'de |
| `EXPO_PUBLIC_SUPABASE_URL` | `https://mwuuicgxxruoesutbicv.supabase.co` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `EXPO_PUBLIC_DEV_NOAUTH` | `1` = giriş ekranını atla (yönetici modu, gerçek veriyle test). `0` = e-posta/şifre zorunlu. |
| `EXPO_PUBLIC_SENTRY_DSN` | Sentry mobil projesi DSN'i (opsiyonel) |

### Sunucuları çalıştırma (yerel geliştirme)

Harness plain background process'leri öldürür → **detached** çalıştır:

```bash
# API
set -a && . ./.env && set +a
nohup .venv/bin/uvicorn api.main:app --host 0.0.0.0 --port 8000 > /tmp/api.log 2>&1 & disown

# Metro (mobil)
cd mobile && nohup npx expo start --lan --port 8083 --clear > /tmp/metro.log 2>&1 & disown

# Doğrula
curl -s localhost:8000/health                       # {"durum":"ok"}
curl -s -o /dev/null -w '%{http_code}' "localhost:8083/node_modules/expo-router/entry.bundle?platform=ios&dev=true"   # 200
```

Expo Go'da `exp://<mac-lan-ip>:8083`. Mac IP'si değişince `mobile/.env` `EXPO_PUBLIC_API_URL`'ü güncelle.

---

## 2. Mimari & repo haritası

```
core/           Bot ve API'nin paylaştığı çekirdek (Python)
  config.py     env → Settings
  dates.py      Europe/Istanbul now(), dönem aralıkları, turkce_tutar
  models.py     Transaction, Candidate, Category, Budget, Goal (dataclass + from_row)
  repo.py       Supabase erişimi (service_role, asyncio.to_thread ile sarılı)
  llm.py        Groq: transcribe / parse_transactions / analyze_query / classify_intent
  review.py     "akıllı onay" heuristikleri
  summary.py    ozetle(txs) → Ozet · hedef_ilerleme(txs, budgets) · yatirim_ilerleme
  push.py       Expo Push API'ye gönderim
  reports.py    Telegram PNG raporu (matplotlib) — bota özel
api/            FastAPI servisi (mobil backend)
  main.py       app + CORS + Sentry init + router kayıt
  auth.py       Supabase JWT doğrulama — HS256 (secret) VEYA ES256/RS256 (JWKS)
  deps.py       CurrentUser = Depends(current_user)
  usage.py      plan (free/pro) + aylık kayıt sayacı
  routes/       capture · transactions · categories · summary · budgets · notifications · push · me
bot/            Refactor'lı Telegram botu — bu dalda var ama DEPLOY EDİLMİYOR
mobile/         Expo SDK 54 uygulaması (expo-router 6, TypeScript)
  app/          Ekranlar (dosya-tabanlı yönlendirme)
    (auth)/     onboard · giris · kayit · sifre-sifirla · sifre-yenile
    (app)/      index (Ana Sayfa) · analiz · ekle · hedefler · profil  + AltNav özel tabBar
    islem-form.tsx    elle ekle + işlem düzenle/sil (modal)
    confirm.tsx       AI adaylarını onayla
    bildirimler · ara · kategori-yonet · ayarlar/*
  components/   EkranBasligi · AltNav · Buton · Alan · IslemFormu · TarihSecici · charts · base · ...
  lib/          theme.ts (palet+font) · api.ts · queries.ts (react-query) · bildirim.ts · supabase.ts · auth.tsx · tema.tsx
scripts/        schema*.sql (Supabase SQL Editor'de elle çalıştırılır)
tests/          pytest (70)
.github/workflows/push-cron.yml   planlı push tetikleyici
```

**Veri akışı:** Mobil → HTTPS → FastAPI (`Authorization: Bearer <supabase access_token>`,
prod'da; yerelde `DEV_BYPASS_USER_ID` ile token'sız) → `core/*` → Supabase
(`transactions` tablosu, `service_role`).

**Supabase tabloları:** `transactions` · `categories` · `budgets` · `goals` · `profiles`
· `pending_transactions` (Telegram'a özel, dokunma) · `push_tokens` · `notifications_sent`.
Proje ref: `mwuuicgxxruoesutbicv`. **Supabase MCP hâlâ yanlış projeye (`ebrvuzigstotkqialdlc`)
bağlı** — bu projeye MCP ile erişilemiyor, `core/repo.py` veya `service_role` ile REST üzerinden erişiliyor.

---

## 3. Alınmış kararlar & tuzaklar (bunları bilmeden dokunma)

- **Dal ayrımı:** `main` = Telegram botu (donmuş). `faz-m1-mobil` = bu ürün. Merge yok.
- **Auth:** e-posta + şifre (Supabase `signInWithPassword`/`signUp`). OTP kaldırıldı.
  Yeni Supabase projesi jetonları **ES256** ile imzalıyor → `api/auth.py` JWKS ile
  doğruluyor (`$SUPABASE_URL/auth/v1/.well-known/jwks.json`, `certifi` ssl context şart).
  HS256 fallback duruyor. `SUPABASE_JWT_SECRET` set ise yerel, değilse `/auth/v1/user` ağ çağrısı.
- **DEV_NOAUTH:** `mobile/app/_layout.tsx` → `EXPO_PUBLIC_DEV_NOAUTH !== "0"` → yani boş/1 =
  yönetici modu (giriş atlanır). Prod EAS profilinde `= "0"` (eas.json'da ayarlı).
- **Tema:** FinWise yeşilden → Anthropic/Claude sıcak paletine geçildi. `lib/theme.ts` tek
  kaynak. Token `green→aksan`, `greenSoft→aksanSoft`, `onGreen→aksanUstu`. Font: **Inter**
  (gövde, `FONT`) + **Newsreader** serif (başlık, `SERIF`). Claude'un gerçek fontları
  (Styrene/Copernicus) ticari lisanslı — Inter Anthropic'in dökümante ettiği ücretsiz muadili.
- **babel.config.js:** `react-native-worklets/plugin` **elle eklenmez** — `babel-preset-expo`
  v54 otomatik ekliyor; iki kez çalışırsa beyaz ekran.
- **datetimepicker `8.4.4`** Expo Go SDK 54 `bundledNativeModules`'te — `TarihSecici` çalışır.
- **RefreshControl:** `refreshing` prop'u react-query `isRefetching`'e bağlanmaz (spinner
  takılı kalır). `EkranBasligi` kendi state'ini tutuyor; `onRefresh` Promise döndürür.
- **budget_upsert:** PostgREST `on_conflict` ifade indeksiyle (`coalesce(kapsam_deger,'')`)
  eşleşmiyor → `core/repo.budget_upsert` elle select-then-update/insert yapar.
- **Sırlar döndürülmeli:** Groq key, Telegram token, Supabase service_role + JWT secret,
  GCP service account, Figma token — 27–28.08.2026'da sohbette paylaşıldı. Repo public;
  `.env`'ler gitignore'da, geçmiş temiz. Mağazaya çıkmadan önce yenile:
  Groq console · @BotFather `/revoke` · Supabase "Reset service_role key" · GCP yeni key.
- **Kök `rapor.py` / `sheets_client.py` / `groq_client.py`:** Faz 1 öncesi legacy, `bot/`
  ve `core/` bunları kullanmıyor. `scripts/import_sheets.py` hâlâ `rapor.py`'den import ediyor.
  Silinebilir (düşük öncelik).
- **`core/reports.py` → `core/summary.ozetle` dedup ertelendi** — `_png_olustur` "yön
  farketmeksizin tüm tutarları topla" semantiğine bağlı, bot rapor regresyon riski.

---

## 4. YOL HARİTASI (Faz 0 → 6)

Sıra: **0 → 0.5 → 1 → 4 → 3 → 2 → 5 → 6**. Her faz kendi detaylı planıyla başlar.
Genel doğrulama her fazda: `tsc` temiz · `pytest` yeşil · `ruff` temiz · iOS+Android
bundle/build · şema değişince Supabase güvenlik taraması · Telegram botu etkilenmez.

### Faz 0 — Yayına hazır teknik temel  ← ŞU AN BURADAYIZ

**Kod BİTTİ** (commit'ler `107e8c5`, `305c8af`, `e0d72e9`):
- `mobile/eas.json` (development/preview/production profilleri), `app.json` genişletildi
  (`expo-notifications` + `@sentry/react-native` plugin, buildNumber/versionCode, projectId `b2e4ce51-…`)
- Push: `scripts/schema_push.sql` (çalıştırıldı ✓), `core/push.py`, `core/repo.py` push
  fonksiyonları, `api/routes/push.py` (`PUT/DELETE /v1/push/token`, `POST /v1/push/run` +
  `X-Cron-Secret`), `.github/workflows/push-cron.yml`, `mobile/lib/bildirim.ts`,
  `_layout.tsx` token kaydı. Tablo yoksa route `{ok:false}` döner (kırılmaz). Ölü token
  (DeviceNotRegistered) otomatik siliniyor. Uçtan uca test edildi (fake token'a kadar).
- Auth: `(auth)/sifre-yenile.tsx`, `sifre-sifirla` redirectTo deep-link, `_layout`
  `PASSWORD_RECOVERY` → `sifre-yenile` yönlendirme.
- Sentry: mobil `@sentry/react-native` (DSN varsa init + `Sentry.wrap`), `HataSiniri` →
  `captureException`; API `sentry-sdk[fastapi]` (`SENTRY_DSN` varsa).

**KULLANICI ADIMLARI** (detaylı runbook artifact — bkz §7):
1. ✅ `scripts/schema_push.sql` Supabase'de çalıştırıldı
2. ✅ Expo hesabı + `eas login` + `eas init --force` (projectId bağlandı, commit'lendi)
3. ⬜ **API'yi Render'a deploy et** — YENİ web service, branch `faz-m1-mobil`, **Python runtime (Docker DEĞİL)**,
   build `pip install -r requirements.txt`, start `uvicorn api.main:app --host 0.0.0.0 --port $PORT`.
   Env: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_ANON_KEY`, `SUPABASE_JWT_SECRET`,
   `GROQ_API_KEY`, `CRON_SECRET`, `FREE_AYLIK_LIMIT=50`, `DEV_BYPASS_USER_ID=` (boş).
   → `curl https://<url>/health` = `{"durum":"ok"}`
4. ⬜ EAS env değişkenleri (preview + production scope): `EXPO_PUBLIC_API_URL` (Render API URL),
   `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_SENTRY_DSN`
   → `eas env:create` veya expo.dev dashboard
5. ⬜ İlk build: `cd mobile && eas build -p android --profile preview` → APK telefona →
   e-posta/şifre kayıt + giriş çalışıyor mu?
6. ⬜ Sentry: 2 proje (React Native + Python) → DSN'ler → `mobile/.env` + Render env
7. ⬜ GitHub repo Secrets: `API_URL` (Render API), `CRON_SECRET` (aynı değer) → Actions'ta
   "Push bildirim cron" workflow'unu etkinleştir → "Run workflow" (butce) test et
8. ⬜ Push credentials — Android: Firebase projesi → `google-services.json` → `mobile/`'a
   koy + Claude'a söyle (`app.json`'a `android.googleServicesFile` eklenecek) → Firebase
   FCM V1 hizmet hesabı JSON → `eas credentials` ile yükle. iOS: Apple hesabıyla EAS otomatik.
9. ⬜ Supabase → Auth → Email Templates TR + "Confirm email" kararı + URL Configuration'a
   `harcama://sifre-yenile` ekle
10. ⬜ (iOS için) Apple Developer $99/yıl; Google Play $25 (APK'yı beklemez)

**Faz 0 biter:** Android APK'da e-posta/şifre girişi çalışıyor · bir bütçe %80'i geçince
telefona push · Sentry'de hata görünüyor · Telegram botu etkilenmemiş.

### Faz 0.5 — Para kazanma + mağaza
RevenueCat SDK + paywall ekranı + Pro özellik kilidi (`api/usage.py` genişletir) +
`/v1/rc/webhook` → `profiles.plan` · App Store Connect + Play Console kaydı · gizlilik
politikası sayfası · ekran görüntüleri · ilk mağaza gönderimi. `profiles` tablosuna
`rc_customer_id`, `plan_expires_at` eklenir.

### Faz 1 — Günlük kullanım döngüsü
- Ana Sayfa "kalan bütçe / kalan gün" kartı ("12 gün kaldı · günde 340 ₺")
- Bugünkü harcama özeti + akşam (20:00) hatırlatma (push-cron'a `gunluk` zaten var)
- İşlem satırında "tekrarla" → `islem-form` prefill
- Kayıt streak'i + haftalık review push
- Ana ekran widget'ı (iOS/Android — dev build şart)
- Yeni: `components/KalanButce.tsx`; `/v1/summary`'ye kalan gün eklenir

### Faz 4 — Zengin raporlar & YZ öngörüleri (Pro'nun satış argümanı, çoğu backend)
- `core/summary.py` genişlet: ay-aya kıyas (`onceki` zaten var), 6 aylık trend, en pahalı N,
  günlük ortalama, ay sonu projeksiyonu, anomali (kategori bazlı basit oran)
- `core/llm.py` → `aylik_anlati(ozet, onceki)` → YZ metin özeti
- Uygulama içinde soru sorma: `analyze_query` + `rapor_olustur` mantığı → `/v1/ask` →
  mobilde sohbet kutusu + mini grafik
- Dışa aktarma: `/v1/export?format=csv|xlsx` (`openpyxl`), mobilde `expo-sharing`; PDF server-side
- Mobil: Analiz'e "Öngörüler" kartı + trend grafiği + aylık anlatı

### Faz 3 — Fiş/fatura fotoğrafından okuma (Pro, kotalı)
- `expo-image-picker` + kamera → `core/llm.py::parse_receipt(image)` (güncel Groq vision
  modeli — anında doğrula; fallback Gemini/Claude vision veya OCR+LLM, sağlayıcı `_chat_json`
  deseninde soyut) → kalemler + toplam + tarih + KDV → `core/review` akıllı onaya bağla
- `/v1/capture` multipart `image` kolu. Görüntü işlenip atılır (gizlilik). Free ayda ~5 fiş.

### Faz 2 — Tekrarlayan & taksitli giderler + faturalar
- `recurring` tablosu (`user_id, template jsonb, gun, siklik, sonraki_calisma, aktif`) +
  `core/recurring.py` + `api/routes/recurring.py`. Cron ayın günü → onaylı otomatik ekleme
- Fatura son ödeme günü + hatırlatma push
- Taksitli alışveriş: `installments` tablosu (ana tutar, taksit sayısı, aylık, kalan) +
  "kalan taksit yükü" görünümü
- Abonelik tespiti (tekrar eden aynı tutar+açıklama)

### Faz 5 — Çoklu hedef & borç takibi
- `goals` genişlet / yeni `savings_goals`: `ad, hedef_tutar, hedef_tarih, mevcut_tutar,
  ikon, renk` — birden fazla. "Aylık ne kadar ayır" = kalan / kalan ay
- `debts` tablosu: `ad, tur (kredi|kk|kisi), toplam, kalan, faiz, aylik_odeme, sonraki_odeme`
  → ödeme planı (kartopu/çığ), sonraki ödeme push
- Mobil: Hedefler ekranı → "Hedefler + Borçlar"

### Faz 6 — Hane / paylaşımlı bütçe (en karmaşık, RLS'e dikkat)
- `households` + `household_members` (`user_id, rol: owner|editor|viewer`)
- `transactions`/`budgets`/`goals`'a opsiyonel `household_id`
- RLS: "kendi kayıtların VEYA üyesi olduğun hane kayıtları" — güvenlik taraması şart
- `household_invites` (kod/link) · Mobil: Profil → "Hane" ekranı, "kim ekledi" rozeti

---

## 5. HEMEN SIRADAKİ ADIM

1. **API'yi Render'a deploy et** (Faz 0 adım 3 — §4). URL'i bu dosyaya yaz.
2. **EAS env değişkenleri** (adım 4) — `EXPO_PUBLIC_API_URL` = Render API URL'i.
3. **`cd mobile && eas build -p android --profile preview`** → APK → telefonda auth testi.
4. Sonra Sentry (6), GitHub secrets + cron (7), Firebase/push (8) — paralel.

Kısır döngü kırıldığında: "Faz 0 doğrulandı" → doğrulama listesini geç → **Faz 0.5** planı.

---

## 6. Kapsam dışı (kullanıcı istemedi)
Banka SMS okuma · işletme/KDV modu.

## 7. Referanslar
- **Faz 0 kurulum runbook** (işaretlenebilir checklist): https://claude.ai/code/artifact/90ed60eb-46ab-4d93-8f59-76c1bd7bfc17
- **QA test planı** (14 bölüm): https://claude.ai/code/artifact/fedceb4c-2264-4ad0-85f6-8407e88a081f
- GitHub: https://github.com/muratsimseekk/harcama_bot/tree/faz-m1-mobil
- Supabase proje: `mwuuicgxxruoesutbicv` · EAS proje: `@muratsimseekk/harcama-mobil` (`b2e4ce51-3042-4535-9644-89f867234215`)

## 8. Fiyatlandırma kararı (Faz 0.5 için)
Ücretsiz: 50 YZ kayıt/ay · 1 birikim hedefi · 3 kategori limiti · temel özet.
Pro (~149 TL/ay veya ~999 TL/yıl, 7 gün deneme): sınırsız YZ · fiş okuma · YZ öngörüleri ·
gelişmiş raporlar · CSV/Excel/PDF export · tekrarlayan/taksit · çoklu hedef + borç · hane.
200 TL abonelikte: −%20 KDV −%15 mağaza = eline ~141 TL; gelir vergisi sonrası ~110–141 TL
(genç girişimci istisnasıyla üst uç). Başa baş ~12–18 abone (Bağ-Kur hariç).
