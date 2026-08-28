from datetime import date

from core.models import Transaction
from core.summary import ozetle


def _tx(tutar, tip="kisisel", kategori="Market", direction="gider", gun=15):
    return Transaction(
        id="x", user_id="u", direction=direction, tip=tip, kategori=kategori,
        aciklama="a", tutar=tutar, para_birimi="TRY", tarih=date(2026, 8, gun), kaynak="t",
    )


def test_bos():
    o = ozetle([])
    assert o.toplam_gider == 0 and o.adet == 0 and o.tip_kirilim == []


def test_tip_ve_kategori_kirilim():
    txs = [
        _tx(100, "kisisel", "Market"),
        _tx(300, "kisisel", "Market"),
        _tx(600, "isletme", "Kira"),
        _tx(1000, "yatirim", "Altın/Döviz"),
    ]
    o = ozetle(txs)
    assert o.toplam_gider == 2000.0
    assert o.adet == 4
    # en büyük tip yatırım (1000)
    assert o.tip_kirilim[0].tip == "yatirim"
    assert o.tip_kirilim[0].oran == 50.0
    kis = next(k for k in o.tip_kirilim if k.tip == "kisisel")
    assert kis.tutar == 400.0 and kis.adet == 2
    # kategori: Market 400 tek satır
    market = next(k for k in o.kategori_kirilim if k.kategori == "Market")
    assert market.tutar == 400.0 and market.adet == 2


def test_gelir_net_ve_gunluk():
    txs = [
        _tx(200, direction="gider", gun=10),
        _tx(5000, direction="gelir", kategori="Maaş", gun=10),
        _tx(300, direction="gider", gun=12),
    ]
    o = ozetle(txs)
    assert o.toplam_gelir == 5000.0
    assert o.toplam_gider == 500.0
    assert o.net == 4500.0
    # gelir kategori kırılımına girmez (yalnız gider)
    assert all(k.kategori != "Maaş" for k in o.kategori_kirilim)
    assert len(o.gunluk) == 2
    g10 = next(g for g in o.gunluk if g.tarih == date(2026, 8, 10))
    assert g10.gider == 200.0 and g10.gelir == 5000.0
