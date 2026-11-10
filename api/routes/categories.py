"""/v1/categories — düzenlenebilir kategori sistemi."""
from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, status

from api.deps import CurrentUser
from api.schemas import (
    BolumEkleIstek,
    KategoriGuncelleIstek,
    KategoriModel,
    KategoriOlusturIstek,
)
from api.routes.budgets import alt_hedef_sil
from core import repo
from core.summary import ALT_HEDEF_ON

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/v1/categories", tags=["categories"])


@router.get("", response_model=list[KategoriModel])
async def listele(user_id: CurrentUser) -> list[KategoriModel]:
    kategoriler = await repo.categories_list(user_id, only_active=False)
    if not kategoriler:
        # Yeni kullanıcı: Kişisel + 5 temel İşletme gideri. Yatırım bölümünü kullanıcı ekler.
        await repo.categories_seed(user_id, ["kisisel", "isletme"])
        kategoriler = await repo.categories_list(user_id, only_active=False)
    if not any(c.tip == "gelir" for c in kategoriler):
        # Gelir kategorileri sonradan geldi: eski ve yeni kullanıcıya ilk listelemede eklenir.
        # Yazılamazsa (migration uygulanmadı / eşzamanlı istek) kategori listesi bozulmasın.
        try:
            if await repo.category_seed_tip(user_id, "gelir"):
                kategoriler = await repo.categories_list(user_id, only_active=False)
        except Exception as e:
            logger.warning("gelir kategorileri eklenemedi: %s", e)
    return [KategoriModel.from_cat(c) for c in kategoriler]


@router.post("/bolum")
async def bolum_ekle(user_id: CurrentUser, istek: BolumEkleIstek) -> dict:
    """Bir bölümün (İşletme / Yatırım) varsayılan kategorilerini ekler."""
    eklendi = await repo.category_seed_tip(user_id, istek.tip)
    return {"eklendi": eklendi}


@router.post("", response_model=KategoriModel, status_code=status.HTTP_201_CREATED)
async def olustur(user_id: CurrentUser, istek: KategoriOlusturIstek) -> KategoriModel:
    try:
        cat = await repo.category_create(
            user_id, istek.name, istek.tip, istek.color, istek.keywords
        )
    except Exception as e:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "Bu bölümde bu isimde bir kategori zaten var"
        ) from e
    return KategoriModel.from_cat(cat)


async def _sahiplik(cat_id: str, user_id: str):
    cat = await repo.category_get(cat_id)
    if not cat or cat.user_id != user_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Kategori bulunamadı")
    return cat


@router.patch("/{cat_id}", response_model=KategoriModel)
async def guncelle(
    user_id: CurrentUser, cat_id: str, istek: KategoriGuncelleIstek
) -> KategoriModel:
    eski = await _sahiplik(cat_id, user_id)
    kolonlar = istek.kolonlar()
    if not kolonlar:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Değişecek alan yok")
    guncel = await repo.category_update(cat_id, kolonlar)
    if not guncel:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Kategori bulunamadı")
    # Yatırım alt hedefi kategori adına bağlı: ad değişince hedef taşınsın, kategori
    # başka bölüme geçince hedef silinsin (genel hedef de senkronlanır).
    try:
        if eski.tip == "yatirim" and guncel.tip != "yatirim":
            await alt_hedef_sil(user_id, eski.name)
        elif eski.tip == "yatirim" and guncel.name != eski.name:
            await repo.goal_rename(user_id, ALT_HEDEF_ON + eski.name, ALT_HEDEF_ON + guncel.name)
    except Exception as e:
        logger.warning("alt hedef güncellenemedi: %s", e)
    return KategoriModel.from_cat(guncel)


@router.delete("/{cat_id}")
async def sil(user_id: CurrentUser, cat_id: str) -> dict:
    cat = await _sahiplik(cat_id, user_id)
    await repo.category_delete(cat_id)
    if cat.tip == "yatirim":
        try:
            await alt_hedef_sil(user_id, cat.name)
        except Exception as e:
            logger.warning("alt hedef silinemedi: %s", e)
    return {"silindi": True}
