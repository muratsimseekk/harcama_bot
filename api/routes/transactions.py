"""/v1/transactions — kaydet (toplu), listele, düzelt, sil."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, status

from api import usage
from api.deps import CurrentUser
from api.schemas import IslemGuncelleIstek, IslemModel, IslemOlusturIstek
from core import repo
from core.config import settings

router = APIRouter(prefix="/v1/transactions", tags=["transactions"])


@router.post("", response_model=list[IslemModel], status_code=status.HTTP_201_CREATED)
async def olustur(user_id: CurrentUser, istek: IslemOlusturIstek) -> list[IslemModel]:
    plan = await usage.plan(user_id)
    if plan == "free":
        mevcut = await usage.ay_kayit_sayisi(user_id)
        if mevcut + len(istek.candidates) > settings.FREE_AYLIK_LIMIT:
            raise HTTPException(
                status.HTTP_402_PAYMENT_REQUIRED,
                f"Aylık ücretsiz kayıt limitine ulaştın ({settings.FREE_AYLIK_LIMIT}). "
                "Pro'ya geçerek sınırsız kayıt yapabilirsin.",
            )

    adaylar = [m.to_candidate("mobile") for m in istek.candidates]
    txs = await repo.add_many(adaylar, user_id)
    return [IslemModel.from_tx(t) for t in txs]


@router.get("", response_model=list[IslemModel])
async def listele(
    user_id: CurrentUser, limit: int = Query(default=20, ge=1, le=100)
) -> list[IslemModel]:
    txs = await repo.list_recent(user_id, limit)
    return [IslemModel.from_tx(t) for t in txs]


async def _sahiplik(tx_id: str, user_id: str):
    tx = await repo.get(tx_id)
    if not tx or tx.user_id != user_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Kayıt bulunamadı")
    return tx


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
