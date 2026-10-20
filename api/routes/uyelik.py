"""/v1/rc/webhook + /v1/rc/sync — RevenueCat abonelik durumu → profiles.plan senkronu.

Ödeme akışı: mobil (react-native-purchases) → Apple/Google → RevenueCat →
bu webhook → profiles.plan + plan_bitis güncellenir. Uygulama /v1/me'den okur.
"""
from __future__ import annotations

import asyncio
import logging
from datetime import UTC, datetime
from urllib.parse import quote

import httpx
from fastapi import APIRouter, Header, HTTPException, Request, status

from api import usage
from api.deps import CurrentUser
from core import repo
from core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/v1/rc", tags=["uyelik"])

# product_id → plan
_URUN_PLAN: dict[str, str] = {}
for _c in settings.RC_URUN_PLAN.split(","):
    if ":" in _c:
        _u, _p = _c.split(":", 1)
        _URUN_PLAN[_u.strip()] = _p.strip()

_AKTIF = {"INITIAL_PURCHASE", "RENEWAL", "PRODUCT_CHANGE", "UNCANCELLATION", "NON_RENEWING_PURCHASE"}
_BITEN = {"EXPIRATION"}


def _plan_coz(olay: dict) -> str:
    """Önce entitlement_ids (RC'nin verdiği en güvenilir sinyal), sonra product_id eşlemesi.

    Yalnız Pro satın alınabilir (Free reklamla kazanılır, RC'de ürünü/entitlement'ı yok)."""
    ents = olay.get("entitlement_ids") or []
    if not ents and olay.get("entitlement_id"):
        ents = [olay["entitlement_id"]]
    if "pro" in ents:
        return "pro"
    return _URUN_PLAN.get(olay.get("product_id", ""), "pro")  # bilinmeyen → pro varsay


@router.post("/webhook")
async def webhook(istek: Request, authorization: str = Header(default="")) -> dict:
    gizli = settings.RC_WEBHOOK_SECRET
    if gizli:
        # RevenueCat başlık değeri "Bearer <x>" veya sadece "<x>" olabilir
        gelen = authorization.removeprefix("Bearer ").strip()
        if gelen != gizli:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "yetkisiz")

    govde = await istek.json()
    olay = govde.get("event", {}) if isinstance(govde, dict) else {}
    tur = olay.get("type", "")
    user_id = olay.get("app_user_id") or olay.get("original_app_user_id")
    if not user_id:
        logger.warning("rc webhook: app_user_id yok, tür=%s", tur)
        return {"ok": True}

    if tur in _AKTIF:
        plan = _plan_coz(olay)
        bitis_ms = olay.get("expiration_at_ms")
        plan_bitis = None
        if bitis_ms:
            plan_bitis = datetime.fromtimestamp(int(bitis_ms) / 1000, tz=UTC).isoformat()
        await repo.profil_plan_guncelle(user_id, plan, plan_bitis)
        logger.info("rc webhook: %s → %s (%s), bitiş=%s", user_id, plan, tur, plan_bitis)

    elif tur in _BITEN:
        await repo.profil_plan_guncelle(user_id, "free", None)
        logger.info("rc webhook: %s → free (%s)", user_id, tur)

    # CANCELLATION / BILLING_ISSUE / vb. → süre dolana kadar aktif kalır, dokunma.
    return {"ok": True}


def _rc_abone_oku(user_id: str) -> dict:
    r = httpx.get(
        f"https://api.revenuecat.com/v1/subscribers/{quote(user_id, safe='')}",
        headers={"Authorization": f"Bearer {settings.RC_SECRET_API_KEY}"},
        timeout=10,
    )
    r.raise_for_status()
    return r.json().get("subscriber", {})


def _pro_bitis(abone: dict) -> tuple[bool, str | None]:
    """RC abonesinde `pro` entitlement'ı aktif mi; aktifse bitiş (ISO, ömür boyu → None)."""
    ent = (abone.get("entitlements") or {}).get("pro")
    if not ent:
        return False, None
    bitis = ent.get("expires_date")
    if bitis is None:
        return True, None
    bitis_dt = datetime.fromisoformat(bitis.replace("Z", "+00:00"))
    # Ödeme sorununda RC'nin tanıdığı ek süre (grace period) de aktif sayılır.
    ek = ent.get("grace_period_expires_date")
    if ek:
        bitis_dt = max(bitis_dt, datetime.fromisoformat(ek.replace("Z", "+00:00")))
    return bitis_dt > datetime.now(UTC), bitis_dt.isoformat()


@router.post("/sync")
async def sync(user_id: CurrentUser) -> dict:
    """Satın alma / geri yükleme sonrası uygulama çağırır: RC'ye doğrudan sorar, Pro
    aktifse profili hemen günceller. Yalnız yükseltir — süre bitişini webhook ve
    plan_bitis kontrolü (api/usage.py) zaten yönetiyor."""
    if not settings.RC_SECRET_API_KEY:
        return {"plan": await usage.plan(user_id), "senkron": False}
    try:
        abone = await asyncio.to_thread(_rc_abone_oku, user_id)
    except Exception as e:
        logger.warning("rc sync: RC okunamadı (%s): %s", user_id, e)
        return {"plan": await usage.plan(user_id), "senkron": False}
    aktif, bitis = _pro_bitis(abone)
    if aktif:
        await repo.profil_plan_guncelle(user_id, "pro", bitis)
        logger.info("rc sync: %s → pro, bitiş=%s", user_id, bitis)
    return {"plan": await usage.plan(user_id), "senkron": True}
