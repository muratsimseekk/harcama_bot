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


# ---- yatırım alt hedefleri ------------------------------------------------- #
@pytest.fixture
def hedef_deposu(monkeypatch):
    """goals tablosunun bellek içi taklidi: {tip: tutar}."""
    depo: dict[str, float] = {}

    async def upsert(uid, tutar, tip="yatirim"):
        depo[tip] = tutar
        return Goal(id=tip, user_id=uid, hedef_amount=tutar, tip=tip)

    async def sil(uid, tip="yatirim"):
        return depo.pop(tip, None) is not None

    async def liste(uid):
        return [Goal(id=t, user_id=uid, hedef_amount=v, tip=t) for t, v in depo.items()]

    monkeypatch.setattr(rota.repo, "goal_upsert", upsert)
    monkeypatch.setattr(rota.repo, "goal_delete", sil)
    monkeypatch.setattr(rota.repo, "goals_list", liste)
    return depo


def test_alt_hedefler_genel_hedefi_izler(client, hedef_deposu):
    client.put("/v1/goals", json={"hedef_amount": 2000, "kategori": "Altın/Döviz"})
    assert hedef_deposu == {"yatirim:Altın/Döviz": 2000, "yatirim": 2000}
    client.put("/v1/goals", json={"hedef_amount": 3000, "kategori": "Hisse Senedi"})
    assert hedef_deposu["yatirim"] == 5000
    client.put("/v1/goals", json={"hedef_amount": 1000, "kategori": "Hisse Senedi"})
    assert hedef_deposu["yatirim"] == 3000
    r = client.delete("/v1/goals", params={"kategori": "Altın/Döviz"})
    assert r.status_code == 200
    assert hedef_deposu == {"yatirim:Hisse Senedi": 1000, "yatirim": 1000}
    client.delete("/v1/goals", params={"kategori": "Hisse Senedi"})
    assert hedef_deposu == {}  # uyumlu genel hedef de kalkar


def test_elle_konan_genel_hedef_korunur(client, hedef_deposu):
    client.put("/v1/goals", json={"hedef_amount": 10000})  # genel, alt hedef yok
    client.put("/v1/goals", json={"hedef_amount": 2000, "kategori": "Altın/Döviz"})
    # kullanıcı bilerek 10.000 koymuştu → değişmez, fark uygulamada gösterilir
    assert hedef_deposu["yatirim"] == 10000


def test_yatirim_ilerleme_alt_kategoriler():
    from datetime import date

    from core.models import Transaction
    from core.summary import yatirim_ilerleme

    def tx(kat, tutar):
        return Transaction(
            id=kat, user_id="u1", direction="gider", tip="yatirim", kategori=kat,
            aciklama="", tutar=tutar, para_birimi="TRY", tarih=date.today(), kaynak="test",
        )

    y = yatirim_ilerleme([tx("Altın/Döviz", 500), tx("Hisse Senedi", 1500)], 4000,
                         {"Altın/Döviz": 1000, "Kripto Para": 500})
    assert y["birikmis"] == 2000 and y["alt_toplam"] == 1500
    assert y["kategoriler"][0] == {"kategori": "Altın/Döviz", "hedef": 1000, "birikmis": 500,
                                   "kalan": 500, "oran": 50.0}
    assert y["kategoriler"][1]["birikmis"] == 0
