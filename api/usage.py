"""Üyelik katmanları (Deneme → Free[reklamlı] → Pro) ve günlük "enerji" sayacı.

Free katmanda her kayıt (elle VEYA AI — ayrım yok) günlük 1 enerji harcar; gece yarısı
(Europe/Istanbul) sıfırlanır. Enerji biterse ödüllü reklam izleyerek kredi kazanılır
(tavansız — bkz core/config.py GUNLUK_ENERJI / AD_KREDI_ADET).
"""
from __future__ import annotations

import asyncio
from dataclasses import dataclass
from datetime import datetime

from core.config import settings
from core.dates import now
from core.repo import _db

# Kaynak etiketleri — kotaya girmiyor (her kayıt kaynağı ne olursa olsun 1 enerji harcar),
# yalnız analitik/etiketleme amaçlı hâlâ ayırt edilebilsin diye tutuluyor.
AI_KAYNAKLARI = ["mobile_text", "mobile_voice", "telegram_text", "telegram_voice"]
_SINIRSIZ = 10**9


@dataclass
class PlanDurum:
    ham: str                      # DB değeri: free | trial | pro (legacy: base)
    etkin: str                    # geçerli davranış: free | pro
    trial_bitis: datetime | None
    gunluk_limit: int             # bugünkü toplam kayıt (elle+AI) tavanı; taban + reklam kredisi (pro/trial → çok büyük)

    @property
    def pro(self) -> bool:
        return self.etkin == "pro"


def _dev_user(user_id: str) -> bool:
    return bool(settings.DEV_BYPASS_USER_ID) and user_id == settings.DEV_BYPASS_USER_ID


def _gun_basi_iso() -> str:
    return now().replace(hour=0, minute=0, second=0, microsecond=0).isoformat()


def _profil_oku(user_id: str) -> dict:
    res = (
        _db().table("profiles").select("plan,trial_bitis,plan_bitis")
        .eq("id", user_id).limit(1).execute()
    )
    return res.data[0] if res.data else {"plan": "free"}


def _tarih(raw) -> datetime | None:
    if not raw:
        return None
    try:
        return datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
    except ValueError:
        return None


def _profil_garanti(user_id: str) -> None:
    """profiles satırı yoksa oluşturur (trigger'ı kaçırmış eski kullanıcılar için)."""
    _db().table("profiles").upsert(
        {"id": user_id}, on_conflict="id", ignore_duplicates=True
    ).execute()


def _gun_kayit_sayisi(user_id: str) -> int:
    """Bugün OLUŞTURULAN kayıt sayısı (elle + AI, kaynak ayrımı yok).

    Kasıtlı olarak `deleted_at` filtrelenmiyor: sonradan silinen kayıt günlük hakkı geri
    vermemeli, yoksa kullanıcı ekle→sil→ekle döngüsüyle günlük enerjiyi sınırsız aşabilir."""
    res = (
        _db().table("transactions")
        .select("id", count="exact")
        .eq("user_id", user_id)
        .gte("created_at", _gun_basi_iso())
        .execute()
    )
    return res.count or 0


def _toplam_kayit(user_id: str) -> int:
    res = (
        _db().table("transactions")
        .select("id", count="exact")
        .eq("user_id", user_id)
        .is_("deleted_at", "null")
        .execute()
    )
    return res.count or 0


def _gun_ad_kredisi(user_id: str) -> int:
    res = (
        _db().table("ad_rewards")
        .select("credited_amount")
        .eq("user_id", user_id)
        .gte("created_at", _gun_basi_iso())
        .execute()
    )
    return sum(r["credited_amount"] for r in (res.data or []))


async def gun_ad_kredisi(user_id: str) -> int:
    try:
        return await asyncio.to_thread(_gun_ad_kredisi, user_id)
    except Exception:
        return 0


def _coz(profil: dict, ad_kredisi: int = 0) -> PlanDurum:
    ham = profil.get("plan") or "free"
    tb = _tarih(profil.get("trial_bitis"))
    pb = _tarih(profil.get("plan_bitis"))

    # Pro süresi dolmuşsa Free'ye düş.
    if ham == "pro" and pb is not None and pb <= now():
        return PlanDurum(ham, "free", tb, settings.GUNLUK_ENERJI + ad_kredisi)

    if ham == "pro":
        return PlanDurum(ham, "pro", tb, _SINIRSIZ)
    if ham == "trial":
        # Deneme = Free özellikleri + sınırsız kayıt. Hane KAPALI (etkin='free' → .pro=False).
        aktif = tb is not None and tb > now()
        return PlanDurum(ham, "free", tb,
                         _SINIRSIZ if aktif else settings.GUNLUK_ENERJI + ad_kredisi)
    # free / legacy 'base' satırı / bilinmeyen → hepsi free davranışı
    return PlanDurum(ham, "free", tb, settings.GUNLUK_ENERJI + ad_kredisi)


async def plan_durum(user_id: str) -> PlanDurum:
    if _dev_user(user_id):
        return PlanDurum("pro", "pro", None, _SINIRSIZ)
    try:
        profil, ad_kredisi = await asyncio.gather(
            asyncio.to_thread(_profil_oku, user_id),
            gun_ad_kredisi(user_id),
        )
    except Exception:
        return PlanDurum("free", "free", None, settings.GUNLUK_ENERJI)
    return _coz(profil, ad_kredisi)


async def plan(user_id: str) -> str:
    """Geriye dönük: etkin planı ('free' | 'pro') döndürür."""
    return (await plan_durum(user_id)).etkin


async def profil_garanti(user_id: str) -> None:
    if _dev_user(user_id):
        return
    try:
        await asyncio.to_thread(_profil_garanti, user_id)
    except Exception:
        pass


async def gun_kayit_sayisi(user_id: str) -> int:
    """Bugün eklenen kayıt sayısı (Free günlük tavanı + reklam kredisi bununla karşılaştırılır)."""
    try:
        return await asyncio.to_thread(_gun_kayit_sayisi, user_id)
    except Exception:
        return 0


async def toplam_kayit(user_id: str) -> int:
    try:
        return await asyncio.to_thread(_toplam_kayit, user_id)
    except Exception:
        return 0
