"""Ortak FastAPI bağımlılıkları."""
from __future__ import annotations

import time
from collections import deque
from typing import Annotated

from cachetools import TTLCache
from fastapi import Depends, HTTPException, status

from api.auth import current_user
from core import repo
from core.config import settings
from core.models import HaneUyelik

CurrentUser = Annotated[str, Depends(current_user)]

# /v1/capture kişi başı kayan pencere hız limiti (tek instance için in-memory yeterli).
# Boşta kalan kullanıcılar 1 saat sonra düşer.
_capture_pencere: TTLCache = TTLCache(maxsize=20000, ttl=3600)


def capture_limiti(user_id: str) -> None:
    """Kullanıcı pencere içinde limiti aştıysa 429 fırlatır. AI parası harcanmadan önce çağrılır."""
    simdi = time.monotonic()
    dq: deque = _capture_pencere.get(user_id)
    if dq is None:
        dq = deque()
        _capture_pencere[user_id] = dq
    kesim = simdi - settings.CAPTURE_LIMIT_PENCERE
    while dq and dq[0] < kesim:
        dq.popleft()
    if len(dq) >= settings.CAPTURE_LIMIT_ISTEK:
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            "Çok fazla istek gönderdin, biraz bekle.",
            headers={"Retry-After": "60"},
        )
    dq.append(simdi)


# --------------------------------------------------------------------------- #
# Hane üyeliği — kişi başı kısa TTL cache (üyelik değişiminde ~30 sn gecikme kabul edilebilir)
# --------------------------------------------------------------------------- #
_uyelik_cache: TTLCache = TTLCache(maxsize=20000, ttl=30)
_YOK = object()


async def hane_uyeligi(user_id: str) -> HaneUyelik | None:
    v = _uyelik_cache.get(user_id, _YOK)
    if v is _YOK:
        v = await repo.hane_uyeligi(user_id)
        _uyelik_cache[user_id] = v
    return v


def hane_cache_temizle(*user_ids: str) -> None:
    """Üyelik değişiminde ilgili kullanıcıların cache'ini düşür."""
    for uid in user_ids:
        _uyelik_cache.pop(uid, None)


async def kapsam(user_id: str) -> list[str]:
    """İşlem okuma kapsamı: hanede değilse [user_id], hanedeyse tüm üye id'leri."""
    uyelik = await hane_uyeligi(user_id)
    if uyelik is None:
        return [user_id]
    return await repo.hane_uye_idleri(uyelik.household_id)
