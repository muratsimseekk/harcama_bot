"""Akıllı onay: bir adayın kaydedilmeden önce kullanıcı onayı gerektirip gerektirmediğini
belirler.
"""
from __future__ import annotations

from datetime import timedelta

from core.config import settings
from core.dates import today
from core.models import Candidate

_ESIK = {
    "kisisel": settings.REVIEW_TUTAR_KISISEL,
    "isletme": settings.REVIEW_TUTAR_ISLETME,
    "yatirim": settings.REVIEW_TUTAR_YATIRIM,
}

_JENERIK_ACIKLAMALAR = {
    "harcama", "ödeme", "odeme", "gider", "masraf", "şey", "sey", "para", "-", "—", "x",
}

_DIGER_KATEGORILER = {
    "diğer", "diger", "diğer işletme", "diger isletme",
    "diğer yatırım", "diger yatirim", "diğer gelir", "diger gelir",
}


def incele(aday: Candidate) -> list[str]:
    """Aday için inceleme sebeplerini döndürür (boşsa direkt kaydedilebilir)."""
    sebepler: list[str] = []

    esik = _ESIK.get(aday.tip, settings.REVIEW_TUTAR_KISISEL)
    if aday.tutar >= esik:
        sebepler.append(f"Tutar yüksek ({aday.tutar:,.0f} ₺ ≥ {esik:,.0f} ₺)")

    if not aday.emin:
        sebepler.append("AI bu kayıttan emin değil")

    if aday.kategori.lower().strip() in _DIGER_KATEGORILER:
        sebepler.append("Kategori belirsiz (\"Diğer\")")

    ac = aday.aciklama.lower().strip()
    if len(ac) < 3 or ac in _JENERIK_ACIKLAMALAR:
        sebepler.append("Açıklama çok genel")

    bugun = today()
    if aday.tarih > bugun:
        sebepler.append("Tarih gelecekte")
    elif aday.tarih < bugun - timedelta(days=90):
        sebepler.append("Tarih 90 günden eski")

    return sebepler


def inceleme_gerek(adaylar: list[Candidate]) -> bool:
    """Adaylardan herhangi biri incelenmeli mi? Her adayın sebepleri doldurulur.
    Birden fazla aday varsa (toplu giriş) her zaman onay istenir.
    """
    toplu = len(adaylar) > 1
    gerek = False
    for a in adaylar:
        a.inceleme_sebepleri = incele(a)
        if toplu and not a.inceleme_sebepleri:
            a.inceleme_sebepleri = ["Toplu giriş — gözden geçir"]
        if a.inceleme_sebepleri:
            gerek = True
    return gerek
