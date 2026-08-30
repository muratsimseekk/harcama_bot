"""/v1/summary — dönem (hafta/ay/yıl) özeti + önceki döneme kıyas + bütçe ilerlemesi."""
from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Query

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

    bu_txs = await repo.list_period(user_id, bas, bit)
    onceki_txs = await repo.list_period(user_id, obas, obit)

    hedefler: list[HedefIlerlemeModel] = []
    yatirim: YatirimModel | None = None
    hedef_tutar = 0.0
    try:
        butceler = await repo.budgets_list(user_id)
        if butceler:
            hedefler = [HedefIlerlemeModel.from_h(h) for h in hedef_ilerleme(bu_txs, butceler)]
        g = await repo.goal_get(user_id, "yatirim")
        hedef_tutar = g.hedef_amount if g else 0.0
    except Exception:  # bütçe tabloları henüz yoksa özet yine dönsün
        pass
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
