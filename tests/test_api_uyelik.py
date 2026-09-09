import pytest
from fastapi.testclient import TestClient

from api.main import app
from api.routes import uyelik as rota


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(rota.settings, "RC_WEBHOOK_SECRET", "")  # test'te auth kapalı
    return TestClient(app)


def test_webhook_satin_alma_pro_yapar(client, monkeypatch):
    yak = {}

    async def guncelle(uid, plan, plan_bitis):
        yak["v"] = (uid, plan, plan_bitis)

    monkeypatch.setattr(rota.repo, "profil_plan_guncelle", guncelle)
    r = client.post("/v1/rc/webhook", json={"event": {
        "type": "INITIAL_PURCHASE", "app_user_id": "u1",
        "product_id": "pro_aylik", "entitlement_ids": ["pro"],
        "expiration_at_ms": 1800000000000,
    }})
    assert r.status_code == 200
    assert yak["v"][0] == "u1" and yak["v"][1] == "pro" and yak["v"][2] is not None


def test_webhook_entitlement_base(client, monkeypatch):
    yak = {}

    async def guncelle(uid, plan, plan_bitis):
        yak["v"] = (uid, plan, plan_bitis)

    monkeypatch.setattr(rota.repo, "profil_plan_guncelle", guncelle)
    # product_id bilinmese bile entitlement_ids belirleyici
    r = client.post("/v1/rc/webhook", json={"event": {
        "type": "RENEWAL", "app_user_id": "u2",
        "product_id": "bilinmeyen", "entitlement_ids": ["base"],
    }})
    assert r.status_code == 200
    assert yak["v"][1] == "base"


def test_webhook_secret_bearer_opsiyonel(client, monkeypatch):
    monkeypatch.setattr(rota.settings, "RC_WEBHOOK_SECRET", "gizli")

    async def guncelle(uid, plan, plan_bitis):
        pass
    monkeypatch.setattr(rota.repo, "profil_plan_guncelle", guncelle)

    # "Bearer gizli" ve düz "gizli" ikisi de kabul
    for header in ("Bearer gizli", "gizli"):
        r = client.post("/v1/rc/webhook", json={"event": {
            "type": "INITIAL_PURCHASE", "app_user_id": "u1", "entitlement_ids": ["pro"],
        }}, headers={"Authorization": header})
        assert r.status_code == 200


def test_webhook_expiration_base_yapar(client, monkeypatch):
    yak = {}

    async def guncelle(uid, plan, plan_bitis):
        yak["v"] = (uid, plan, plan_bitis)

    monkeypatch.setattr(rota.repo, "profil_plan_guncelle", guncelle)
    r = client.post("/v1/rc/webhook", json={"event": {
        "type": "EXPIRATION", "app_user_id": "u1", "product_id": "pro_aylik",
    }})
    assert r.status_code == 200
    assert yak["v"] == ("u1", "base", None)


def test_webhook_yanlis_secret_401(client, monkeypatch):
    monkeypatch.setattr(rota.settings, "RC_WEBHOOK_SECRET", "gizli")
    r = client.post("/v1/rc/webhook", json={"event": {}}, headers={"Authorization": "Bearer yanlis"})
    assert r.status_code == 401
