"""/v1/budgets + /v1/goals — aylık bütçe limitleri ve yatırım hedefi."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from api.deps import CurrentUser
from api.schemas import ButceIstek, ButceModel, HedefIstek, HedefModel
from core import repo

router = APIRouter(prefix="/v1", tags=["budgets"])


# ---- budgets ---------------------------------------------------------------- #
@router.get("/budgets", response_model=list[ButceModel])
async def butce_listele(user_id: CurrentUser) -> list[ButceModel]:
    return [ButceModel.from_b(b) for b in await repo.budgets_list(user_id)]


@router.put("/budgets", response_model=ButceModel)
async def butce_ayarla(user_id: CurrentUser, istek: ButceIstek) -> ButceModel:
    if istek.kapsam != "genel" and not istek.kapsam_deger:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "kapsam_deger gerekli")
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
    g = await repo.goal_get(user_id, "yatirim")
    return HedefModel.from_g(g) if g else None


@router.put("/goals", response_model=HedefModel)
async def hedef_ayarla(user_id: CurrentUser, istek: HedefIstek) -> HedefModel:
    g = await repo.goal_upsert(user_id, istek.hedef_amount, istek.tip)
    return HedefModel.from_g(g)


@router.delete("/goals")
async def hedef_sil(user_id: CurrentUser) -> dict:
    await repo.goal_delete(user_id, "yatirim")
    return {"silindi": True}
