"""/v1/ads — Free (reklamlı) katman için ödüllü reklam kredisi akışı.

İki uç nokta:
- `POST /request-token`: mobil, reklam yüklemeden önce çağırır. Dönen token AdMob
  `serverSideVerificationOptions.customData` alanına konur.
- `GET /ssv`: AdMob'un (Google) imzalı Server-Side Verification callback'i. Buradan
  kredi yazılır — mobil kendi başına kredi ekleyemez (bkz core/admob_ssv.py).
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, Request, Response, status

from api.deps import CurrentUser
from core import admob_ssv, repo
from core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/v1/ads", tags=["ads"])


@router.post("/request-token")
async def istek_tokeni(user_id: CurrentUser) -> dict:
    return {"token": admob_ssv.token_uret(user_id)}


@router.get("/ssv")
async def ssv_callback(istek: Request) -> Response:
    """AdMob SSV callback. Google'a her zaman 200 dönülür — hata dönmek gereksiz retry'a
    sebep olur; geçersiz istekler sessizce kredi vermeden 200 döner."""
    params = dict(istek.query_params)
    query_string = istek.url.query

    if settings.ADS_SSV_ONLY and not admob_ssv.dogrula(query_string, params):
        logger.warning("admob ssv: imza doğrulanamadı, params=%s", params)
        return Response(status_code=status.HTTP_200_OK)

    token = params.get("custom_data", "")
    user_id = admob_ssv.token_dogrula(token)
    transaction_id = params.get("transaction_id", "")
    if not user_id or not transaction_id:
        logger.warning("admob ssv: user_id/transaction_id çözülemedi, params=%s", params)
        return Response(status_code=status.HTTP_200_OK)

    # Kasıtlı olarak tavan YOK — kullanıcı istediği kadar reklam izleyip enerji açabilir.
    await repo.ad_reward_ekle(
        user_id=user_id,
        transaction_id=transaction_id,
        credited_amount=settings.AD_KREDI_ADET,
    )
    logger.info("admob ssv: %s → +%d kayıt hakkı (txn=%s)", user_id, settings.AD_KREDI_ADET, transaction_id)
    return Response(status_code=status.HTTP_200_OK)
