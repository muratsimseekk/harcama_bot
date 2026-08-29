from datetime import date

from core.models import Budget, Transaction
from core.summary import hedef_ilerleme, yatirim_ilerleme


def _tx(tutar, tip="kisisel", kategori="Kafe/Restoran", direction="gider"):
    return Transaction(
        id="x", user_id="u", direction=direction, tip=tip, kategori=kategori,
        aciklama="a", tutar=tutar, para_birimi="TRY", tarih=date(2026, 8, 10), kaynak="t",
    )


def _b(kapsam, deger, limit):
    return Budget(id="b", user_id="u", kapsam=kapsam, kapsam_deger=deger, limit_amount=limit)


def test_genel_ve_kategori_ilerleme():
    txs = [_tx(3000, kategori="Kafe/Restoran"), _tx(1000, kategori="Market"), _tx(6000, tip="yatirim", kategori="Hisse")]
    hedefler = hedef_ilerleme(txs, [
        _b("genel", None, 20000),
        _b("kategori", "Kafe/Restoran", 10000),
    ])
    genel = next(h for h in hedefler if h.kapsam == "genel")
    assert genel.harcanan == 10000.0
    assert genel.oran == 50.0
    assert genel.durum == "iyi"
    kafe = next(h for h in hedefler if h.kapsam_deger == "Kafe/Restoran")
    assert kafe.harcanan == 3000.0
    assert kafe.kalan == 7000.0


def test_yaklasti_ve_asti():
    txs = [_tx(8500, kategori="Kafe/Restoran")]
    (h,) = hedef_ilerleme(txs, [_b("kategori", "Kafe/Restoran", 10000)])
    assert h.durum == "yaklasti" and h.oran == 85.0

    txs2 = [_tx(12000, kategori="Kafe/Restoran")]
    (h2,) = hedef_ilerleme(txs2, [_b("kategori", "Kafe/Restoran", 10000)])
    assert h2.durum == "asti" and h2.kalan == -2000.0


def test_yatirim_ilerleme():
    txs = [_tx(12000, tip="yatirim", kategori="Hisse"), _tx(500, tip="kisisel")]
    y = yatirim_ilerleme(txs, 30000)
    assert y["birikmis"] == 12000.0
    assert y["kalan"] == 18000.0
    assert y["oran"] == 40.0
