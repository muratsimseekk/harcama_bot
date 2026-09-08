from datetime import date

import pytest
from fastapi.testclient import TestClient

from api.auth import current_user
from api.main import app
from api.routes import transactions as rota
from core.models import HaneUyelik, Transaction


@pytest.fixture
def client():
    app.dependency_overrides[current_user] = lambda: "u1"
    yield TestClient(app)
    app.dependency_overrides.clear()


def _tx(id="t1", user_id="u1", tutar=100.0):
    return Transaction(
        id=id, user_id=user_id, direction="gider", tip="kisisel", kategori="Market",
        aciklama="a", tutar=tutar, para_birimi="TRY", tarih=date(2026, 9, 1), kaynak="mobile",
    )


def _uyelik(rol="editor", hid="hh1"):
    return HaneUyelik(household_id=hid, ad="Ev", kod="ABC234", owner_id="u9", rol=rol)


def test_listele_hane_havuzu_ve_ekleyen(client, monkeypatch):
    from core.models import HaneUye

    async def uyelik(uid):
        return _uyelik()

    async def idler(hid):
        return ["u1", "u9"]

    async def uyeler(hid):
        return [HaneUye("u1", "Murat", "editor"), HaneUye("u9", "Ayşe", "owner")]

    async def recent(ids, n):
        assert set(ids) == {"u1", "u9"}  # havuzlu sorgu
        return [_tx("t1", "u1"), _tx("t2", "u9")]

    monkeypatch.setattr(rota.deps, "hane_uyeligi", uyelik)
    monkeypatch.setattr(rota.repo, "hane_uye_idleri", idler)
    monkeypatch.setattr(rota.repo, "hane_uyeleri", uyeler)
    monkeypatch.setattr(rota.repo, "list_recent", recent)

    r = client.get("/v1/transactions")
    assert r.status_code == 200
    j = r.json()
    kendi = next(x for x in j if x["id"] == "t1")
    digeri = next(x for x in j if x["id"] == "t2")
    assert kendi["ekleyen"] is None
    assert digeri["ekleyen"] == "Ayşe"


def test_sahiplik_kendi_kaydi(client, monkeypatch):
    async def get(tid):
        return _tx("t1", "u1")

    async def upd(tid, kolonlar):
        return _tx("t1", "u1", tutar=250.0)

    monkeypatch.setattr(rota.repo, "get", get)
    monkeypatch.setattr(rota.repo, "update", upd)
    r = client.patch("/v1/transactions/t1", json={"tutar": 250})
    assert r.status_code == 200 and r.json()["tutar"] == 250.0


def test_sahiplik_editor_baskasinin_kaydini_duzenler(client, monkeypatch):
    async def get(tid):
        return _tx("t9", "u9")

    async def uyelik(uid):
        return _uyelik(rol="editor") if uid == "u1" else _uyelik(rol="owner")

    async def upd(tid, kolonlar):
        return _tx("t9", "u9", tutar=300.0)

    monkeypatch.setattr(rota.repo, "get", get)
    monkeypatch.setattr(rota.deps, "hane_uyeligi", uyelik)
    monkeypatch.setattr(rota.repo, "update", upd)
    r = client.patch("/v1/transactions/t9", json={"tutar": 300})
    assert r.status_code == 200


def test_sahiplik_viewer_baskasinin_kaydinda_404(client, monkeypatch):
    async def get(tid):
        return _tx("t9", "u9")

    async def uyelik(uid):
        return _uyelik(rol="viewer") if uid == "u1" else _uyelik(rol="owner")

    monkeypatch.setattr(rota.repo, "get", get)
    monkeypatch.setattr(rota.deps, "hane_uyeligi", uyelik)
    r = client.patch("/v1/transactions/t9", json={"tutar": 300})
    assert r.status_code == 404


def test_sahiplik_baska_hane_404(client, monkeypatch):
    async def get(tid):
        return _tx("t9", "u9")

    async def uyelik(uid):
        if uid == "u1":
            return _uyelik(rol="editor", hid="hh1")
        return _uyelik(rol="owner", hid="hh2")  # farklı hane

    monkeypatch.setattr(rota.repo, "get", get)
    monkeypatch.setattr(rota.deps, "hane_uyeligi", uyelik)
    r = client.patch("/v1/transactions/t9", json={"tutar": 300})
    assert r.status_code == 404
