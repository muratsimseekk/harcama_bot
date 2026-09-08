"""/v1/categories — düzenlenebilir kategori sistemi."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from api.deps import CurrentUser
from api.schemas import (
    BolumEkleIstek,
    KategoriGuncelleIstek,
    KategoriModel,
    KategoriOlusturIstek,
)
from core import repo

router = APIRouter(prefix="/v1/categories", tags=["categories"])


@router.get("", response_model=list[KategoriModel])
async def listele(user_id: CurrentUser) -> list[KategoriModel]:
    kategoriler = await repo.categories_list(user_id, only_active=False)
    if not kategoriler:
        # Yeni kullanıcı: yalnız Kişisel bölümü. İşletme/Yatırım'ı kullanıcı ekler.
        await repo.categories_seed(user_id, ["kisisel"])
        kategoriler = await repo.categories_list(user_id, only_active=False)
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
    await _sahiplik(cat_id, user_id)
    kolonlar = istek.kolonlar()
    if not kolonlar:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Değişecek alan yok")
    guncel = await repo.category_update(cat_id, kolonlar)
    if not guncel:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Kategori bulunamadı")
    return KategoriModel.from_cat(guncel)


@router.delete("/{cat_id}")
async def sil(user_id: CurrentUser, cat_id: str) -> dict:
    await _sahiplik(cat_id, user_id)
    await repo.category_delete(cat_id)
    return {"silindi": True}
