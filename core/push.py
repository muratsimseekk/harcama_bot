"""Expo Push API ile bildirim gönderme.

https://docs.expo.dev/push-notifications/sending-notifications/
"""
from __future__ import annotations

import asyncio
import logging
import time

import httpx

logger = logging.getLogger(__name__)

_EXPO_URL = "https://exp.host/--/api/v2/push/send"
_CHUNK = 90  # Expo tek istekte 100 mesaj kabul eder
# Expo 429 / 5xx ya da ağ hatasında üstel geri çekilmeyle tekrar denemeyi öneriyor
# (2026-10-22'de geçici 503 yüzünden bir günlük özet kayboldu).
_BEKLEMELER = (1.0, 3.0)


def _post(c: httpx.Client, parca: list[dict]) -> httpx.Response:
    for bekle in (*_BEKLEMELER, None):
        try:
            r = c.post(
                _EXPO_URL,
                json=parca,
                headers={"Content-Type": "application/json", "Accept": "application/json"},
            )
            if r.status_code != 429 and r.status_code < 500:
                return r
            if bekle is None:
                return r
        except httpx.TransportError:
            if bekle is None:
                raise
        logger.warning("Expo push geçici hata, %.0f sn sonra tekrar denenecek", bekle)
        time.sleep(bekle)
    raise AssertionError("ulaşılamaz")


def _mesajlar(tokens: list[str], baslik: str, govde: str, veri: dict | None) -> list[dict]:
    return [
        {
            "to": t,
            "title": baslik,
            "body": govde,
            "sound": "default",
            "data": veri or {},
        }
        for t in tokens
        if isinstance(t, str) and t.startswith("ExponentPushToken")
    ]


def _gonder_sync(mesajlar: list[dict]) -> tuple[int, int, list[str]]:
    ok = hata = 0
    olu: list[str] = []  # DeviceNotRegistered — silinmeli
    with httpx.Client(timeout=15.0) as c:
        for i in range(0, len(mesajlar), _CHUNK):
            parca = mesajlar[i : i + _CHUNK]
            try:
                r = _post(c, parca)
                r.raise_for_status()
                for msj, sonuc in zip(parca, r.json().get("data", []), strict=False):
                    if sonuc.get("status") == "ok":
                        ok += 1
                    else:
                        hata += 1
                        logger.warning("Expo push hata: %s", sonuc)
                        if (sonuc.get("details") or {}).get("error") == "DeviceNotRegistered":
                            olu.append(msj["to"])
            except httpx.HTTPError as e:
                hata += len(parca)
                logger.error("Expo push isteği başarısız: %s", e)
    return ok, hata, olu


async def expo_push_gonder(
    tokens: list[str], baslik: str, govde: str, veri: dict | None = None
) -> tuple[int, int, list[str]]:
    """(basarili, basarisiz, olu_token'lar) döndürür."""
    mesajlar = _mesajlar(tokens, baslik, govde, veri)
    if not mesajlar:
        return 0, 0, []
    return await asyncio.to_thread(_gonder_sync, mesajlar)
