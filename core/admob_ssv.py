"""AdMob ödüllü reklam — istek tokeni + Server-Side Verification (SSV) imza doğrulama.

Akış (bkz `~/.claude/plans/swirling-discovering-jellyfish.md`):
1. Mobil `POST /v1/ads/request-token` çağırır → `token_uret()` kısa ömürlü, imzalı bir
   token döner. Bu token AdMob `serverSideVerificationOptions.customData` alanına konur
   (kullanıcı id'sini doğrudan customData'ya koymak yerine — token, manipülasyonu zorlaştırır).
2. Kullanıcı reklamı izler → Google, AdMob dashboard'da tanımlı callback URL'ine
   (`GET /v1/ads/ssv`) imzalı bir istek yapar. `dogrula()` bu isteğin gerçekten Google'dan
   geldiğini (ECDSA imza, Google'ın yayımladığı public key seti ile) doğrular.

NOT: İmza doğrulama mantığı Google'ın yayımladığı SSV formatına göre yazıldı ama gerçek bir
AdMob hesabı/callback'i olmadan uçtan uca test edilemedi — canlıya almadan önce AdMob
dashboard'da gerçek bir ödüllü reklam ile doğrulanmalı (plan §7, "AdMob hesabı + EAS dev
build'e gated" bölümü).
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import logging
import time

import httpx
from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.serialization import load_pem_public_key

from core.config import settings

logger = logging.getLogger(__name__)

_TOKEN_TTL = 600  # saniye — reklam yükleme+izleme için yeterli, uzun tutmaya gerek yok
_ayrac = "."


# --------------------------------------------------------------------------- #
# 1) İstek tokeni — customData'ya konan, tek kullanımlık değil ama kısa ömürlü
#    ve yalnız o kullanıcı için geçerli imzalı değer.
# --------------------------------------------------------------------------- #
def token_uret(user_id: str) -> str:
    if not settings.ADS_TOKEN_SECRET:
        raise RuntimeError("ADS_TOKEN_SECRET (veya CRON_SECRET) ayarlı değil")
    exp = int(time.time()) + _TOKEN_TTL
    govde = f"{user_id}{_ayrac}{exp}"
    imza = hmac.new(
        settings.ADS_TOKEN_SECRET.encode(), govde.encode(), hashlib.sha256
    ).hexdigest()
    return f"{govde}{_ayrac}{imza}"


def token_dogrula(token: str) -> str | None:
    """Geçerliyse user_id, değilse None döner."""
    if not settings.ADS_TOKEN_SECRET or not token:
        return None
    parcalar = token.split(_ayrac)
    if len(parcalar) != 3:
        return None
    user_id, exp_raw, imza = parcalar
    govde = f"{user_id}{_ayrac}{exp_raw}"
    beklenen = hmac.new(
        settings.ADS_TOKEN_SECRET.encode(), govde.encode(), hashlib.sha256
    ).hexdigest()
    if not hmac.compare_digest(beklenen, imza):
        return None
    try:
        if int(exp_raw) < time.time():
            return None
    except ValueError:
        return None
    return user_id


# --------------------------------------------------------------------------- #
# 2) Google SSV imza doğrulama
# --------------------------------------------------------------------------- #
_key_cache: dict[str, tuple[float, dict[str, str]]] = {}
_KEY_CACHE_TTL = 3600.0


def _public_keys() -> dict[str, str]:
    """key_id (str) → PEM public key. Kısa TTL cache — Google anahtarları nadiren döner."""
    hit = _key_cache.get("keys")
    if hit and hit[0] > time.time():
        return hit[1]
    r = httpx.get(settings.ADMOB_SSV_PUBLIC_KEYS_URL, timeout=10.0, follow_redirects=True)
    r.raise_for_status()
    veri = r.json()
    keys = {str(k["keyId"]): k["pem"] for k in veri.get("keys", [])}
    _key_cache["keys"] = (time.time() + _KEY_CACHE_TTL, keys)
    return keys


def dogrula(query_string: str, params: dict[str, str]) -> bool:
    """`query_string`: ham (URL-decode edilmemiş) query string. `params`: parse edilmiş
    query parametreleri. İmza + key_id çıkarılıp geri kalan içerik üzerinden doğrulanır."""
    key_id = params.get("key_id")
    signature = params.get("signature")
    if not key_id or not signature:
        return False

    # İmzalanan içerik: signature ve key_id HARİÇ, orijinal sıradaki query string.
    # (AdMob bu iki alanı en sona ekler — pratikte "&signature=..." ve "&key_id=..." kesilir.)
    icerik = query_string
    for alan in (f"signature={signature}", f"key_id={key_id}"):
        icerik = icerik.replace(f"&{alan}", "").replace(alan, "")
    icerik = icerik.strip("&")

    try:
        pem = _public_keys().get(key_id)
        if not pem:
            logger.warning("admob ssv: bilinmeyen key_id=%s", key_id)
            return False
        anahtar = load_pem_public_key(pem.encode())
        if not isinstance(anahtar, ec.EllipticCurvePublicKey):
            return False
        imza_bytes = base64.urlsafe_b64decode(signature + "=" * (-len(signature) % 4))
        anahtar.verify(imza_bytes, icerik.encode(), ec.ECDSA(hashes.SHA256()))
        return True
    except InvalidSignature:
        return False
    except Exception as e:
        logger.error("admob ssv doğrulama hatası: %s", e, exc_info=True)
        return False
