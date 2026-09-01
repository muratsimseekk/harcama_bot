"""/v1/push — cihaz token kaydı + planlı bildirim tetikleyici (cron)."""
from __future__ import annotations

import logging
from datetime import date, timedelta

from fastapi import APIRouter, Header, HTTPException, status
from pydantic import BaseModel

from api.deps import CurrentUser
from core import push, repo
from core.config import settings
from core.dates import donem_araligi, hafta_araligi, today, turkce_tutar
from core.summary import hedef_ilerleme

router = APIRouter(prefix="/v1/push", tags=["push"])
logger = logging.getLogger(__name__)


class TokenIstek(BaseModel):
    token: str
    platform: str | None = None


@router.put("/token")
async def token_kaydet(user_id: CurrentUser, istek: TokenIstek) -> dict:
    try:
        await repo.push_token_upsert(user_id, istek.token, istek.platform)
        return {"ok": True}
    except Exception as e:  # push_tokens tablosu henüz yoksa uygulamayı kırma
        logger.warning("push token kaydedilemedi: %s", e)
        return {"ok": False}


@router.delete("/token")
async def token_sil(istek: TokenIstek) -> dict:
    try:
        await repo.push_token_delete(istek.token)
    except Exception:
        pass
    return {"ok": True}


class RunIstek(BaseModel):
    tur: str = "butce"  # butce | gunluk | haftalik


@router.post("/run")
async def calistir(istek: RunIstek, x_cron_secret: str = Header(default="")) -> dict:
    if not settings.CRON_SECRET or x_cron_secret != settings.CRON_SECRET:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Geçersiz cron sırrı")

    kayitlar = await repo.push_tokens_all()
    kullanici_token: dict[str, list[str]] = {}
    for r in kayitlar:
        kullanici_token.setdefault(r["user_id"], []).append(r["token"])

    b = today()
    gonderim = 0
    for uid, tokens in kullanici_token.items():
        try:
            if istek.tur == "gunluk":
                gonderim += await _gunluk_ozet(uid, tokens, b)
            elif istek.tur == "haftalik":
                gonderim += await _haftalik_ozet(uid, tokens, b)
            else:
                gonderim += await _butce_uyarilari(uid, tokens, b)
        except Exception as e:  # bir kullanıcının hatası diğerlerini durdurmasın
            logger.error("push kullanıcı %s hata: %s", uid, e, exc_info=True)

    return {"tur": istek.tur, "kullanici": len(kullanici_token), "gonderim": gonderim}


async def _butce_uyarilari(uid: str, tokens: list[str], b: date) -> int:
    bas, bit = donem_araligi("month", b)
    txs = await repo.list_period(uid, bas, bit)
    try:
        butceler = await repo.budgets_list(uid)
    except Exception:
        return 0
    donem = f"{b.year}-{b.month:02d}"
    n = 0
    for h in hedef_ilerleme(txs, butceler):
        if h.durum not in ("yaklasti", "asti"):
            continue
        anahtar = f"butce_{h.durum}:{h.kapsam_deger or 'genel'}:{donem}"
        if await repo.bildirim_gonderildi_mi(uid, anahtar):
            continue
        if h.durum == "asti":
            baslik = f"{h.etiket} limitini aştın"
            govde = f"{turkce_tutar(h.harcanan)} / {turkce_tutar(h.limit)} ₺ · %{round(h.oran)}"
        else:
            baslik = f"{h.etiket}: limitin %{round(h.oran)}'i doldu"
            govde = f"{turkce_tutar(h.kalan)} ₺ kaldı"
        ok, _, olu = await push.expo_push_gonder(tokens, baslik, govde, {"tur": "butce"})
        await _olu_temizle(olu)
        if ok:
            await repo.bildirim_isaretle(uid, anahtar)
            n += 1
    return n


async def _olu_temizle(olu: list[str]) -> None:
    for t in olu:
        try:
            await repo.push_token_delete(t)
        except Exception:
            pass


async def _gunluk_ozet(uid: str, tokens: list[str], b: date) -> int:
    anahtar = f"gunluk:{b.isoformat()}"
    if await repo.bildirim_gonderildi_mi(uid, anahtar):
        return 0
    giderler = [t for t in await repo.list_period(uid, b, b) if t.direction == "gider"]
    if not giderler:
        return 0
    toplam = sum(t.tutar for t in giderler)
    ok, _, olu = await push.expo_push_gonder(
        tokens, "Bugünkü harcaman",
        f"{len(giderler)} işlem · {turkce_tutar(toplam)} ₺", {"tur": "gunluk"},
    )
    await _olu_temizle(olu)
    if ok:
        await repo.bildirim_isaretle(uid, anahtar)
        return 1
    return 0


async def _haftalik_ozet(uid: str, tokens: list[str], b: date) -> int:
    bas, bit = hafta_araligi(b - timedelta(days=7))
    anahtar = f"haftalik:{bas.isoformat()}"
    if await repo.bildirim_gonderildi_mi(uid, anahtar):
        return 0
    giderler = [t for t in await repo.list_period(uid, bas, bit) if t.direction == "gider"]
    if not giderler:
        return 0
    toplam = sum(t.tutar for t in giderler)
    ok, _, olu = await push.expo_push_gonder(
        tokens, "Geçen hafta özeti",
        f"{len(giderler)} işlem · {turkce_tutar(toplam)} ₺. Bu hafta bütçeni gözden geçir.",
        {"tur": "haftalik"},
    )
    await _olu_temizle(olu)
    if ok:
        await repo.bildirim_isaretle(uid, anahtar)
        return 1
    return 0
