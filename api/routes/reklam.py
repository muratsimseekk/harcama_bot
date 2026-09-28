"""/v1/ads — Free (reklamlı) katman için ödüllü reklam kredisi akışı.

Üç uç nokta:
- `POST /request-token`: mobil, reklam yüklemeden önce çağırır. Dönen token AdMob
  `serverSideVerificationOptions.customData` alanına konur.
- `GET /ssv`: AdMob'un (Google) imzalı Server-Side Verification callback'i — en güvenilir
  yol, ama test reklamlarında HİÇ gelmez ve gerçek reklamlarda bile birkaç saniye gecikebilir.
- `POST /claim`: istemci tarafı ödül talebi. Native SDK'nın `EARNED_REWARD` event'i
  (reklamı gerçekten sonuna kadar izlediğini SDK onaylar) tetiklenince mobil bunu çağırır.
  SSV beklemeden krediyi hemen yazar — kullanıcı deneyimi SSV'nin gecikme/gelmeme riskine
  bağlı kalmasın diye bilinçli bir tercih. Güvenlik: `/request-token`'ın ürettiği kısa ömürlü,
  imzalı token doğrulanmadan kredi yazılmaz (rastgele biri sahte istek atayamaz), ama SSV'nin
  aksine "reklam gerçekten sonuna kadar izlendi mi" sunucu tarafında doğrulanamıyor — kökü
  sökülmüş/değiştirilmiş bir istemci teorik olarak reklamı izlemeden bu event'i tetikleyebilir.
  Bu, uygulamanın bu aşamasında (düşük risk, ücretsiz katmanda küçük bir kayıt hakkı) kabul
  edilen bir ödün.

Çifte kredi önleme: SSV VE /claim aynı token'ı (`custom_data`/`token`) idempotency anahtarı
olarak kullanır (`ad_rewards` tablosunda unique index) — hangisi önce gelirse kredi o yazar,
diğeri no-op olur. Google'ın kendi `transaction_id`'si yalnız log/teşhis amaçlı tutulur.
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, Request, Response, status
from pydantic import BaseModel

from api.deps import CurrentUser
from core import admob_ssv, repo
from core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/v1/ads", tags=["ads"])


class OdulTalebiIstek(BaseModel):
    token: str


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
    if not user_id:
        logger.warning("admob ssv: token çözülemedi, params=%s", params)
        return Response(status_code=status.HTTP_200_OK)

    # transaction_id kasıtlı olarak Google'ın kendi id'si değil, bizim token'ımız —
    # /claim ile aynı anahtarı paylaşıp çifte kredi vermeyi engelliyor (bkz modül docstring).
    await repo.ad_reward_ekle(
        user_id=user_id,
        transaction_id=token,
        credited_amount=settings.AD_KREDI_ADET,
    )
    logger.info(
        "admob ssv: %s → +%d kayıt hakkı (google_txn=%s)",
        user_id, settings.AD_KREDI_ADET, params.get("transaction_id", ""),
    )
    return Response(status_code=status.HTTP_200_OK)


@router.post("/claim")
async def odul_talebi(istek: OdulTalebiIstek, user_id: CurrentUser) -> dict:
    """İstemci tarafı ödül talebi — bkz modül docstring. SSV daha sonra (ya da önce)
    aynı token'la gelirse `ad_reward_ekle`'nin unique index'i sayesinde no-op olur."""
    hedef_user_id = admob_ssv.token_dogrula(istek.token)
    if not hedef_user_id or hedef_user_id != user_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Geçersiz ya da süresi dolmuş token.")
    await repo.ad_reward_ekle(
        user_id=user_id,
        transaction_id=istek.token,
        credited_amount=settings.AD_KREDI_ADET,
    )
    logger.info("admob claim: %s → +%d kayıt hakkı (istemci taraflı)", user_id, settings.AD_KREDI_ADET)
    return {"eklendi": True}
