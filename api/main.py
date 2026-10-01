"""Mobil uygulama API'si — FastAPI. `core/` katmanını yeniden kullanır."""
from __future__ import annotations

import logging

import sentry_sdk
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from api.routes import (
    budgets,
    capture,
    categories,
    hane,
    me,
    notifications,
    push,
    reklam,
    sayfalar,
    summary,
    transactions,
    uyelik,
)
from core.config import settings

if settings.SENTRY_DSN:
    sentry_sdk.init(dsn=settings.SENTRY_DSN, traces_sample_rate=0.1, send_default_pii=False)

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s", level=logging.INFO
)

logger = logging.getLogger("api")

app = FastAPI(title="Harcama API", version="m1")


# Kullanıcıya asla ham teknik/İngilizce hata gitmez. Yakalanmamış her istisna: traceback
# log'a (Render), ayrıntı Sentry'ye; istemciye yalnız Türkçe genel mesaj. Mobil 5xx'te
# zaten kendi metnini gösterir (mobile/lib/hata.ts) — bu gövde diğer istemciler için.
@app.exception_handler(Exception)
async def beklenmeyen_hata(istek: Request, hata: Exception) -> JSONResponse:
    logger.exception("beklenmeyen hata: %s %s", istek.method, istek.url.path)
    if settings.SENTRY_DSN:
        sentry_sdk.capture_exception(hata)
    return JSONResponse(
        status_code=500,
        content={"detail": "Şu an isteğini tamamlayamadık. Lütfen biraz sonra tekrar dene."},
    )


@app.exception_handler(RequestValidationError)
async def dogrulama_hatasi(istek: Request, hata: RequestValidationError) -> JSONResponse:
    # Pydantic'in İngilizce alan hatalarını log'a yaz, istemciye Türkçe özet dön.
    logger.warning("doğrulama hatası: %s %s %s", istek.method, istek.url.path, hata.errors())
    return JSONResponse(
        status_code=422,
        content={"detail": "Gönderilen bilgiler eksik ya da hatalı."},
    )

_origins = [o.strip() for o in settings.API_CORS_ORIGINS.split(",") if o.strip()] or ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(capture.router)
app.include_router(transactions.router)
app.include_router(categories.router)
app.include_router(summary.router)
app.include_router(budgets.router)
app.include_router(notifications.router)
app.include_router(push.router)
app.include_router(me.router)
app.include_router(hane.router)
app.include_router(uyelik.router)
app.include_router(reklam.router)
app.include_router(sayfalar.router)


@app.get("/health", tags=["meta"])
async def health() -> dict:
    eksik = [
        ad for ad, deger in {
            "SUPABASE_URL": settings.SUPABASE_URL,
            "SUPABASE_SERVICE_KEY": settings.SUPABASE_SERVICE_KEY,
            "GROQ_API_KEY": settings.GROQ_API_KEY,
        }.items() if not deger
    ]
    return {
        "durum": "ok" if not eksik else "eksik_yapilandirma",
        "eksik": eksik,
        "sentry": bool(settings.SENTRY_DSN),  # değer değil, yalnız ayarlı mı
    }
