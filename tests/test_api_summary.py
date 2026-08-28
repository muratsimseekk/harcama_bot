from datetime import date

import pytest
from fastapi.testclient import TestClient

from api.auth import current_user
from api.main import app
from api.routes import summary as rota
from core.models import Transaction


@pytest.fixture
def client():
    app.dependency_overrides[current_user] = lambda: "u1"
    yield TestClient(app)
    app.dependency_overrides.clear()


def _tx(tutar, gun, tip="kisisel", direction="gider"):
    return Transaction(
        id="x", user_id="u1", direction=direction, tip=tip, kategori="Market",
        aciklama="a", tutar=tutar, para_birimi="TRY", tarih=date(2026, 8, gun), kaynak="t",
    )


def test_summary_ay_ve_onceki(client, monkeypatch):
    async def list_period(uid, bas, bit, *, direction=None, tip=None):
        if bas.month == 8:
            return [_tx(100, 5), _tx(300, 6)]
        return [_tx(1000, 10)]  # temmuz (önceki)

    monkeypatch.setattr(rota.repo, "list_period", list_period)

    r = client.get("/v1/summary?period=month&ref=2026-08-15")
    assert r.status_code == 200
    j = r.json()
    assert j["period"] == "month"
    assert j["etiket"] == "Ağustos 2026"
    assert j["baslangic"] == "2026-08-01"
    assert j["bu_donem"]["toplam_gider"] == 400.0
    assert j["onceki"]["toplam_gider"] == 1000.0


def test_summary_gecersiz_period_422(client):
    r = client.get("/v1/summary?period=decade")
    assert r.status_code == 422


def test_summary_bos_donem(client, monkeypatch):
    async def bos(*a, **k):
        return []

    monkeypatch.setattr(rota.repo, "list_period", bos)
    r = client.get("/v1/summary?period=week")
    assert r.status_code == 200
    assert r.json()["bu_donem"]["adet"] == 0
