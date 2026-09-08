"""Mobil uygulama API'si — FastAPI. `core/` katmanını yeniden kullanır."""
from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import (
    budgets,
    capture,
    categories,
    hane,
    me,
    notifications,
    push,
    summary,
    transactions,
)
from core.config import settings

if settings.SENTRY_DSN:
    import sentry_sdk

    sentry_sdk.init(dsn=settings.SENTRY_DSN, traces_sample_rate=0.1, send_default_pii=False)

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s", level=logging.INFO
)

app = FastAPI(title="Harcama API", version="m1")

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


@app.get("/health", tags=["meta"])
async def health() -> dict:
    eksik = [
        ad for ad, deger in {
            "SUPABASE_URL": settings.SUPABASE_URL,
            "SUPABASE_SERVICE_KEY": settings.SUPABASE_SERVICE_KEY,
            "GROQ_API_KEY": settings.GROQ_API_KEY,
        }.items() if not deger
    ]
    return {"durum": "ok" if not eksik else "eksik_yapilandirma", "eksik": eksik}
