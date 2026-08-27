from datetime import date

from core.dates import ay_coz, now, tarih_parse, tarih_str, turkce_tutar


def test_now_is_istanbul_tz():
    assert now().tzinfo is not None
    assert "Istanbul" in str(now().tzinfo)


def test_tarih_parse_formats():
    assert tarih_parse("02.05.2026") == date(2026, 5, 2)
    assert tarih_parse("2026-05-02") == date(2026, 5, 2)


def test_tarih_parse_bozuk_bugun_doner():
    assert tarih_parse("saçma") == now().date()


def test_tarih_str_roundtrip():
    d = date(2026, 8, 28)
    assert tarih_parse(tarih_str(d)) == d


def test_ay_coz_gecen_ay_yil_donusu():
    assert ay_coz("geçen ay", date(2026, 1, 15)) == (12, 2025)
    assert ay_coz("bu ay", date(2026, 8, 28)) == (8, 2026)
    assert ay_coz("Nisan", date(2026, 8, 28)) == (4, 2026)
    assert ay_coz("nisan 2025", date(2026, 8, 28)) == (4, 2025)


def test_turkce_tutar():
    assert turkce_tutar(1234567.5) == "1.234.567,50"
    assert turkce_tutar(90) == "90,00"
