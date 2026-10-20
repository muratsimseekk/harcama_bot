"""GET /v1/surum — mağazadaki en son build numarası (herkese açık, giriş gerekmez).

Uygulama açılışta kendi build numarasını bununla karşılaştırır; eskiyse "Yeni güncelleme
var" penceresini gösterir. Yeni sürüm mağazada yayına girince Render'da
`ANDROID_SON_SURUM` (/ `IOS_SON_SURUM`) değeri o build numarasına çekilir — 0 = kapalı.
"""
from __future__ import annotations

from fastapi import APIRouter

from core.config import settings

router = APIRouter(prefix="/v1", tags=["surum"])


@router.get("/surum")
async def surum() -> dict:
    return {"android": settings.ANDROID_SON_SURUM, "ios": settings.IOS_SON_SURUM}
