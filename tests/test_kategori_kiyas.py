from datetime import date

import pytest
from fastapi.testclient import TestClient

from api.auth import current_user
from api.main import app
from api.routes import summary as rota
from core.models import Transaction
from core.summary import aylik_trend, degisim, kategori_karsilastir, onceki_aralik


def _tx(tutar, g, kat="Faturalar", direction="gider"):
    return Transaction(
        id="x", user_id="u1", direction=direction, tip="kisisel", kategori=kat,
        aciklama="a", tutar=tutar, para_birimi="TRY", tarih=g, kaynak="t",
    )


@pytest.fixture
def client():
    app.dependency_overrides[current_user] = lambda: "u1"
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_onceki_aralik_takvim_ayi_ve_serbest():
    assert onceki_aralik(date(2026, 11, 1), date(2026, 11, 30)) == (date(2026, 10, 1), date(2026, 10, 31))
    assert onceki_aralik(date(2026, 3, 1), date(2026, 3, 31)) == (date(2026, 2, 1), date(2026, 2, 28))
    assert onceki_aralik(date(2026, 1, 1), date(2026, 12, 31)) == (date(2025, 1, 1), date(2025, 12, 31))
    assert onceki_aralik(date(2026, 7, 1), date(2026, 9, 30)) == (date(2026, 4, 1), date(2026, 6, 30))
    # serbest aralık: hemen önceki aynı uzunlukta pencere
    assert onceki_aralik(date(2026, 11, 5), date(2026, 11, 14)) == (date(2026, 10, 26), date(2026, 11, 4))


def test_degisim():
    assert degisim(111, 100) == 11.0
    assert degisim(89, 100) == -11.0
    assert degisim(50, 0) is None


def test_kategori_karsilastir_kaybolan_kategori_de_listelenir():
    bu = [_tx(1110, date(2026, 11, 3)), _tx(500, date(2026, 11, 4), "Market")]
    onceki = [_tx(1000, date(2026, 10, 3)), _tx(300, date(2026, 10, 9), "Kafe")]
    r = kategori_karsilastir(bu, onceki, "gider")
    k = {x["kategori"]: x for x in r["kategoriler"]}
    assert k["Faturalar"]["degisim"] == 11.0
    assert k["Market"]["degisim"] is None  # önceki dönemde yoktu
    assert k["Kafe"]["tutar"] == 0 and k["Kafe"]["degisim"] == -100.0
    assert r["toplam"] == 1610 and r["onceki_toplam"] == 1300


def test_aylik_trend_bos_aylar_sifir():
    txs = [_tx(100, date(2026, 9, 2)), _tx(150, date(2026, 11, 2))]
    t = aylik_trend(txs, date(2026, 11, 30), 3)
    assert [x["ay"] for x in t] == ["2026-09", "2026-10", "2026-11"]
    assert [x["tutar"] for x in t] == [100, 0, 150]
    assert t[0]["degisim"] is None and t[1]["degisim"] == -100.0 and t[2]["degisim"] is None


def test_kategoriler_ucu(client, monkeypatch):
    async def kapsam(uid):
        return "u1"

    async def list_period(ids, bas, bit, **kw):
        if bas.month == 11:
            return [_tx(1110, date(2026, 11, 3)), _tx(5000, date(2026, 11, 1), "Maaş", "gelir")]
        return [_tx(1000, date(2026, 10, 3))]

    monkeypatch.setattr(rota.deps, "kapsam", kapsam)
    monkeypatch.setattr(rota.repo, "list_period", list_period)
    r = client.get("/v1/summary/kategoriler?bas=2026-11-01&bit=2026-11-30")
    assert r.status_code == 200, r.text
    j = r.json()
    assert j["onceki_baslangic"] == "2026-10-01"
    assert j["gider"]["kategoriler"][0]["degisim"] == 11.0
    assert j["gelir"]["toplam"] == 5000

    assert client.get("/v1/summary/kategoriler?bas=2026-11-30&bit=2026-11-01").status_code == 422
    assert client.get("/v1/summary/kategoriler?bas=2023-01-01&bit=2026-11-01").status_code == 422


def test_kategori_trend_ucu(client, monkeypatch):
    alinan = {}

    async def kapsam(uid):
        return "u1"

    async def list_period(ids, bas, bit, **kw):
        alinan.update(kw, bas=bas, bit=bit)
        return [_tx(200, date(2026, 10, 3)), _tx(222, date(2026, 11, 3))]

    monkeypatch.setattr(rota.deps, "kapsam", kapsam)
    monkeypatch.setattr(rota.repo, "list_period", list_period)
    r = client.get("/v1/summary/kategori-trend?kategori=Faturalar&aylar=6&ref=2026-11-12")
    assert r.status_code == 200, r.text
    j = r.json()
    assert alinan["kategoriler"] == ["Faturalar"] and alinan["direction"] == "gider"
    assert alinan["bas"] == date(2026, 6, 1)
    assert len(j["aylar"]) == 6 and j["aylar"][-1] == {"ay": "2026-11", "tutar": 222.0, "adet": 1, "degisim": 11.0}


def test_ayni_ad_farkli_bolum_tek_satir():
    """Kişisel + işletme "Diğer" tek satırda birleşir; önceki dönem bir kez sayılır."""
    bu = [_tx(100, date(2026, 11, 3), "Diğer"), _tx(50, date(2026, 11, 4), "Diğer")]
    bu[1].tip = "isletme"
    onceki = [_tx(100, date(2026, 10, 3), "Diğer")]
    r = kategori_karsilastir(bu, onceki, "gider")
    assert len(r["kategoriler"]) == 1
    k = r["kategoriler"][0]
    assert k["tutar"] == 150 and k["adet"] == 2 and k["onceki_tutar"] == 100 and k["degisim"] == 50.0
