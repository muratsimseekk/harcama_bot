"""Tekrarlayan kayıt kuralı → vadesi gelen tarihler. Saf fonksiyon — I/O yok."""
from __future__ import annotations

import calendar
from datetime import date

EN_COK_TELAFI = 12  # uzun süre açılmayan uygulamada en çok 12 aylık birikmiş kayıt eklenir


def ay_gunu(yil: int, ay: int, gun: int) -> date:
    """31'i olmayan ayda ayın son günü (31 → 30 Nisan, 28/29 Şubat)."""
    return date(yil, ay, min(gun, calendar.monthrange(yil, ay)[1]))


def vadesi_gelenler(gun: int, baslangic: date, son_eklenen: date | None, bugun: date) -> list[date]:
    """Henüz eklenmemiş ve günü gelmiş (bugün dahil) tarihler, eskiden yeniye."""
    ref = son_eklenen or baslangic
    yil, ay = ref.year, ref.month
    sonuc: list[date] = []
    while True:
        t = ay_gunu(yil, ay, gun)
        if t > bugun:
            break
        if t >= baslangic and (son_eklenen is None or t > son_eklenen):
            sonuc.append(t)
        ay += 1
        if ay > 12:
            yil, ay = yil + 1, 1
    return sonuc[-EN_COK_TELAFI:]


def sonraki_tarih(gun: int, baslangic: date, son_eklenen: date | None, bugun: date) -> date:
    """Bir sonraki ekleneceği gün (listede "sonraki: 1 Aralık" göstermek için)."""
    ref = max(bugun, baslangic)
    yil, ay = ref.year, ref.month
    for _ in range(14):
        t = ay_gunu(yil, ay, gun)
        if t >= baslangic and t > bugun and (son_eklenen is None or t > son_eklenen):
            return t
        ay += 1
        if ay > 12:
            yil, ay = yil + 1, 1
    return ay_gunu(yil, ay, gun)
