"""Üyelik katmanları (Deneme → Base → Pro) ve aylık AI kullanım sayacı."""
from __future__ import annotations

import asyncio
from dataclasses import dataclass
from datetime import datetime

from core.config import settings
from core.dates import now
from core.repo import _db

# "AI kaydı" sayılan kaynaklar — Base aylık tavanı bunları sayar, elle girişi saymaz.
AI_KAYNAKLARI = ["mobile_text", "mobile_voice", "telegram_text", "telegram_voice"]
_SINIRSIZ = 10**9


@dataclass
class PlanDurum:
    ham: str                      # DB değeri: free | trial | base | pro
    etkin: str                    # geçerli davranış: base | pro
    trial_bitis: datetime | None
    ai_limit: int                 # aylık AI kayıt tavanı (pro/trial → çok büyük)

    @property
    def pro(self) -> bool:
        return self.etkin == "pro"


def _dev_user(user_id: str) -> bool:
    return bool(settings.DEV_BYPASS_USER_ID) and user_id == settings.DEV_BYPASS_USER_ID


def _ay_basi_iso() -> str:
    return now().replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()


def _profil_oku(user_id: str) -> dict:
    res = (
        _db().table("profiles").select("plan,trial_bitis,plan_bitis")
        .eq("id", user_id).limit(1).execute()
    )
    return res.data[0] if res.data else {"plan": "base"}


def _tarih(raw) -> datetime | None:
    if not raw:
        return None
    try:
        return datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
    except ValueError:
        return None


def _profil_garanti(user_id: str) -> None:
    """profiles satırı yoksa oluşturur (trigger'ı kaçırmış eski kullanıcılar için)."""
    _db().table("profiles").upsert(
        {"id": user_id}, on_conflict="id", ignore_duplicates=True
    ).execute()


def _ay_ai_sayisi(user_id: str) -> int:
    res = (
        _db().table("transactions")
        .select("id", count="exact")
        .eq("user_id", user_id)
        .in_("source", AI_KAYNAKLARI)
        .is_("deleted_at", "null")
        .gte("created_at", _ay_basi_iso())
        .execute()
    )
    return res.count or 0


def _toplam_kayit(user_id: str) -> int:
    res = (
        _db().table("transactions")
        .select("id", count="exact")
        .eq("user_id", user_id)
        .is_("deleted_at", "null")
        .execute()
    )
    return res.count or 0


def _coz(profil: dict) -> PlanDurum:
    ham = profil.get("plan") or "base"
    tb = _tarih(profil.get("trial_bitis"))
    pb = _tarih(profil.get("plan_bitis"))

    # Ücretli plan süresi dolmuşsa Base'e düş.
    if ham in ("base", "pro") and pb is not None and pb <= now():
        return PlanDurum(ham, "base", tb, settings.BASE_AI_AYLIK)

    if ham == "pro":
        return PlanDurum(ham, "pro", tb, _SINIRSIZ)
    if ham == "trial":
        aktif = tb is not None and tb > now()
        return PlanDurum(ham, "pro" if aktif else "base", tb,
                         _SINIRSIZ if aktif else settings.BASE_AI_AYLIK)
    # base / free (legacy) / bilinmeyen
    return PlanDurum(ham, "base", tb, settings.BASE_AI_AYLIK)


async def plan_durum(user_id: str) -> PlanDurum:
    if _dev_user(user_id):
        return PlanDurum("pro", "pro", None, _SINIRSIZ)
    try:
        profil = await asyncio.to_thread(_profil_oku, user_id)
    except Exception:
        return PlanDurum("base", "base", None, settings.BASE_AI_AYLIK)
    return _coz(profil)


async def plan(user_id: str) -> str:
    """Geriye dönük: etkin planı ('base' | 'pro') döndürür."""
    return (await plan_durum(user_id)).etkin


async def profil_garanti(user_id: str) -> None:
    if _dev_user(user_id):
        return
    try:
        await asyncio.to_thread(_profil_garanti, user_id)
    except Exception:
        pass


async def ay_kayit_sayisi(user_id: str) -> int:
    """Bu ayki AI kaydı sayısı (Base tavanı bununla karşılaştırılır)."""
    try:
        return await asyncio.to_thread(_ay_ai_sayisi, user_id)
    except Exception:
        return 0


async def toplam_kayit(user_id: str) -> int:
    try:
        return await asyncio.to_thread(_toplam_kayit, user_id)
    except Exception:
        return 0
