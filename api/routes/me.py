"""GET /v1/me — plan ve bu ayki kullanım."""
from __future__ import annotations

import asyncio

from fastapi import APIRouter

from api import deps, usage
from api.deps import CurrentUser
from api.schemas import BenModel
from core import repo
from core.config import settings

router = APIRouter(prefix="/v1", tags=["me"])


@router.get("/me", response_model=BenModel)
async def me(user_id: CurrentUser) -> BenModel:
    # Beş sorgu da birbirinden bağımsız — sıralı beklemek ~1,5 sn ediyordu.
    # profil_garanti upsert'i plan_durum'dan önce bitmeli, o yüzden o ayrı.
    await usage.profil_garanti(user_id)
    durum, ay_kayit, toplam, uyelik = await asyncio.gather(
        usage.plan_durum(user_id),
        usage.ay_kayit_sayisi(user_id),
        usage.toplam_kayit(user_id),
        deps.hane_uyeligi(user_id),
    )
    return BenModel(
        plan=durum.etkin,
        ham_plan=durum.ham,
        trial_bitis=durum.trial_bitis,
        ai_limit=durum.ai_limit,
        base_ai_limit=settings.BASE_AI_AYLIK,
        limit=durum.ai_limit,
        ay_kayit=ay_kayit,
        toplam_kayit=toplam,
        hane_rol=uyelik.rol if uyelik else None,
    )


@router.delete("/me")
async def hesap_sil(user_id: CurrentUser) -> dict:
    """Hesabı ve tüm kullanıcı verisini kalıcı olarak siler (KVKK / App Store)."""
    await repo.kullanici_sil(user_id)
    deps.hane_cache_temizle(user_id)
    return {"silindi": True}
