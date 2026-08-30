"""Supabase erişim jetonu doğrulama.

Jeton yerelde imza doğrulaması ile çözülür (kullanıcı başına ağ çağrısı yok):
- `ES256` / `RS256` (Supabase asimetrik "JWT signing keys" — yeni varsayılan):
  açık anahtarlar `/{auth}/.well-known/jwks.json` üzerinden alınır (saatlik önbellek).
- `HS256` (eski paylaşımlı sır): `SUPABASE_JWT_SECRET` ile doğrulanır.
`SUPABASE_JWT_SECRET` hiç yoksa Supabase `/auth/v1/user` uç noktasına sorulur.
"""
from __future__ import annotations

import ssl
import time

import certifi
import httpx
import jwt
from fastapi import Header, HTTPException, status
from jwt import PyJWKClient

from core.config import settings

_cache: dict[str, tuple[float, str]] = {}  # token -> (expiry_ts, user_id)
_CACHE_TTL = 60.0

_jwks_client: PyJWKClient | None = None


def _jwks() -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        url = settings.SUPABASE_URL.rstrip("/") + "/auth/v1/.well-known/jwks.json"
        _jwks_client = PyJWKClient(
            url,
            cache_keys=True,
            lifespan=3600,
            ssl_context=ssl.create_default_context(cafile=certifi.where()),
        )
    return _jwks_client


def _bearer(authorization: str | None) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Yetkilendirme başlığı yok"
        )
    return authorization.split(" ", 1)[1].strip()


def _verify_local(token: str) -> str:
    try:
        alg = jwt.get_unverified_header(token).get("alg", "")
        if alg == "HS256":
            if not settings.SUPABASE_JWT_SECRET:
                raise jwt.InvalidTokenError("HS256 jetonu ama SUPABASE_JWT_SECRET yok")
            veri = jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated",
            )
        else:
            anahtar = _jwks().get_signing_key_from_jwt(token).key
            veri = jwt.decode(
                token,
                anahtar,
                algorithms=["ES256", "RS256"],
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
    """FastAPI bağımlılığı — doğrulanmış kullanıcı id'sini (auth UUID) döndürür.

    Dev/yönetici modu: `DEV_BYPASS_USER_ID` ayarlıysa ve istek Authorization
    başlığı taşımıyorsa, o id ile devam edilir (kimlik doğrulama atlanır).
    """
    if settings.DEV_BYPASS_USER_ID and not authorization:
        return settings.DEV_BYPASS_USER_ID

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
