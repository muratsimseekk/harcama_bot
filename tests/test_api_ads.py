import pytest
from fastapi.testclient import TestClient

from api.auth import current_user
from api.main import app
from api.routes import reklam as rota
from core import admob_ssv


@pytest.fixture
def client():
    app.dependency_overrides[current_user] = lambda: "u1"
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_request_token_kullanici_dogrulanir(client, monkeypatch):
    monkeypatch.setattr(rota.settings, "ADS_TOKEN_SECRET", "test-sir")
    r = client.post("/v1/ads/request-token")
    assert r.status_code == 200
    token = r.json()["token"]
    assert admob_ssv.token_dogrula(token) == "u1"


def test_ssv_gecersiz_imza_kredi_vermez(client, monkeypatch):
    monkeypatch.setattr(rota.settings, "ADS_SSV_ONLY", True)
    monkeypatch.setattr(admob_ssv, "dogrula", lambda qs, p: False)
    verildi = {}

    async def ekle(**kw):
        verildi["v"] = kw
    monkeypatch.setattr(rota.repo, "ad_reward_ekle", ekle)

    r = client.get("/v1/ads/ssv", params={"transaction_id": "t1", "custom_data": "x"})
    assert r.status_code == 200
    assert "v" not in verildi


def test_ssv_gecerli_imza_kredi_verir(client, monkeypatch):
    monkeypatch.setattr(rota.settings, "ADS_SSV_ONLY", True)
    monkeypatch.setattr(rota.settings, "ADS_TOKEN_SECRET", "test-sir")
    monkeypatch.setattr(rota.settings, "AD_KREDI_ADET", 2)
    monkeypatch.setattr(admob_ssv, "dogrula", lambda qs, p: True)

    verildi = {}
    async def ekle(**kw):
        verildi["v"] = kw
    monkeypatch.setattr(rota.repo, "ad_reward_ekle", ekle)

    token = admob_ssv.token_uret("u1")
    r = client.get("/v1/ads/ssv", params={"transaction_id": "t1", "custom_data": token})
    assert r.status_code == 200
    # transaction_id kasıtlı olarak Google'ın "t1" değeri değil, bizim token'ımız —
    # /claim ile aynı idempotency anahtarını paylaşıp çifte kredi vermeyi engelliyor.
    assert verildi["v"] == {"user_id": "u1", "transaction_id": token, "credited_amount": 2}


def test_ssv_tavan_yok_her_zaman_kredi_verir(client, monkeypatch):
    """Reklam izleme sınırsız — kaç kez izlenirse izlensin kredi verilir (tavan kontrolü yok)."""
    monkeypatch.setattr(rota.settings, "ADS_SSV_ONLY", True)
    monkeypatch.setattr(rota.settings, "ADS_TOKEN_SECRET", "test-sir")
    monkeypatch.setattr(admob_ssv, "dogrula", lambda qs, p: True)

    verildi = []
    async def ekle(**kw):
        verildi.append(kw)
    monkeypatch.setattr(rota.repo, "ad_reward_ekle", ekle)

    token = admob_ssv.token_uret("u1")
    for i in range(10):
        r = client.get("/v1/ads/ssv", params={"transaction_id": f"t{i}", "custom_data": token})
        assert r.status_code == 200
    assert len(verildi) == 10


def test_claim_gecerli_token_kredi_verir(client, monkeypatch):
    monkeypatch.setattr(rota.settings, "ADS_TOKEN_SECRET", "test-sir")
    monkeypatch.setattr(rota.settings, "AD_KREDI_ADET", 2)

    verildi = {}
    async def ekle(**kw):
        verildi["v"] = kw
    monkeypatch.setattr(rota.repo, "ad_reward_ekle", ekle)

    token = admob_ssv.token_uret("u1")
    r = client.post("/v1/ads/claim", json={"token": token})
    assert r.status_code == 200
    assert r.json() == {"eklendi": True}
    assert verildi["v"] == {"user_id": "u1", "transaction_id": token, "credited_amount": 2}


def test_claim_bozuk_token_reddedilir(client, monkeypatch):
    monkeypatch.setattr(rota.settings, "ADS_TOKEN_SECRET", "test-sir")

    async def ekle(**kw):
        raise AssertionError("kredi verilmemeli")
    monkeypatch.setattr(rota.repo, "ad_reward_ekle", ekle)

    r = client.post("/v1/ads/claim", json={"token": "gecersiz"})
    assert r.status_code == 400


def test_claim_baska_kullanicinin_tokeni_reddedilir(client, monkeypatch):
    """u1 olarak giriş yapan biri, u2'ye ait bir token'la kredi çalamaz."""
    monkeypatch.setattr(rota.settings, "ADS_TOKEN_SECRET", "test-sir")

    async def ekle(**kw):
        raise AssertionError("kredi verilmemeli")
    monkeypatch.setattr(rota.repo, "ad_reward_ekle", ekle)

    token = admob_ssv.token_uret("u2")
    r = client.post("/v1/ads/claim", json={"token": token})
    assert r.status_code == 400


def test_token_uret_ve_dogrula_roundtrip(monkeypatch):
    monkeypatch.setattr(admob_ssv.settings, "ADS_TOKEN_SECRET", "gizli")
    token = admob_ssv.token_uret("u42")
    assert admob_ssv.token_dogrula(token) == "u42"


def test_token_dogrula_bozuk_imza_reddedilir(monkeypatch):
    monkeypatch.setattr(admob_ssv.settings, "ADS_TOKEN_SECRET", "gizli")
    token = admob_ssv.token_uret("u42")
    bozuk = token[:-2] + "xx"
    assert admob_ssv.token_dogrula(bozuk) is None


def test_token_dogrula_suresi_gecmis_reddedilir(monkeypatch):
    monkeypatch.setattr(admob_ssv.settings, "ADS_TOKEN_SECRET", "gizli")
    monkeypatch.setattr(admob_ssv.time, "time", lambda: 1_000_000)
    token = admob_ssv.token_uret("u42")
    monkeypatch.setattr(admob_ssv.time, "time", lambda: 1_000_000 + 700)  # TTL 600 sn
    assert admob_ssv.token_dogrula(token) is None
