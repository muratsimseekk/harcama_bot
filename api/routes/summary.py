"""/v1/summary — dönem (hafta/ay/yıl) özeti + önceki döneme kıyas + bütçe ilerlemesi."""
from __future__ import annotations

import asyncio
from datetime import date

from fastapi import APIRouter, Query

from api import deps
from api.deps import CurrentUser
from api.schemas import HedefIlerlemeModel, OzetGovde, OzetModel, YatirimModel
from core import repo
from core.dates import donem_araligi, donem_etiket, donem_kaydir, today
from core.summary import hedef_ilerleme, ozetle, yatirim_ilerleme

router = APIRouter(prefix="/v1", tags=["summary"])


@router.get("/summary", response_model=OzetModel)
async def summary(
    user_id: CurrentUser,
    period: str = Query(default="month", pattern="^(week|month|year)$"),
    ref: date | None = Query(default=None),
) -> OzetModel:
    ref = ref or today()
    bas, bit = donem_araligi(period, ref)  # type: ignore[arg-type]
    onceki_ref = donem_kaydir(period, ref, -1)  # type: ignore[arg-type]
    obas, obit = donem_araligi(period, onceki_ref)  # type: ignore[arg-type]

    # Supabase uzakta; her sorgu ~300 ms gidiş-dönüş. Bağımsız olanlar sıralı
    # beklenince uç ~1,6 sn sürüyordu. İki paralel dalgaya indirildi.
    # Dalga 1: kapsam + bütçe + hedef (üçü de yalnız user_id'ye bağlı)
    ids, butceler, g = await asyncio.gather(
        deps.kapsam(user_id),
        repo.budgets_list(user_id),
        repo.goal_get(user_id, "yatirim"),
        return_exceptions=True,  # bütçe/hedef tabloları yoksa özet yine dönsün
    )
    if isinstance(ids, BaseException):
        raise ids
    if isinstance(butceler, BaseException):
        butceler = []
    if isinstance(g, BaseException):
        g = None

    # Dalga 2: iki dönemin işlemleri (ids geldikten sonra, ikisi paralel)
    bu_txs, onceki_txs = await asyncio.gather(
        repo.list_period(ids, bas, bit),
        repo.list_period(ids, obas, obit),
    )

    hedefler: list[HedefIlerlemeModel] = []
    if butceler:
        hedefler = [HedefIlerlemeModel.from_h(h) for h in hedef_ilerleme(bu_txs, butceler)]
    hedef_tutar = g.hedef_amount if g else 0.0
    # yatırım kartı: hedef olmasa bile bu ay birikeni göster
    yatirim = YatirimModel(**yatirim_ilerleme(bu_txs, hedef_tutar))

    return OzetModel(
        period=period,
        baslangic=bas,
        bitis=bit,
        etiket=donem_etiket(period, ref),  # type: ignore[arg-type]
        bu_donem=OzetGovde.from_ozet(ozetle(bu_txs)),
        onceki=OzetGovde.from_ozet(ozetle(onceki_txs)),
        hedefler=hedefler,
        yatirim=yatirim,
    )
