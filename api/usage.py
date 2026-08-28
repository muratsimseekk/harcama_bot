"""Abonelik planı ve aylık kullanım sayacı."""
from __future__ import annotations

import asyncio

from core.config import settings
from core.dates import now
from core.repo import _db


def _dev_user(user_id: str) -> bool:
    return bool(settings.DEV_BYPASS_USER_ID) and user_id == settings.DEV_BYPASS_USER_ID


def _ay_basi_iso() -> str:
    return now().replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()


def _plan_oku(user_id: str) -> str:
    res = _db().table("profiles").select("plan").eq("id", user_id).limit(1).execute()
    return res.data[0]["plan"] if res.data else "free"


def _profil_garanti(user_id: str) -> None:
    """profiles satırı yoksa oluşturur (trigger'ı kaçırmış eski kullanıcılar için)."""
    _db().table("profiles").upsert(
        {"id": user_id}, on_conflict="id", ignore_duplicates=True
    ).execute()


def _ay_kayit_sayisi(user_id: str) -> int:
    res = (
        _db().table("transactions")
        .select("id", count="exact")
        .eq("user_id", user_id)
        .is_("deleted_at", "null")
        .gte("created_at", _ay_basi_iso())
        .execute()
    )
    return res.count or 0


async def plan(user_id: str) -> str:
    if _dev_user(user_id):
        return "pro"
    try:
        return await asyncio.to_thread(_plan_oku, user_id)
    except Exception:
        return "free"


async def profil_garanti(user_id: str) -> None:
    if _dev_user(user_id):
        return
    try:
        await asyncio.to_thread(_profil_garanti, user_id)
    except Exception:
        pass


async def ay_kayit_sayisi(user_id: str) -> int:
    return await asyncio.to_thread(_ay_kayit_sayisi, user_id)
