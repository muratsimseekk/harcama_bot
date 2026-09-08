"""/v1/hane — aile / paylaşımlı hane."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from api import usage
from api.deps import CurrentUser, hane_cache_temizle
from api.schemas import (
    HaneAdIstek,
    HaneKatilIstek,
    HaneModel,
    HaneOlusturIstek,
    HaneRolIstek,
    HaneUyeModel,
)
from core import repo
from core.models import HaneUyelik

router = APIRouter(prefix="/v1/hane", tags=["hane"])


async def _model(uyelik: HaneUyelik, user_id: str) -> HaneModel:
    uyeler = await repo.hane_uyeleri(uyelik.household_id)
    return HaneModel(
        ad=uyelik.ad,
        kod=uyelik.kod,
        rol=uyelik.rol,
        owner=uyelik.owner_id == user_id,
        uyeler=[
            HaneUyeModel(user_id=u.user_id, ad=u.ad, rol=u.rol, ben=u.user_id == user_id)
            for u in uyeler
        ],
    )


async def _owner_uyelik(user_id: str) -> HaneUyelik:
    uyelik = await repo.hane_uyeligi(user_id)
    if uyelik is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Bir hanede değilsin.")
    if uyelik.rol != "owner":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Bu işlem için hane kurucusu olmalısın.")
    return uyelik


@router.get("", response_model=HaneModel | None)
async def getir(user_id: CurrentUser) -> HaneModel | None:
    uyelik = await repo.hane_uyeligi(user_id)
    return await _model(uyelik, user_id) if uyelik else None


@router.post("", response_model=HaneModel, status_code=status.HTTP_201_CREATED)
async def olustur(user_id: CurrentUser, istek: HaneOlusturIstek) -> HaneModel:
    if not (await usage.plan_durum(user_id)).pro:
        raise HTTPException(
            status.HTTP_402_PAYMENT_REQUIRED,
            "Hane oluşturmak Pro üyelik gerektirir. (Bir haneye katılmak ücretsiz.)",
        )
    if await repo.hane_uyeligi(user_id) is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Zaten bir hanedesin.")
    await repo.hane_olustur(user_id, istek.ad, istek.uye_adi)
    hane_cache_temizle(user_id)
    return await _model(await repo.hane_uyeligi(user_id), user_id)


@router.post("/katil", response_model=HaneModel)
async def katil(user_id: CurrentUser, istek: HaneKatilIstek) -> HaneModel:
    if await repo.hane_uyeligi(user_id) is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Zaten bir hanedesin.")
    hane = await repo.hane_kod_ile_bul(istek.kod)
    if hane is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Kod bulunamadı.")
    try:
        await repo.hane_katil(user_id, hane.id, istek.uye_adi)
    except Exception as e:
        raise HTTPException(status.HTTP_409_CONFLICT, "Zaten bir hanedesin.") from e
    hane_cache_temizle(user_id)
    return await _model(await repo.hane_uyeligi(user_id), user_id)


@router.patch("", response_model=HaneModel)
async def ad_guncelle(user_id: CurrentUser, istek: HaneAdIstek) -> HaneModel:
    uyelik = await _owner_uyelik(user_id)
    await repo.hane_ad_guncelle(uyelik.household_id, istek.ad)
    hane_cache_temizle(user_id)
    return await _model(await repo.hane_uyeligi(user_id), user_id)


@router.post("/kod")
async def kod_yenile(user_id: CurrentUser) -> dict:
    uyelik = await _owner_uyelik(user_id)
    kod = await repo.hane_kod_yenile(uyelik.household_id)
    hane_cache_temizle(*await repo.hane_uye_idleri(uyelik.household_id))
    return {"kod": kod}


@router.patch("/uye/{hedef_uid}")
async def uye_rol(user_id: CurrentUser, hedef_uid: str, istek: HaneRolIstek) -> dict:
    uyelik = await _owner_uyelik(user_id)
    if hedef_uid == user_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Kendi rolünü değiştiremezsin.")
    if istek.rol == "owner":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Owner rolü devredilemez.")
    await repo.hane_uye_rol(uyelik.household_id, hedef_uid, istek.rol)
    hane_cache_temizle(hedef_uid)
    return {"ok": True}


@router.delete("/uye/{hedef_uid}")
async def uye_cikar(user_id: CurrentUser, hedef_uid: str) -> dict:
    uyelik = await repo.hane_uyeligi(user_id)
    if uyelik is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Bir hanede değilsin.")
    if hedef_uid == user_id:
        if uyelik.owner_id == user_id:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST, "Kurucu ayrılamaz — haneyi silmelisin."
            )
        await repo.hane_uye_cikar(uyelik.household_id, user_id)
    else:
        if uyelik.rol != "owner":
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Üye çıkarmak için kurucu olmalısın.")
        if hedef_uid == uyelik.owner_id:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Kurucu çıkarılamaz.")
        await repo.hane_uye_cikar(uyelik.household_id, hedef_uid)
    hane_cache_temizle(user_id, hedef_uid)
    return {"ok": True}


@router.delete("")
async def sil(user_id: CurrentUser) -> dict:
    uyelik = await _owner_uyelik(user_id)
    uyeler = await repo.hane_uye_idleri(uyelik.household_id)
    await repo.hane_sil(uyelik.household_id)
    hane_cache_temizle(*uyeler)
    return {"ok": True}
