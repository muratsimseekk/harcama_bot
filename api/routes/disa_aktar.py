"""/v1/disa-aktar — seçilen tarih aralığının dökümü: Excel (xlsx) ya da PDF'e çevrilecek HTML. Pro."""
from __future__ import annotations

import re
from datetime import date
from typing import Literal

from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import HTMLResponse, Response

from api import deps, usage
from api.deps import CurrentUser
from core import disa_aktar, repo

router = APIRouter(prefix="/v1", tags=["disa-aktar"])

EN_COK_GUN = 366 * 3
_TR = str.maketrans("çğıöşüÇĞİÖŞÜ", "cgiosuCGIOSU")


def _dosya_adi(s: str) -> str:
    """"Kafe/Restoran" → "kafe-restoran" (dosya adında güvenli, Türkçe harfsiz)."""
    return re.sub(r"[^a-z0-9]+", "-", s.translate(_TR).lower()).strip("-")[:40] or "kategori"


@router.get("/disa-aktar")
async def disa_aktar_ucu(
    user_id: CurrentUser,
    bas: date = Query(...),
    bit: date = Query(...),
    bicim: Literal["xlsx", "html"] = Query(default="xlsx"),
    kategori: list[str] | None = Query(default=None),
    yon: Literal["gider", "gelir"] | None = Query(default=None),
) -> Response:
    """Tüm kayıtlar ya da yalnız seçilen kategori(ler)/yön — örn. "Faturalar, 1 Haz–31 Ağu"."""
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
    # Özet kategorisiz kayıtları "Diğer" gösterir; o kategorinin dökümü bunları da kapsamalı
    kategoriler = [*kategori, ""] if kategori and "Diğer" in kategori else kategori
    txs = await repo.list_period(ids, bas, bit, direction=yon, kategoriler=kategoriler)
    filtre = ", ".join(kategori) if kategori else ""
    ekleyen: dict[str, str] = {}
    uyelik = await deps.hane_uyeligi(user_id)
    if uyelik is not None:
        ekleyen = {u.user_id: u.ad for u in await repo.hane_uyeleri(uyelik.household_id)}

    ad = f"parazi_{_dosya_adi(filtre) + '_' if filtre else ''}{bas.isoformat()}_{bit.isoformat()}"
    if bicim == "html":
        return HTMLResponse(disa_aktar.yazdirilabilir_html(txs, bas, bit, ekleyen, filtre))
    return Response(
        content=disa_aktar.xlsx(txs, bas, bit, ekleyen, filtre),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{ad}.xlsx"'},
    )
