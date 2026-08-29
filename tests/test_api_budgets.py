import pytest
from fastapi.testclient import TestClient

from api.auth import current_user
from api.main import app
from api.routes import budgets as rota
from core.models import Budget, Goal


@pytest.fixture
def client():
    app.dependency_overrides[current_user] = lambda: "u1"
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_butce_ayarla_ve_listele(client, monkeypatch):
    kayit = {}

    async def upsert(uid, kapsam, deger, limit):
        kayit.update(kapsam=kapsam, deger=deger, limit=limit)
        return Budget(id="b1", user_id=uid, kapsam=kapsam, kapsam_deger=deger, limit_amount=limit)

    async def liste(uid):
        return [Budget(id="b1", user_id=uid, kapsam="kategori", kapsam_deger="Kafe/Restoran", limit_amount=10000)]

    monkeypatch.setattr(rota.repo, "budget_upsert", upsert)
    monkeypatch.setattr(rota.repo, "budgets_list", liste)

    r = client.put("/v1/budgets", json={"kapsam": "kategori", "kapsam_deger": "Kafe/Restoran", "limit_amount": 10000})
    assert r.status_code == 200
    assert kayit == {"kapsam": "kategori", "deger": "Kafe/Restoran", "limit": 10000.0}

    r = client.get("/v1/budgets")
    assert r.json()[0]["kapsam_deger"] == "Kafe/Restoran"


def test_butce_kapsam_deger_zorunlu(client):
    r = client.put("/v1/budgets", json={"kapsam": "kategori", "limit_amount": 5000})
    assert r.status_code == 400


def test_genel_butce_deger_null(client, monkeypatch):
    async def upsert(uid, kapsam, deger, limit):
        assert deger is None
        return Budget(id="b", user_id=uid, kapsam=kapsam, kapsam_deger=None, limit_amount=limit)

    monkeypatch.setattr(rota.repo, "budget_upsert", upsert)
    r = client.put("/v1/budgets", json={"kapsam": "genel", "kapsam_deger": "yoksay", "limit_amount": 20000})
    assert r.status_code == 200


def test_hedef_ayarla_getir(client, monkeypatch):
    async def upsert(uid, tutar, tip):
        return Goal(id="g1", user_id=uid, hedef_amount=tutar, tip=tip)

    async def getir(uid, tip):
        return Goal(id="g1", user_id=uid, hedef_amount=30000, tip="yatirim")

    monkeypatch.setattr(rota.repo, "goal_upsert", upsert)
    monkeypatch.setattr(rota.repo, "goal_get", getir)

    r = client.put("/v1/goals", json={"hedef_amount": 30000})
    assert r.status_code == 200 and r.json()["hedef_amount"] == 30000.0
    r = client.get("/v1/goals")
    assert r.json()["hedef_amount"] == 30000.0
