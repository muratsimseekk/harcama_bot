"""Supabase erişim jetonu doğrulama.

İki yol:
- `SUPABASE_JWT_SECRET` tanımlıysa jeton yerelde HS256 ile doğrulanır (ağ çağrısı yok).
- Değilse Supabase `/auth/v1/user` uç noktasına sorulur (kısa süreli önbellekli).
"""
from __future__ import annotations

import time

import httpx
import jwt
from fastapi import Header, HTTPException, status

from core.config import settings

_cache: dict[str, tuple[float, str]] = {}  # token -> (expiry_ts, user_id)
_CACHE_TTL = 60.0


def _bearer(authorization: str | None) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Yetkilendirme başlığı yok"
        )
    return authorization.split(" ", 1)[1].strip()


def _verify_local(token: str) -> str:
    try:
        veri = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
        )
    except jwt.PyJWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Geçersiz jeton: {e}"
        ) from e
    uid = veri.get("sub")
    if not uid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Jetonda sub yok")
    return uid


def _verify_remote(token: str) -> str:
    url = settings.SUPABASE_URL.rstrip("/") + "/auth/v1/user"
    try:
        r = httpx.get(
            url,
            headers={"Authorization": f"Bearer {token}", "apikey": settings.SUPABASE_ANON_KEY},
            timeout=10.0,
        )
    except httpx.HTTPError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Kimlik sunucusuna ulaşılamadı"
        ) from e
    if r.status_code != 200:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Geçersiz oturum")
    uid = r.json().get("id")
    if not uid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Kullanıcı bulunamadı")
    return uid


async def current_user(authorization: str | None = Header(default=None)) -> str:
    """FastAPI bağımlılığı — doğrulanmış kullanıcı id'sini (auth UUID) döndürür."""
    token = _bearer(authorization)

    hit = _cache.get(token)
    if hit and hit[0] > time.time():
        return hit[1]

    if settings.SUPABASE_JWT_SECRET:
        uid = _verify_local(token)
    else:
        uid = _verify_remote(token)

    _cache[token] = (time.time() + _CACHE_TTL, uid)
    return uid
