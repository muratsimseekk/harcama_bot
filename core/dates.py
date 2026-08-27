"""Zaman dilimi bilinçli tarih yardımcıları ve Türkçe ay/tarih çözümü.

Eski kod `datetime.now()` (sunucu = UTC) kullanıyordu → Türkiye için ~3 saat kayıktı.
Artık her şey `Europe/Istanbul` üzerinden.
"""
from __future__ import annotations

from datetime import date, datetime
from zoneinfo import ZoneInfo

from core.config import settings

TZ = ZoneInfo(settings.TIMEZONE)

AYLAR_TR = {
    1: "Ocak", 2: "Şubat", 3: "Mart", 4: "Nisan",
    5: "Mayıs", 6: "Haziran", 7: "Temmuz", 8: "Ağustos",
    9: "Eylül", 10: "Ekim", 11: "Kasım", 12: "Aralık",
}
AYLAR_TR_TERS = {ad.lower(): no for no, ad in AYLAR_TR.items()}

GUNLER_TR = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"]


def now() -> datetime:
    """Şu anki İstanbul zamanı (tz-aware)."""
    return datetime.now(TZ)


def today() -> date:
    return now().date()


def gun_adi(d: date) -> str:
    return GUNLER_TR[d.weekday()]


def sayfa_adi(d: date) -> str:
    """'Ağustos 2026' — eski Google Sheets sekme adı biçimi (migrasyon için)."""
    return f"{AYLAR_TR[d.month]} {d.year}"


def tarih_parse(s: str) -> date:
    """'DD.MM.YYYY' → date. Bozuksa bugün."""
    for fmt in ("%d.%m.%Y", "%Y-%m-%d", "%d/%m/%Y"):
        try:
            return datetime.strptime(s.strip(), fmt).date()
        except (ValueError, AttributeError):
            continue
    return today()


def tarih_str(d: date) -> str:
    return d.strftime("%d.%m.%Y")


def ay_coz(ay_str: str, bugun: date | None = None) -> tuple[int, int]:
    """'geçen ay', 'bu ay', 'Nisan', 'nisan 2025' → (ay_no, yil)."""
    bugun = bugun or today()
    s = (ay_str or "").lower().strip()

    if s in ("geçen ay", "gecen ay", "önceki ay", "onceki ay"):
        if bugun.month == 1:
            return 12, bugun.year - 1
        return bugun.month - 1, bugun.year
    if s in ("bu ay", "şu an", "su an", ""):
        return bugun.month, bugun.year

    yil = bugun.year
    for parca in s.split():
        if parca.isdigit() and len(parca) == 4:
            yil = int(parca)
    for ad, no in AYLAR_TR_TERS.items():
        if ad in s:
            return no, yil
    return bugun.month, bugun.year


def turkce_tutar(x: float) -> str:
    """1234567.5 → '1.234.567,50'"""
    return f"{x:,.2f}".replace(",", "_").replace(".", ",").replace("_", ".")
