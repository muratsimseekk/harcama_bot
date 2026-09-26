# Harcama API (FastAPI, Faz M1)

Mobil uygulamanın backend'i. `core/` katmanını (llm, repo, review, models, dates) aynen
kullanır. Telegram botundan bağımsız çalışır; aynı Supabase `transactions` tablosunu paylaşır.

## Uç noktalar

| Metot | Yol | Açıklama |
|---|---|---|
| POST | `/v1/capture` | multipart `text` **veya** `audio` → işlem adayları + `needs_review`. **Kaydetmez.** |
| POST | `/v1/transactions` | `{candidates:[...]}` → toplu kayıt (Free planda günlük ortak "enerji" limiti — elle+AI, 402 döner) |
| GET | `/v1/transactions?limit=20` | son kayıtlar |
| PATCH | `/v1/transactions/{id}` | alan güncelle (tutar/kategori/aciklama/tip/direction/tarih) |
| DELETE | `/v1/transactions/{id}` | soft delete |
| GET | `/v1/me` | `{plan, gun_kayit, limit, gun_reklam_kredisi, ...}` |
| POST | `/v1/ads/request-token` | ödüllü reklam için kısa ömürlü istek tokeni |
| GET | `/v1/ads/ssv` | AdMob Server-Side Verification callback (Google çağırır, kullanıcı değil) |
| GET | `/health` | yapılandırma kontrolü |

Tüm `/v1/*` uç noktaları `Authorization: Bearer <supabase access_token>` ister.

## Env

| Değişken | Zorunlu | Not |
|---|---|---|
| `SUPABASE_URL` | ✓ | |
| `SUPABASE_SERVICE_KEY` | ✓ | service_role — RLS bypass |
| `GROQ_API_KEY` | ✓ | |
| `SUPABASE_ANON_KEY` | ✓* | JWT_SECRET yoksa jeton doğrulaması için gerekli |
| `SUPABASE_JWT_SECRET` | ○ | verilirse jeton yerelde HS256 ile doğrulanır (ağ çağrısı yok, hızlı) |
| `GUNLUK_ENERJI` | ○ | Free katman günlük ortak kayıt tabanı (elle+AI, reklamsız) — vars. 3, gece yarısı sıfırlanır |
| `AD_KREDI_ADET` | ○ | ödüllü reklam → +N kayıt hakkı — vars. 2. Tavan YOK, istediği kadar izleyebilir |
| `ADS_TOKEN_SECRET` | ○ | `/v1/ads/request-token` imzası (yoksa `CRON_SECRET`'a düşer) |
| `ADS_SSV_ONLY` | ○ | vars. `true` — kapatmak yalnız iç test/staging için |
| `API_CORS_ORIGINS` | ○ | vars. `*` |

## Yerel çalıştırma

```bash
# repo kökünde, .venv aktif
uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
curl -F 'text=kahve 90' -H "Authorization: Bearer <token>" localhost:8000/v1/capture
```

## Deploy (Render)

Yeni Web Service, aynı repo:
- Build: `pip install -r requirements.txt`
- Start: `uvicorn api.main:app --host 0.0.0.0 --port $PORT`
- Env: yukarıdaki tablo. Bot servisine dokunma.
