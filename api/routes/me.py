"""GET /v1/me — plan ve bu ayki kullanım."""
from __future__ import annotations

from fastapi import APIRouter

from api import usage
from api.deps import CurrentUser
from api.schemas import BenModel
from core.config import settings

router = APIRouter(prefix="/v1", tags=["me"])


@router.get("/me", response_model=BenModel)
async def me(user_id: CurrentUser) -> BenModel:
    await usage.profil_garanti(user_id)
    plan = await usage.plan(user_id)
    ay_kayit = await usage.ay_kayit_sayisi(user_id)
    limit = 10**9 if plan == "pro" else settings.FREE_AYLIK_LIMIT
    return BenModel(plan=plan, ay_kayit=ay_kayit, limit=limit)
