"""Kayıt açıklamasının ilk harfi büyük kaydedilir (Türkçe i/ı dahil)."""
from datetime import date

import pytest

from api.schemas import AdayModel, IslemGuncelleIstek, bas_harf_buyuk


@pytest.mark.parametrize(
    "girdi, beklenen",
    [
        ("market 250", "Market 250"),
        ("iade", "İade"),
        ("ıspanak", "Ispanak"),
        ("çay", "Çay"),
        ("şeker", "Şeker"),
        ("ödeme", "Ödeme"),
        ("  kahve ", "Kahve"),
        ("Kira", "Kira"),
        ("3 mayıs kira", "3 mayıs kira"),
        ("eBay siparişi", "eBay siparişi"),
        ("iPhone kılıfı", "iPhone kılıfı"),
        ("ipek eşarp", "İpek eşarp"),
        ("", ""),
    ],
)
def test_bas_harf_buyuk(girdi, beklenen):
    assert bas_harf_buyuk(girdi) == beklenen


def test_aday_ve_guncelleme_modeli():
    aday = AdayModel(aciklama="ilaç", tutar=10, kategori="Sağlık", tarih=date(2026, 10, 9))
    assert aday.aciklama == "İlaç"
    assert IslemGuncelleIstek(aciklama="ilaç").aciklama == "İlaç"
    assert IslemGuncelleIstek(tutar=5).kolonlar() == {"amount": 5.0}
