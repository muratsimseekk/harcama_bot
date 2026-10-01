"""Kullanıcıya asla ham teknik/İngilizce hata gitmemeli (api/main.py hata yakalayıcıları)."""
import pytest
from fastapi.testclient import TestClient

from api.auth import current_user
from api.main import app
from api.routes import me as rota


@pytest.fixture
def client():
    app.dependency_overrides[current_user] = lambda: "u1"
    # raise_server_exceptions=False: gerçek sunucu gibi 500 yanıtını döndür
    yield TestClient(app, raise_server_exceptions=False)
    app.dependency_overrides.clear()


def test_beklenmeyen_hata_turkce_500(client, monkeypatch):
    async def patla(uid):
        raise RuntimeError("relation \"foo\" does not exist")
    monkeypatch.setattr(rota.repo, "kullanici_sil", patla)

    r = client.delete("/v1/me")
    assert r.status_code == 500
    detay = r.json()["detail"]
    assert "Lütfen" in detay
    assert "relation" not in detay and "Internal Server Error" not in r.text


def test_dogrulama_hatasi_turkce_422(client):
    r = client.post("/v1/ads/claim", json={})  # token alanı eksik
    assert r.status_code == 422
    assert r.json() == {"detail": "Gönderilen bilgiler eksik ya da hatalı."}
