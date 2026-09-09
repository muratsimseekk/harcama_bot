"""/v1/rc/webhook — RevenueCat abonelik olayları → profiles.plan senkronu.

Ödeme akışı: mobil (react-native-purchases) → Apple/Google → RevenueCat →
bu webhook → profiles.plan + plan_bitis güncellenir. Uygulama /v1/me'den okur.
"""
from __future__ import annotations

import logging
from datetime import UTC, datetime

from fastapi import APIRouter, Header, HTTPException, Request, status

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
    """Önce entitlement_ids (RC'nin verdiği en güvenilir sinyal), sonra product_id eşlemesi."""
    ents = olay.get("entitlement_ids") or []
    if not ents and olay.get("entitlement_id"):
        ents = [olay["entitlement_id"]]
    if "pro" in ents:
        return "pro"
    if "base" in ents:
        return "base"
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
        await repo.profil_plan_guncelle(user_id, "base", None)
        logger.info("rc webhook: %s → base (%s)", user_id, tur)

    # CANCELLATION / BILLING_ISSUE / vb. → süre dolana kadar aktif kalır, dokunma.
    return {"ok": True}
