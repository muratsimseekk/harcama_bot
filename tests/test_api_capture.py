import pytest
from fastapi.testclient import TestClient

from api import usage
from api.auth import current_user
from api.main import app
from api.routes import capture, transactions
from core.models import Candidate


def _aday(aciklama="kahve", tutar=90.0, kategori="Kafe/Restoran", tip="kisisel"):
    return Candidate(aciklama=aciklama, tutar=tutar, kategori=kategori, tip=tip)


@pytest.fixture
def client(monkeypatch):
    app.dependency_overrides[current_user] = lambda: "test-user"
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_auth_yok_401():
    c = TestClient(app)
    r = c.post("/v1/capture", data={"text": "kahve 90"})
    assert r.status_code == 401


def test_capture_tekli_dusuk_tutar(client, monkeypatch):
    async def fake_parse(metin, *, kaynak="x"):
        return [_aday()]
    monkeypatch.setattr(capture, "parse_transactions", fake_parse)

    r = client.post("/v1/capture", data={"text": "kahve 90"})
    assert r.status_code == 200
    j = r.json()
    assert len(j["candidates"]) == 1
    assert j["needs_review"] is False
    assert j["candidates"][0]["tutar"] == 90.0


def test_capture_yuksek_tutar_onay_ister(client, monkeypatch):
    async def fake_parse(metin, *, kaynak="x"):
        return [_aday(aciklama="danışmanlık", tutar=40000, kategori="Diğer İşletme", tip="isletme")]
    monkeypatch.setattr(capture, "parse_transactions", fake_parse)

    r = client.post("/v1/capture", data={"text": "danışmanlık 40000"})
    j = r.json()
    assert j["needs_review"] is True
    assert any("yüksek" in s.lower() for s in j["candidates"][0]["inceleme_sebepleri"])


def test_capture_bos_sonuc(client, monkeypatch):
    async def fake_parse(metin, *, kaynak="x"):
        return []
    monkeypatch.setattr(capture, "parse_transactions", fake_parse)

    r = client.post("/v1/capture", data={"text": "bugün hava güzel"})
    assert r.status_code == 200
    assert r.json() == {"candidates": [], "needs_review": False, "transcript": None}


def test_capture_girdi_yok_400(client):
    r = client.post("/v1/capture", data={})
    assert r.status_code == 400


def test_capture_ai_hata_503(client, monkeypatch):
    async def patlat(metin, *, kaynak="x"):
        raise RuntimeError("groq down")
    monkeypatch.setattr(capture, "parse_transactions", patlat)

    r = client.post("/v1/capture", data={"text": "kahve 90"})
    assert r.status_code == 503


def test_transactions_olustur_limit_asimi_402(client, monkeypatch):
    async def fake_plan(uid):
        return "free"
    async def fake_sayac(uid):
        return 50
    monkeypatch.setattr(usage, "plan", fake_plan)
    monkeypatch.setattr(usage, "ay_kayit_sayisi", fake_sayac)
    monkeypatch.setattr(transactions.settings, "FREE_AYLIK_LIMIT", 50)

    r = client.post("/v1/transactions", json={"candidates": [{
        "aciklama": "kahve", "tutar": 90, "kategori": "Kafe/Restoran", "tarih": "2026-08-28"
    }]})
    assert r.status_code == 402


def test_transactions_olustur_basarili(client, monkeypatch):
    from core.models import Transaction

    async def fake_plan(uid):
        return "pro"
    async def fake_add_many(adaylar, uid):
        return [Transaction(
            id="tx1", user_id=uid, direction=a.direction, tip=a.tip, kategori=a.kategori,
            aciklama=a.aciklama, tutar=a.tutar, para_birimi="TRY", tarih=a.tarih, kaynak="mobile",
        ) for a in adaylar]
    monkeypatch.setattr(usage, "plan", fake_plan)
    monkeypatch.setattr(transactions.repo, "add_many", fake_add_many)

    r = client.post("/v1/transactions", json={"candidates": [{
        "aciklama": "kahve", "tutar": 90, "kategori": "Kafe/Restoran", "tarih": "2026-08-28"
    }]})
    assert r.status_code == 201
    assert r.json()[0]["id"] == "tx1"
