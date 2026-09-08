# DEVAM — Harcama Uygulaması (mobil + API) Kaldığımız Yer & Yol Haritası

> **Bu dosya ne için:** Başka bir bilgisayardan devam etmek için tek kaynak. Yeni makinede
> repoyu `clone` et, `faz-m1-mobil` dalına geç, bu dosyayı Claude'a ver:
> _"`docs/DEVAM.md` dosyasını oku, kaldığımız yerden devam edelim."_
>
> `~/.claude/` altındaki hafıza ve plan dosyaları makineye özeldir, taşınmaz — bu dosya
> onların yerine geçer. Güncel tutulmalı: her önemli adımdan sonra Claude bunu günceller.

Son güncelleme: 2026-09-06 · Dal: `faz-m1-mobil` · Son commit: `bbf0029`

> **2026-09-06 — Geliştirme makinesi değişti: MacBook → Windows 11 PC.** Ortam bu PC'ye
> yeniden kuruldu (bkz §1.1). Python 3.11.9 + Node 24.19 (LTS) + eas-cli 23.2 kurulu,
> `.venv` ve `mobile/node_modules` hazır. Doğrulama bu makinede geçti:
> `pytest` 70/70 · `tsc --noEmit` temiz · `expo-doctor` 18/18. `requirements.txt`'e
> `tzdata` eklendi (Windows'ta zoneinfo için şart). `.env` + `mobile/.env` dolduruldu ve
> doğrulandı: `/health` → `ok`, `/v1/summary` gerçek Supabase verisi, Groq
> `parse_transactions` çalışıyor. `CRON_SECRET` üretildi. Boş kalan opsiyoneller:
> `SUPABASE_JWT_SECRET`, `SENTRY_DSN`.
>
> **2026-09-06 — §5 adım 1 TAMAM: API Render'da canlı.**
> `https://harcama-api.onrender.com` (servis `harcama-api`, `srv-daeh4gn40ujc73f79nhg`,
> blueprint `render.yaml`, dal `faz-m1-mobil`, free plan). `.env` yeni Groq key ile
> güncellendi. Doğrulama: `/health` → `{"durum":"ok","eksik":[]}` · `/docs` 200 ·
> `/v1/summary` token'sız → 401 (prod auth zorunlu) · pytest 70/70 · Supabase 502 kayıt.
>
> **2026-09-06 — §5 adım 2 TAMAM: EAS env `mobile/eas.json`'a gömüldü** (preview+production:
> `EXPO_PUBLIC_API_URL` = Render, `SUPABASE_URL`, `SUPABASE_ANON_KEY`). tsc temiz.
>
> **2026-09-06 — §5 adım 3 TAMAM: ilk Android preview APK hazır.**
> `https://expo.dev/artifacts/eas/m57uGwSxZIxBHZKGOxiTSPqkJy80QLpNZf01bO8RGx0.apk`
> (build `0ed0825f`). Auth: `EXPO_TOKEN` (expo.dev access token). Sentry config plugin
> `app.json`'dan çıkarıldı (`SentryUpload` gradle task'ı authToken'sız build'i düşürüyordu —
> adım 6'da geri eklenecek).
>
> **2026-09-06 — Android emülatör kuruldu + uygulama yönetici modunda çalışıyor (bkz §9).**
> Emülatörde Ana Sayfa gerçek Supabase verisiyle açılıyor (aylık 3.965 ₺, 6 işlem, pasta
> grafik, son işlemler). **Bug bulundu + düzeltildi (`cd41a36`):** `DEV_NOAUTH=1` iken uygulama
> `(auth)/giris` ekranında takılıyordu (`_layout` yönlendirmesi erken return + expo-router
> kökü ilk Stack.Screen `(auth)`'a bağlıyor). Kayıt/giriş akışı henüz TEST EDİLMEDİ (kullanıcı
> isteği: en sona). **Sıradaki: emülatörde ekranları gez (analiz, hedefler, işlem ekle/düzenle,
> AI ekleme), sonra adım 6-7 (Sentry, GitHub cron), en son auth akışı.**

---

## 0. Bir bakışta durum

| | |
|---|---|
| **Ne yapıyoruz** | Telegram harcama botunun mantığını, satılabilir bir **mobil uygulamaya** (Expo/React Native) + **FastAPI backend**'e taşıyoruz. App Store + Play Store, abonelikli. |
| **Telegram botu** | `main` dalında, Render'da canlı, **DONDURULDU**. Bu projeyle karışmıyor. Asla `main`'e merge etme. |
| **Bu proje** | `faz-m1-mobil` dalı. Backend (`core/` + `api/`) + mobil (`mobile/`) burada. GitHub'a push edildi. |
| **Deploy durumu** | API **Render'da canlı**: `https://harcama-api.onrender.com` (`/health` ok). **İlk Android preview APK hazır** (build `0ed0825f`). |
| **Şu an hangi fazdayız** | **Faz 0** (yayına hazır teknik temel). Kod bitti; hesap/deploy adımları sürüyor. |
| **Sıradaki somut adım** | APK'yı telefona kur → e-posta/şifre auth + işlem ekleme testi → Sentry (§4 adım 6) + GitHub cron (adım 7). |
| **Testler** | Windows: `$env:PYTHONPATH="."; .venv\Scripts\python -m pytest -q` → 70 geçiyor · `cd mobile; npx tsc --noEmit` temiz · `npx expo-doctor` 18/18 |

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

### 1.1 Windows 11 kurulumu (bu makinenin gerçek adımları — 2026-09-06)

Bu PC'de yapıldı. Kabuk: PowerShell (veya Git Bash).

```powershell
# Araçlar (winget) — Python 3.11 + Node LTS
winget install --id Python.Python.3.11 -e --scope user
winget install --id OpenJS.NodeJS.LTS -e            # Node 24.19 kuruldu; Node 20+ yeterli
npm install -g eas-cli

# Backend
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements-dev.txt   # requirements.txt + pytest/ruff

# Mobil
cd mobile; npm install; cd ..
```

**Windows tuzakları:**
- **`tzdata` şart.** Windows'ta IANA saat dilimi verisi yok → `core/dates.py`'deki
  `ZoneInfo("Europe/Istanbul")` patlar (`ZoneInfoNotFoundError`). `requirements.txt`'e
  eklendi; venv'de kuruluysa sorun yok.
- **`py -3.11` launcher** winget `--scope user` ile gelmeyebilir; `.venv\Scripts\python`
  doğrudan çalışır. Bare `python` Microsoft Store stub'ına gidebilir — venv'i kullan.
- **`@sentry/cli` postinstall** npm 11'in allow-scripts korumasıyla çalışmadı. Yerel
  geliştirme/tsc/doctor için gerekmez; EAS build'de sourcemap yüklemesi lazımsa
  `cd mobile; npx sentry-cli --version` ilk çağrıda binary'i indirir, ya da
  `npm approve-scripts @sentry/cli`.
- **Sunucuları çalıştırma (PowerShell):**
  ```powershell
  # API — .env'i yükle, uvicorn'u başlat
  Get-Content .env | Where-Object { $_ -match '=' -and $_ -notmatch '^\s*#' } | ForEach-Object { $k,$v = $_ -split '=',2; [Environment]::SetEnvironmentVariable($k.Trim(), $v.Trim()) }
  .venv\Scripts\uvicorn api.main:app --host 0.0.0.0 --port 8000
  # Metro (ayrı pencere)
  cd mobile; npx expo start --lan --port 8083 --clear
  ```
  Doğrula: `curl http://localhost:8000/health` → `{"durum":"ok"}`
- **Bu PC'nin LAN IP'si:** Wi-Fi `192.168.1.18` (aktif), Ethernet `192.168.1.100`.
  `mobile/.env` → `EXPO_PUBLIC_API_URL=http://192.168.1.18:8000`. IP değişirse
  PowerShell'de `Get-NetIPAddress -AddressFamily IPv4` ile bak, `mobile/.env`'i güncelle.

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
3. ✅ **API Render'da canlı** — `https://harcama-api.onrender.com` (blueprint `render.yaml`,
   servis `harcama-api`, dal `faz-m1-mobil`, free plan). `sync: false` env'ler dashboard'dan
   girildi (yeni Groq key dahil). `/health` → `{"durum":"ok","eksik":[]}`.
   ⚠️ Free plan: 15 dk trafiksizlikte uyur, ilk istek ~30-50 sn (cold start).
4. ✅ EAS env değişkenleri — `mobile/eas.json`'un `preview` + `production` env bloklarına
   gömüldü: `EXPO_PUBLIC_API_URL=https://harcama-api.onrender.com`,
   `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` (anon = public, RLS koruyor).
   `EXPO_PUBLIC_SENTRY_DSN` boş — DSN gelince eklenir. tsc temiz, JSON geçerli.
5. ⬜ İlk build: `cd mobile && eas build -p android --profile preview` → APK telefona →
   e-posta/şifre kayıt + giriş çalışıyor mu?
6. ⬜ Sentry: 2 proje (React Native + Python) → DSN'ler → `mobile/.env` + Render env.
   **Not:** `@sentry/react-native` config plugin `app.json`'dan ÇIKARILDI (commit `3360105`) —
   `SentryUpload` gradle task'ı `SENTRY_AUTH_TOKEN` olmadan EAS build'i düşürüyordu.
   Bu adımda geri ekle: `["@sentry/react-native/expo", { "organization": "...", "project": "...",
   "url": "https://sentry.io/" }]` + EAS secret `SENTRY_AUTH_TOKEN` (`eas env:create --scope project
   --visibility secret`). JS init/wrap zaten `EXPO_PUBLIC_SENTRY_DSN` guard'lı.
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

1. ✅ API Render'da canlı — `https://harcama-api.onrender.com` (`/health` ok).
2. ✅ EAS env — `mobile/eas.json` preview+production bloklarına gömüldü.
3. ✅ **İlk Android preview build BAŞARILI** — build `0ed0825f-c5e4-44ee-8202-895fcde32315`,
   APK: `https://expo.dev/artifacts/eas/m57uGwSxZIxBHZKGOxiTSPqkJy80QLpNZf01bO8RGx0.apk`
   `EXPO_TOKEN` ile auth (expo.dev access token, `setx` ile kalıcı + bu session'da inline).
   İlk deneme (`e3ac4a33`) Sentry `SentryUpload` task'ında patladı → plugin çıkarıldı (`3360105`).
   Keystore EAS'te bulutta üretildi (`Build Credentials dDTQpsTwEm`).
4. ✅ **Android emülatör kuruldu** (§9) — uygulama yönetici modunda emülatörde çalışıyor,
   Ana Sayfa gerçek veriyle açılıyor. Yönlendirme bug'ı düzeltildi (`cd41a36`).
   ⬜ KALAN: emülatörde diğer ekranları test et (analiz, hedefler, işlem form, AI ekleme,
   bildirimler, ara, kategoriler, ayarlar). Auth akışı EN SONA.
5. Sonra Sentry (6), GitHub secrets + cron (7), Firebase/push (8) — paralel.

Kısır döngü kırıldığında: "Faz 0 doğrulandı" → doğrulama listesini geç → **Faz 0.5** planı.

---

## 6. Kapsam dışı (kullanıcı istemedi)
Banka SMS okuma · işletme/KDV modu.

## 7. Referanslar
- **Canlı API:** `https://harcama-api.onrender.com` · Render servis `srv-daeh4gn40ujc73f79nhg`
  (dashboard: https://dashboard.render.com/web/srv-daeh4gn40ujc73f79nhg)
- **Android preview APK:** https://expo.dev/artifacts/eas/m57uGwSxZIxBHZKGOxiTSPqkJy80QLpNZf01bO8RGx0.apk
  (build sayfası: https://expo.dev/accounts/muratsimseekk/projects/harcama-mobil/builds/0ed0825f-c5e4-44ee-8202-895fcde32315)
- **EAS auth:** `EXPO_TOKEN` (expo.dev → Settings → Access Tokens). `setx` ile kalıcı;
  yeni shell'de `eas whoami` → `muratsimseekk`.
- **Faz 0 kurulum runbook** (işaretlenebilir checklist): https://claude.ai/code/artifact/90ed60eb-46ab-4d93-8f59-76c1bd7bfc17
- **QA test planı** (14 bölüm): https://claude.ai/code/artifact/fedceb4c-2264-4ad0-85f6-8407e88a081f
- GitHub: https://github.com/muratsimseekk/harcama_bot/tree/faz-m1-mobil
- Supabase proje: `mwuuicgxxruoesutbicv` · EAS proje: `@muratsimseekk/harcama-mobil` (`b2e4ce51-3042-4535-9644-89f867234215`)

## 8. Üyelik / fiyatlandırma — 3 katman

**Kod tarafı hazır** (`api/usage.py` `plan_durum`, `scripts/schema_uyelik.sql`).
Gerçek ödeme (RevenueCat + mağaza + `plan_bitis`) = Faz 0.5.

| Katman | Süre/Fiyat | Kapsam |
|---|---|---|
| **Deneme (trial)** | Yeni kullanıcı, 7 gün otomatik | Tam Pro deneyimi: sınırsız AI + hane + hepsi |
| **Base** | Aylık ~X TL (Faz 0.5'te belirlenecek) | Aylık **100 AI kaydı** (env `BASE_AI_AYLIK`), elle giriş sınırsız, temel özet/analiz/bütçe. Hane YOK. |
| **Pro** | ~2× Base (~149 TL/ay öneri, 999 TL/yıl) | Sınırsız AI · **hane paylaşımı** · (ileride: fiş okuma, YZ öngörüleri, gelişmiş raporlar, export, tekrarlayan/taksit, çoklu hedef+borç, kişi-bazı hane kırılımı, bağımsız hane bütçesi — bkz `docs/HANE-PRO.md`) |

Deneme bitip ödeme yoksa kullanıcı Base limitleriyle devam eder (kilitlenmez), Pro'ya davet edilir.
Mağaza kesintisi: 200 TL abonelikte −%20 KDV −%15 mağaza = eline ~141 TL; gelir vergisi
sonrası ~110–141 TL. Başa baş ~12–18 Pro abone (Bağ-Kur hariç).

---

## 9. Android emülatör (bu Windows PC — 2026-09-06 kuruldu)

Fiziksel Android telefon yok → emülatörde test. Kurulum tamamlandı, kalıcı.

**Kurulu bileşenler:**
- JDK 17: `C:\Program Files\Microsoft\jdk-17.0.20.101-hotspot` (`JAVA_HOME` yazıldı)
- Android SDK: `%LOCALAPPDATA%\Android\Sdk` (`ANDROID_HOME` + `ANDROID_SDK_ROOT` yazıldı,
  PATH'e `platform-tools;emulator;cmdline-tools\latest\bin` eklendi)
  — cmdline-tools + platform-tools + emulator + `platforms;android-34` + `system-images;android-34;google_apis;x86_64`
- **Donanım hızlandırma: AEHD 2.2** (Android Emulator Hypervisor Driver) — WHPX/Hyper-V
  GEREKMEDİ, yeniden başlatma yok. `emulator -accel-check` → `accel:0 ... usable`.
  Sürücü: `sc query aehd` → RUNNING.
- AVD: **`harcama_pixel`** (Pixel 6, API 34, 3 GB RAM, hw keyboard açık)
- Expo Go SDK 54 APK: emülatöre kuruldu (`host.exp.exponent`), kaynak
  `github.com/expo/expo-go-releases` `Expo-Go-54.0.8`

**Çalıştırma (PowerShell / Git Bash — yeni shell'de env'ler hazır):**
```bash
# 1) Emülatör (GUI pencere açılır)
emulator -avd harcama_pixel -no-snapshot-save -gpu auto &
adb wait-for-device

# 2) Yerel API (yönetici modu — DEV_BYPASS_USER_ID .env'de dolu olmalı)
cd C:/Users/murat/Desktop/harcama_bot-faz-m1-mobil
export PYTHONPATH=.
set -a && source <(grep -E '^[A-Z_]+=' .env) && set +a
.venv/Scripts/python.exe -m uvicorn api.main:app --host 0.0.0.0 --port 8000 &

# 3) Metro (offline — Expo hesabı gerekmez)
cd mobile && npx expo start --port 8081 --offline &

# 4) Bağla + uygulamayı aç
adb reverse tcp:8081 tcp:8081 && adb reverse tcp:8000 tcp:8000
adb shell am start -a android.intent.action.VIEW -d "exp://127.0.0.1:8081" host.exp.exponent
```
- `mobile/.env` → `EXPO_PUBLIC_API_URL=http://10.0.2.2:8000` (emülatör→host loopback),
  `EXPO_PUBLIC_DEV_NOAUTH=1`. Fiziksel telefona dönerken LAN IP'ye çevir.
- Ekran görüntüsü: `adb exec-out screencap -p > shot.png` · dokunma: `adb shell input tap X Y`
- Push bildirimleri Expo Go'da çalışmaz (SDK 53+ kaldırdı) — dev build gerekir; test için sorun değil.
- Metro'yu `CI=1` ile başlatma → "Input is required" hatası verir; `--offline` kullan.
