"""GET /v1/me — plan ve bu ayki kullanım."""
from __future__ import annotations

from fastapi import APIRouter

from api import deps, usage
from api.deps import CurrentUser
from api.schemas import BenModel

router = APIRouter(prefix="/v1", tags=["me"])


@router.get("/me", response_model=BenModel)
async def me(user_id: CurrentUser) -> BenModel:
    await usage.profil_garanti(user_id)
    durum = await usage.plan_durum(user_id)
    ay_kayit = await usage.ay_kayit_sayisi(user_id)
    toplam = await usage.toplam_kayit(user_id)
    uyelik = await deps.hane_uyeligi(user_id)
    return BenModel(
        plan=durum.etkin,
        ham_plan=durum.ham,
        trial_bitis=durum.trial_bitis,
        ai_limit=durum.ai_limit,
        limit=durum.ai_limit,
        ay_kayit=ay_kayit,
        toplam_kayit=toplam,
        hane_rol=uyelik.rol if uyelik else None,
    )
