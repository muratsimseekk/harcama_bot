"""/v1/transactions — kaydet (toplu), listele, düzelt, sil."""
from __future__ import annotations

from datetime import date

from fastapi import APIRouter, HTTPException, Query, status

from api import deps, usage
from api.deps import CurrentUser
from api.schemas import IslemGuncelleIstek, IslemModel, IslemOlusturIstek
from core import repo

router = APIRouter(prefix="/v1/transactions", tags=["transactions"])


@router.post("", response_model=list[IslemModel], status_code=status.HTTP_201_CREATED)
async def olustur(user_id: CurrentUser, istek: IslemOlusturIstek) -> list[IslemModel]:
    durum = await usage.plan_durum(user_id)
    ai_yeni = sum(1 for m in istek.candidates if m.kaynak in usage.AI_KAYNAKLARI)
    if not durum.pro and ai_yeni > 0:
        mevcut = await usage.ay_kayit_sayisi(user_id)
        if mevcut + ai_yeni > durum.ai_limit:
            raise HTTPException(
                status.HTTP_402_PAYMENT_REQUIRED,
                f"Base üyelikte aylık {durum.ai_limit} AI kaydı hakkın var. "
                "Pro'ya geçerek sınırsız sesli/yazılı kayıt yapabilirsin. "
                "(Elle işlem ekleme sınırsız.)",
            )

    adaylar = [m.to_candidate() for m in istek.candidates]
    txs = await repo.add_many(adaylar, user_id)
    return [IslemModel.from_tx(t) for t in txs]


@router.get("", response_model=list[IslemModel])
async def listele(
    user_id: CurrentUser,
    limit: int = Query(default=20, ge=1, le=500),
    bas: date | None = Query(default=None, alias="from"),
    bit: date | None = Query(default=None, alias="to"),
    tip: str | None = Query(default=None),
    direction: str | None = Query(default=None),
) -> list[IslemModel]:
    uyelik = await deps.hane_uyeligi(user_id)
    ids = [user_id] if uyelik is None else await repo.hane_uye_idleri(uyelik.household_id)

    if bas and bit:
        txs = await repo.list_period(ids, bas, bit, direction=direction, tip=tip)
        txs = list(reversed(txs))[:limit]
    else:
        txs = await repo.list_recent(ids, limit)
        if tip:
            txs = [t for t in txs if t.tip == tip]
        if direction:
            txs = [t for t in txs if t.direction == direction]

    ad_map: dict[str, str] = {}
    if uyelik is not None:
        ad_map = {u.user_id: u.ad for u in await repo.hane_uyeleri(uyelik.household_id)}
    return [
        IslemModel.from_tx(t, ekleyen=ad_map.get(t.user_id) if t.user_id != user_id else None)
        for t in txs
    ]


async def _sahiplik(tx_id: str, user_id: str):
    tx = await repo.get(tx_id)
    if not tx:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Kayıt bulunamadı")
    if tx.user_id == user_id:
        return tx
    # Hane üyesi + düzenleme yetkisi (owner/editor) → aynı hanedeki başkasının kaydını düzenleyebilir.
    uyelik = await deps.hane_uyeligi(user_id)
    if uyelik and uyelik.rol in ("owner", "editor"):
        sahip = await deps.hane_uyeligi(tx.user_id)
        if sahip and sahip.household_id == uyelik.household_id:
            return tx
    raise HTTPException(status.HTTP_404_NOT_FOUND, "Kayıt bulunamadı")


@router.patch("/{tx_id}", response_model=IslemModel)
async def guncelle(user_id: CurrentUser, tx_id: str, istek: IslemGuncelleIstek) -> IslemModel:
    await _sahiplik(tx_id, user_id)
    kolonlar = istek.kolonlar()
    if not kolonlar:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Değişecek alan yok")
    guncel = await repo.update(tx_id, kolonlar)
    if not guncel:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Kayıt bulunamadı")
    return IslemModel.from_tx(guncel)


@router.delete("/{tx_id}")
async def sil(user_id: CurrentUser, tx_id: str) -> dict:
    await _sahiplik(tx_id, user_id)
    await repo.soft_delete(tx_id)
    return {"silindi": True}
