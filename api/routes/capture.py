"""POST /v1/capture — metin veya ses → işlem adayları. HİÇBİR ŞEY KAYDETMEZ."""
from __future__ import annotations

import logging
import os
import tempfile

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status

from api.deps import CurrentUser
from api.schemas import AdayModel, CaptureYanit
from core.llm import parse_transactions, transcribe
from core.review import inceleme_gerek

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/v1", tags=["capture"])

_SES_UZANTILARI = {".m4a", ".mp3", ".ogg", ".wav", ".webm", ".mp4", ".mpeg", ".mpga"}
_MAX_SES_BAYT = 25 * 1024 * 1024


@router.post("/capture", response_model=CaptureYanit)
async def capture(
    user_id: CurrentUser,
    text: str | None = Form(default=None),
    audio: UploadFile | None = File(default=None),
) -> CaptureYanit:
    transcript: str | None = None
    kaynak = "mobile_text"

    if audio is not None:
        veri = await audio.read()
        if len(veri) > _MAX_SES_BAYT:
            raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "Ses dosyası çok büyük")
        uzanti = os.path.splitext(audio.filename or "")[1].lower() or ".m4a"
        if uzanti not in _SES_UZANTILARI:
            uzanti = ".m4a"
        tmp_path = None
        try:
            with tempfile.NamedTemporaryFile(suffix=uzanti, delete=False) as tmp:
                tmp.write(veri)
                tmp_path = tmp.name
            transcript = await transcribe(tmp_path)
        finally:
            if tmp_path and os.path.exists(tmp_path):
                os.unlink(tmp_path)
        if not transcript:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Ses anlaşılamadı")
        metin = transcript
        kaynak = "mobile_voice"
    elif text and text.strip():
        metin = text.strip()
    else:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "text veya audio gerekli")

    try:
        adaylar = await parse_transactions(metin, kaynak=kaynak)
    except Exception as e:
        logger.error(f"capture parse hatası: {e}", exc_info=True)
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE, "Yapay zeka servisine ulaşılamıyor"
        ) from e

    if not adaylar:
        return CaptureYanit(candidates=[], needs_review=False, transcript=transcript)

    gerek = inceleme_gerek(adaylar)
    return CaptureYanit(
        candidates=[AdayModel.from_candidate(a) for a in adaylar],
        needs_review=gerek,
        transcript=transcript,
    )
