import pytest
from fastapi.testclient import TestClient

from api import usage
from api.auth import current_user
from api.main import app
from api.routes import me as rota


@pytest.fixture
def client():
    app.dependency_overrides[current_user] = lambda: "u1"
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_me_plan_alanlari(client, monkeypatch):
    from api.usage import PlanDurum

    async def durum(uid):
        return PlanDurum(ham="trial", etkin="pro", trial_bitis=None, ai_limit=10**9)
    async def sayac(uid):
        return 3
    async def toplam(uid):
        return 40
    async def garanti(uid):
        return None

    monkeypatch.setattr(usage, "plan_durum", durum)
    monkeypatch.setattr(usage, "ay_kayit_sayisi", sayac)
    monkeypatch.setattr(usage, "toplam_kayit", toplam)
    monkeypatch.setattr(usage, "profil_garanti", garanti)

    j = client.get("/v1/me").json()
    assert j["plan"] == "pro" and j["ham_plan"] == "trial"
    assert j["ay_kayit"] == 3 and j["toplam_kayit"] == 40
    assert j["base_ai_limit"] == usage.settings.BASE_AI_AYLIK


def test_hesap_sil(client, monkeypatch):
    cagrildi = {}

    async def sil(uid):
        cagrildi["uid"] = uid

    monkeypatch.setattr(rota.repo, "kullanici_sil", sil)
    r = client.request("DELETE", "/v1/me")
    assert r.status_code == 200
    assert r.json() == {"silindi": True}
    assert cagrildi["uid"] == "u1"
