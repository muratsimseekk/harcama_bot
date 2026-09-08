"""POST /v1/capture — metin veya ses → işlem adayları. HİÇBİR ŞEY KAYDETMEZ."""
from __future__ import annotations

import logging
import os
import tempfile

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status

from api.deps import CurrentUser, capture_limiti
from api.schemas import AdayModel, CaptureYanit
from core import repo
from core.llm import GroqBusy, parse_transactions, transcribe
from core.review import inceleme_gerek

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/v1", tags=["capture"])

_SES_UZANTILARI = {".m4a", ".mp3", ".ogg", ".wav", ".webm", ".mp4", ".mpeg", ".mpga"}
_MAX_SES_BAYT = 25 * 1024 * 1024
_PARCA = 256 * 1024

_MESGUL = HTTPException(
    status.HTTP_429_TOO_MANY_REQUESTS,
    "Yapay zeka servisi yoğun, birazdan tekrar dene.",
    headers={"Retry-After": "20"},
)


@router.post("/capture", response_model=CaptureYanit)
async def capture(
    user_id: CurrentUser,
    text: str | None = Form(default=None),
    audio: UploadFile | None = File(default=None),
) -> CaptureYanit:
    capture_limiti(user_id)
    transcript: str | None = None
    kaynak = "mobile_text"

    if audio is not None:
        uzanti = os.path.splitext(audio.filename or "")[1].lower()
        if uzanti not in _SES_UZANTILARI:
            uzanti = ".m4a"
        tmp_path = None
        boyut = 0
        try:
            with tempfile.NamedTemporaryFile(suffix=uzanti, delete=False) as tmp:
                tmp_path = tmp.name
                while parca := await audio.read(_PARCA):
                    boyut += len(parca)
                    if boyut > _MAX_SES_BAYT:
                        raise HTTPException(
                            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "Ses dosyası çok büyük"
                        )
                    tmp.write(parca)
            try:
                transcript = await transcribe(tmp_path)
            except GroqBusy as e:
                raise _MESGUL from e
        finally:
            if tmp_path and os.path.exists(tmp_path):
                os.unlink(tmp_path)
        logger.info("capture ses: %d bayt %s → transcript=%r", boyut, uzanti, transcript)
        if not transcript:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Ses anlaşılamadı")
        metin = transcript
        kaynak = "mobile_voice"
    elif text and text.strip():
        metin = text.strip()
    else:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "text veya audio gerekli")

    try:
        kategoriler = await repo.categories_list(user_id)
    except Exception:
        logger.warning("capture: kategoriler yüklenemedi, varsayılan liste kullanılıyor")
        kategoriler = []

    try:
        adaylar = await parse_transactions(metin, kaynak=kaynak, kategoriler=kategoriler)
    except GroqBusy as e:
        raise _MESGUL from e
    except Exception as e:
        logger.error(f"capture parse hatası: {e}", exc_info=True)
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE, "Yapay zeka servisine ulaşılamıyor"
        ) from e

    if not adaylar:
        logger.info("capture: aday çıkmadı | metin=%r", metin)
        return CaptureYanit(candidates=[], needs_review=False, transcript=transcript)

    gerek = inceleme_gerek(adaylar)
    return CaptureYanit(
        candidates=[AdayModel.from_candidate(a) for a in adaylar],
        needs_review=gerek,
        transcript=transcript,
    )
