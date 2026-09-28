"""GET /v1/me — plan ve bugünkü kullanım."""
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
    durum, gun_kayit, toplam, uyelik, gun_reklam = await asyncio.gather(
        usage.plan_durum(user_id),
        usage.gun_kayit_sayisi(user_id),
        usage.toplam_kayit(user_id),
        deps.hane_uyeligi(user_id),
        usage.gun_ad_kredisi(user_id),
    )
    return BenModel(
        plan=durum.etkin,
        ham_plan=durum.ham,
        gunluk_limit=durum.gunluk_limit,
        gunluk_enerji=settings.GUNLUK_ENERJI,
        limit=durum.gunluk_limit,
        gun_kayit=gun_kayit,
        gun_reklam_kredisi=gun_reklam,
        reklam_kredi_adet=settings.AD_KREDI_ADET,
        toplam_kayit=toplam,
        hane_rol=uyelik.rol if uyelik else None,
    )


@router.delete("/me")
async def hesap_sil(user_id: CurrentUser) -> dict:
    """Hesabı ve tüm kullanıcı verisini kalıcı olarak siler (KVKK / App Store)."""
    await repo.kullanici_sil(user_id)
    deps.hane_cache_temizle(user_id)
    return {"silindi": True}
