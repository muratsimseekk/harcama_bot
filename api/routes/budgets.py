"""/v1/budgets + /v1/goals — aylık bütçe limitleri ve yatırım hedefi (+ kategori alt hedefleri)."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from api.deps import CurrentUser
from api.schemas import ButceIstek, ButceModel, HedefIstek, HedefModel
from core import repo
from core.summary import ALT_HEDEF_ON, alt_hedefler, genel_hedef_senkron

router = APIRouter(prefix="/v1", tags=["budgets"])


# ---- budgets ---------------------------------------------------------------- #
@router.get("/budgets", response_model=list[ButceModel])
async def butce_listele(user_id: CurrentUser) -> list[ButceModel]:
    try:
        return [ButceModel.from_b(b) for b in await repo.budgets_list(user_id)]
    except Exception:  # budgets tablosu henüz yok
        return []


@router.put("/budgets", response_model=ButceModel)
async def butce_ayarla(user_id: CurrentUser, istek: ButceIstek) -> ButceModel:
    if istek.kapsam != "genel" and not istek.kapsam_deger:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Bütçe için bir kategori ya da tür seçmelisin.")
    deger = None if istek.kapsam == "genel" else istek.kapsam_deger
    b = await repo.budget_upsert(user_id, istek.kapsam, deger, istek.limit_amount)
    return ButceModel.from_b(b)


@router.delete("/budgets/{bid}")
async def butce_sil(user_id: CurrentUser, bid: str) -> dict:
    b = await repo.budget_get(bid)
    if not b or b.user_id != user_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Bütçe bulunamadı")
    await repo.budget_delete(bid)
    return {"silindi": True}


# ---- goals ---------------------------------------------------------------- #
@router.get("/goals", response_model=HedefModel | None)
async def hedef_getir(user_id: CurrentUser) -> HedefModel | None:
    try:
        g = await repo.goal_get(user_id, "yatirim")
    except Exception:  # goals tablosu henüz yok
        return None
    return HedefModel.from_g(g) if g else None


@router.put("/goals", response_model=HedefModel)
async def hedef_ayarla(user_id: CurrentUser, istek: HedefIstek) -> HedefModel:
    if not istek.kategori:
        g = await repo.goal_upsert(user_id, istek.hedef_amount, istek.tip)
        return HedefModel.from_g(g)
    # Alt hedef: önce eski durum (genel + alt toplam), sonra yaz, sonra genel hedefi senkronla.
    genel, eski_toplam = await _yatirim_durumu(user_id)
    g = await repo.goal_upsert(user_id, istek.hedef_amount, ALT_HEDEF_ON + istek.kategori.strip())
    _, yeni_toplam = await _yatirim_durumu(user_id)
    await _genel_senkronla(user_id, genel, eski_toplam, yeni_toplam)
    return HedefModel.from_g(g)


@router.delete("/goals")
async def hedef_sil(user_id: CurrentUser, kategori: str | None = None) -> dict:
    if not kategori:
        await repo.goal_delete(user_id, "yatirim")
        return {"silindi": True}
    await alt_hedef_sil(user_id, kategori)
    return {"silindi": True}


async def _yatirim_durumu(user_id: str) -> tuple[float | None, float]:
    """(genel yatırım hedefi ya da None, alt hedeflerin toplamı)."""
    goals = await repo.goals_list(user_id)
    genel = next((x.hedef_amount for x in goals if x.tip == "yatirim"), None)
    return genel, sum(alt_hedefler(goals).values())


async def _genel_senkronla(user_id: str, genel: float | None, eski: float, yeni: float) -> None:
    hedef = genel_hedef_senkron(genel, eski, yeni)
    if hedef is None:
        return
    if hedef > 0:
        await repo.goal_upsert(user_id, hedef, "yatirim")
    elif genel is not None:
        await repo.goal_delete(user_id, "yatirim")


async def alt_hedef_sil(user_id: str, kategori: str) -> None:
    """Bir yatırım kategorisinin alt hedefini siler, genel hedefi senkronlar (kategori silinince de)."""
    genel, eski_toplam = await _yatirim_durumu(user_id)
    if not await repo.goal_delete(user_id, ALT_HEDEF_ON + kategori.strip()):
        return
    _, yeni_toplam = await _yatirim_durumu(user_id)
    await _genel_senkronla(user_id, genel, eski_toplam, yeni_toplam)
