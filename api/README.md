# Harcama API (FastAPI, Faz M1)

Mobil uygulamanın backend'i. `core/` katmanını (llm, repo, review, models, dates) aynen
kullanır. Telegram botundan bağımsız çalışır; aynı Supabase `transactions` tablosunu paylaşır.

## Uç noktalar

| Metot | Yol | Açıklama |
|---|---|---|
| POST | `/v1/capture` | multipart `text` **veya** `audio` → işlem adayları + `needs_review`. **Kaydetmez.** |
| POST | `/v1/transactions` | `{candidates:[...]}` → toplu kayıt (free planda aylık limit) |
| GET | `/v1/transactions?limit=20` | son kayıtlar |
| PATCH | `/v1/transactions/{id}` | alan güncelle (tutar/kategori/aciklama/tip/direction/tarih) |
| DELETE | `/v1/transactions/{id}` | soft delete |
| GET | `/v1/me` | `{plan, ay_kayit, limit}` |
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
| `FREE_AYLIK_LIMIT` | ○ | vars. 50 |
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
