from datetime import timedelta

from core.dates import today
from core.models import Candidate
from core.review import incele, inceleme_gerek


def _aday(**kw) -> Candidate:
    base = dict(aciklama="kahve", tutar=90.0, kategori="Kafe/Restoran", tip="kisisel")
    base.update(kw)
    return Candidate(tarih=today(), **base)


def test_temiz_aday_inceleme_gerektirmez():
    assert incele(_aday()) == []
    assert inceleme_gerek([_aday()]) is False


def test_yuksek_tutar_inceleme():
    sebepler = incele(_aday(tutar=40000, tip="kisisel"))
    assert any("yüksek" in s.lower() for s in sebepler)


def test_emin_degil_inceleme():
    assert any("emin" in s.lower() for s in incele(_aday(emin=False)))


def test_diger_kategori_inceleme():
    assert any("belirsiz" in s.lower() for s in incele(_aday(kategori="Diğer")))


def test_bos_kategori_inceleme():
    assert any("seçilmedi" in s.lower() for s in incele(_aday(kategori="")))


def test_genel_aciklama_inceleme():
    assert any("genel" in s.lower() for s in incele(_aday(aciklama="ödeme")))


def test_eski_tarih_inceleme():
    a = _aday()
    a.tarih = today() - timedelta(days=120)
    assert any("eski" in s.lower() for s in incele(a))


def test_gelecek_tarih_inceleme():
    a = _aday()
    a.tarih = today() + timedelta(days=2)
    assert any("gelecek" in s.lower() for s in incele(a))


def test_toplu_giris_her_zaman_onay():
    adaylar = [_aday(), _aday(aciklama="simit", tutar=20, kategori="Market")]
    assert inceleme_gerek(adaylar) is True
    assert all(a.inceleme_sebepleri for a in adaylar)
