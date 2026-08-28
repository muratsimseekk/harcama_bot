from datetime import date

from core.dates import (
    donem_araligi,
    donem_etiket,
    donem_kaydir,
    hafta_araligi,
    yil_araligi,
)


def test_hafta_araligi_pazartesi_pazar():
    # 2026-08-28 Cuma
    b, s = hafta_araligi(date(2026, 8, 28))
    assert b == date(2026, 8, 24)  # Pazartesi
    assert s == date(2026, 8, 30)  # Pazar


def test_ay_araligi():
    b, s = donem_araligi("month", date(2026, 2, 15))
    assert b == date(2026, 2, 1)
    assert s == date(2026, 2, 28)


def test_yil_araligi():
    assert yil_araligi(date(2026, 7, 1)) == (date(2026, 1, 1), date(2026, 12, 31))


def test_donem_kaydir_ay_yil_gecisi():
    assert donem_kaydir("month", date(2026, 1, 10), -1) == date(2025, 12, 1)
    assert donem_kaydir("month", date(2026, 12, 10), 1) == date(2027, 1, 1)
    assert donem_kaydir("week", date(2026, 8, 28), -1) == date(2026, 8, 21)
    assert donem_kaydir("year", date(2026, 8, 28), -1) == date(2025, 1, 1)


def test_donem_etiket():
    assert donem_etiket("month", date(2026, 8, 1)) == "Ağustos 2026"
    assert donem_etiket("year", date(2026, 8, 1)) == "2026"
    assert "Ağustos" in donem_etiket("week", date(2026, 8, 28))
