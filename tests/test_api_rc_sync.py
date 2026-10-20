from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient

from api.auth import current_user
from api.main import app
from api.routes import uyelik as rota


@pytest.fixture
def client(monkeypatch):
    app.dependency_overrides[current_user] = lambda: "u1"
    yazilan = {}

    async def guncelle(user_id, plan, plan_bitis):
        yazilan.update(user_id=user_id, plan=plan, plan_bitis=plan_bitis)

    async def plan(user_id):
        return yazilan.get("plan", "free")

    monkeypatch.setattr(rota.repo, "profil_plan_guncelle", guncelle)
    monkeypatch.setattr(rota.usage, "plan", plan)
    monkeypatch.setattr(rota.settings, "RC_SECRET_API_KEY", "sk_test")
    yield TestClient(app), yazilan
    app.dependency_overrides.clear()


def _iso(dt):
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def test_aktif_pro_profili_gunceller(client, monkeypatch):
    c, yazilan = client
    bitis = datetime.now(UTC) + timedelta(days=30)
    monkeypatch.setattr(
        rota, "_rc_abone_oku", lambda uid: {"entitlements": {"pro": {"expires_date": _iso(bitis)}}}
    )
    r = c.post("/v1/rc/sync")
    assert r.json() == {"plan": "pro", "senkron": True}
    assert yazilan["user_id"] == "u1" and yazilan["plan_bitis"].startswith(bitis.date().isoformat())


def test_suresi_dolmus_pro_yukseltmez(client, monkeypatch):
    c, yazilan = client
    eski = datetime.now(UTC) - timedelta(days=1)
    monkeypatch.setattr(
        rota, "_rc_abone_oku", lambda uid: {"entitlements": {"pro": {"expires_date": _iso(eski)}}}
    )
    assert c.post("/v1/rc/sync").json() == {"plan": "free", "senkron": True}
    assert yazilan == {}


def test_anahtar_yoksa_rc_cagrilmaz(client, monkeypatch):
    c, _ = client
    monkeypatch.setattr(rota.settings, "RC_SECRET_API_KEY", "")
    monkeypatch.setattr(rota, "_rc_abone_oku", lambda uid: pytest.fail("RC çağrılmamalı"))
    assert c.post("/v1/rc/sync").json() == {"plan": "free", "senkron": False}


def test_rc_hatasi_sessiz(client, monkeypatch):
    c, _ = client

    def patla(uid):
        raise RuntimeError("ağ")

    monkeypatch.setattr(rota, "_rc_abone_oku", patla)
    assert c.post("/v1/rc/sync").json() == {"plan": "free", "senkron": False}

