"""/v1/tekrarlayan — her ay otomatik eklenen kayıtlar (kira, fatura, abonelik, maaş …).

İşleme cron'suz: uygulama açılınca / öne gelince POST /v1/tekrarlayan/isle çağrılır;
günü gelmiş ve henüz eklenmemiş aylar (en çok 12) eklenir. Bu kayıtlar günlük enerjiden düşmez.
"""
from __future__ import annotations

import logging
from datetime import date
from typing import Literal

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from api import usage
from api.deps import CurrentUser
from core import repo
from core.dates import today
from core.models import Candidate
from core.tekrarlayan import sonraki_tarih, vadesi_gelenler

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/v1/tekrarlayan", tags=["tekrarlayan"])

FREE_EN_COK = 3  # Free planda en çok 3 aktif tekrarlayan kayıt; Pro sınırsız
KAYNAK = "tekrarlayan"

Tip = Literal["kisisel", "isletme", "yatirim"]
Yon = Literal["gider", "gelir"]


class TekrarlayanModel(BaseModel):
    id: str
    aciklama: str
    tutar: float
    kategori: str
    tip: str
    direction: str
    gun: int
    aktif: bool
    baslangic: date
    son_eklenen: date | None = None
    sonraki: date


class TekrarlayanIstek(BaseModel):
    aciklama: str = Field(min_length=1, max_length=120)
    tutar: float = Field(gt=0)
    kategori: str = ""
    tip: Tip = "kisisel"
    direction: Yon = "gider"
    gun: int = Field(ge=1, le=31)
    baslangic: date | None = None
    # Kural, o an kaydedilen bir işlemden oluşturuluyorsa o işlemin tarihi: bu ay tekrar eklenmez.
    son_eklenen: date | None = None


class TekrarlayanGuncelle(BaseModel):
    aciklama: str | None = Field(default=None, min_length=1, max_length=120)
    tutar: float | None = Field(default=None, gt=0)
    kategori: str | None = None
    tip: Tip | None = None
    direction: Yon | None = None
    gun: int | None = Field(default=None, ge=1, le=31)
    aktif: bool | None = None

    def kolonlar(self) -> dict:
        m = {"aciklama": "description", "tutar": "amount", "kategori": "category", "tip": "type",
             "direction": "direction", "gun": "day_of_month", "aktif": "is_active"}
        return {kol: getattr(self, alan) for alan, kol in m.items() if getattr(self, alan) is not None}


class IsleYanit(BaseModel):
    eklenen: int
    aciklamalar: list[str] = Field(default_factory=list)


def _model(k: dict, bugun: date) -> TekrarlayanModel:
    return TekrarlayanModel(**k, sonraki=sonraki_tarih(k["gun"], k["baslangic"], k["son_eklenen"], bugun))


async def _sinir_kontrol(user_id: str, aktif_ekleniyor: int = 1) -> None:
    durum = await usage.plan_durum(user_id)
    if durum.pro:
        return
    aktif = [k for k in await repo.tekrar_listesi(user_id) if k["aktif"]]
    if len(aktif) + aktif_ekleniyor > FREE_EN_COK:
        raise HTTPException(
            status.HTTP_402_PAYMENT_REQUIRED,
            detail={"kod": "pro_gerekli", "mesaj": f"Free planda en çok {FREE_EN_COK} tekrarlayan kayıt olabilir."},
        )


@router.get("", response_model=list[TekrarlayanModel])
async def listele(user_id: CurrentUser) -> list[TekrarlayanModel]:
    bugun = today()
    return [_model(k, bugun) for k in await repo.tekrar_listesi(user_id)]


@router.post("", response_model=TekrarlayanModel, status_code=status.HTTP_201_CREATED)
async def olustur(user_id: CurrentUser, istek: TekrarlayanIstek) -> TekrarlayanModel:
    await _sinir_kontrol(user_id)
    bugun = today()
    k = await repo.tekrar_olustur(user_id, {
        "description": istek.aciklama.strip(), "amount": round(istek.tutar, 2),
        "category": istek.kategori, "type": istek.tip, "direction": istek.direction,
        "day_of_month": istek.gun, "start_on": (istek.baslangic or bugun).isoformat(),
        "last_added_on": istek.son_eklenen.isoformat() if istek.son_eklenen else None,
    })
    return _model(k, bugun)


@router.patch("/{kid}", response_model=TekrarlayanModel)
async def guncelle(user_id: CurrentUser, kid: str, istek: TekrarlayanGuncelle) -> TekrarlayanModel:
    kolonlar = istek.kolonlar()
    if not kolonlar:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Değişecek alan yok")
    if kolonlar.get("is_active") is True:
        mevcut = next((k for k in await repo.tekrar_listesi(user_id) if k["id"] == kid), None)
        if mevcut and not mevcut["aktif"]:
            await _sinir_kontrol(user_id)
    k = await repo.tekrar_guncelle(user_id, kid, kolonlar)
    if not k:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Bulunamadı")
    return _model(k, today())


@router.delete("/{kid}")
async def sil(user_id: CurrentUser, kid: str) -> dict:
    if not await repo.tekrar_sil(user_id, kid):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Bulunamadı")
    return {"silindi": True}


@router.post("/isle", response_model=IsleYanit)
async def isle(user_id: CurrentUser) -> IsleYanit:
    """Günü gelmiş kayıtları ekler. Her kural önce 'talep edilir' (iyimser kilit), sonra eklenir."""
    bugun = today()
    eklenen = 0
    aciklamalar: list[str] = []
    try:
        kurallar = await repo.tekrar_listesi(user_id, yalniz_aktif=True)
    except Exception:
        # Tablo henüz kurulmadıysa (scripts/schema_tekrarlayan.sql) her açılışta hata basmasın
        logger.warning("tekrarlayan kurallar okunamadı", exc_info=True)
        return IsleYanit(eklenen=0)
    for k in kurallar:
        tarihler = vadesi_gelenler(k["gun"], k["baslangic"], k["son_eklenen"], bugun)
        if not tarihler:
            continue
        if not await repo.tekrar_talep(k["id"], k["son_eklenen"], tarihler[-1]):
            continue  # başka bir istek bu kuralı az önce işledi
        adaylar = [
            Candidate(aciklama=k["aciklama"], tutar=k["tutar"], kategori=k["kategori"], tip=k["tip"],
                      direction=k["direction"], tarih=t, kaynak=KAYNAK)
            for t in tarihler
        ]
        try:
            await repo.add_many(adaylar, user_id)
        except Exception:
            # Ekleme düştüyse talebi geri al ki bir sonraki açılışta yeniden denensin
            logger.exception("tekrarlayan ekleme başarısız (%s)", k["id"])
            await repo.tekrar_talep(k["id"], tarihler[-1], k["son_eklenen"])
            continue
        eklenen += len(adaylar)
        aciklamalar.append(k["aciklama"])
    return IsleYanit(eklenen=eklenen, aciklamalar=aciklamalar)
