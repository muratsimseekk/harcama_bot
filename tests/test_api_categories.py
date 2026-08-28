import pytest
from fastapi.testclient import TestClient

from api.auth import current_user
from api.main import app
from api.routes import categories as rota
from core.models import Category


@pytest.fixture
def client():
    app.dependency_overrides[current_user] = lambda: "u1"
    yield TestClient(app)
    app.dependency_overrides.clear()


def _cat(id="c1", name="Market", tip="kisisel", user_id="u1"):
    return Category(id=id, user_id=user_id, name=name, tip=tip, color="#111")


def test_listele_bos_ise_seed_calisir(client, monkeypatch):
    cagrildi = {"seed": 0}

    async def bos_liste(uid, *, only_active=False):
        return [] if cagrildi["seed"] == 0 else [_cat()]

    async def seed(uid):
        cagrildi["seed"] = 1
        return 20

    monkeypatch.setattr(rota.repo, "categories_list", bos_liste)
    monkeypatch.setattr(rota.repo, "categories_seed", seed)

    r = client.get("/v1/categories")
    assert r.status_code == 200
    assert cagrildi["seed"] == 1
    assert r.json()[0]["name"] == "Market"


def test_olustur(client, monkeypatch):
    async def create(uid, name, tip, color, keywords):
        return _cat(name=name, tip=tip)

    monkeypatch.setattr(rota.repo, "category_create", create)
    r = client.post("/v1/categories", json={"name": "Kahve", "tip": "kisisel"})
    assert r.status_code == 201
    assert r.json()["name"] == "Kahve"


def test_olustur_cakisma_409(client, monkeypatch):
    async def create(*a, **k):
        raise Exception("duplicate key")

    monkeypatch.setattr(rota.repo, "category_create", create)
    r = client.post("/v1/categories", json={"name": "Market", "tip": "kisisel"})
    assert r.status_code == 409


def test_guncelle_baskasinin_kategorisi_404(client, monkeypatch):
    async def get(cid):
        return _cat(user_id="baska")

    monkeypatch.setattr(rota.repo, "category_get", get)
    r = client.patch("/v1/categories/c1", json={"name": "Yeni"})
    assert r.status_code == 404


def test_sil(client, monkeypatch):
    async def get(cid):
        return _cat()

    async def dele(cid):
        return True

    monkeypatch.setattr(rota.repo, "category_get", get)
    monkeypatch.setattr(rota.repo, "category_delete", dele)
    r = client.request("DELETE", "/v1/categories/c1")
    assert r.status_code == 200 and r.json() == {"silindi": True}
