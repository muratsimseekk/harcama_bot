"""/v1/disa-aktar — seçilen tarih aralığının dökümü: Excel (xlsx) ya da PDF'e çevrilecek HTML. Pro."""
from __future__ import annotations

from datetime import date
from typing import Literal

from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import HTMLResponse, Response

from api import deps, usage
from api.deps import CurrentUser
from core import disa_aktar, repo

router = APIRouter(prefix="/v1", tags=["disa-aktar"])

EN_COK_GUN = 366 * 3


@router.get("/disa-aktar")
async def disa_aktar_ucu(
    user_id: CurrentUser,
    bas: date = Query(...),
    bit: date = Query(...),
    bicim: Literal["xlsx", "html"] = Query(default="xlsx"),
) -> Response:
    if bit < bas:
        raise HTTPException(422, "Bitiş tarihi başlangıçtan önce olamaz")
    if (bit - bas).days + 1 > EN_COK_GUN:
        raise HTTPException(422, "Tarih aralığı en çok 3 yıl olabilir")
    if not (await usage.plan_durum(user_id)).pro:
        raise HTTPException(
            status.HTTP_402_PAYMENT_REQUIRED,
            detail={"kod": "pro_gerekli", "mesaj": "Excel ve PDF dışa aktarma Pro üyelikte."},
        )
    ids = await deps.kapsam(user_id)
    txs = await repo.list_period(ids, bas, bit)
    ekleyen: dict[str, str] = {}
    uyelik = await deps.hane_uyeligi(user_id)
    if uyelik is not None:
        ekleyen = {u.user_id: u.ad for u in await repo.hane_uyeleri(uyelik.household_id)}

    ad = f"parazi_{bas.isoformat()}_{bit.isoformat()}"
    if bicim == "html":
        return HTMLResponse(disa_aktar.yazdirilabilir_html(txs, bas, bit, ekleyen))
    return Response(
        content=disa_aktar.xlsx(txs, bas, bit, ekleyen),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{ad}.xlsx"'},
    )
