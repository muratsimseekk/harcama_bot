from fastapi.testclient import TestClient

from api.main import app


def test_surum_herkese_acik(monkeypatch):
    from api.routes import surum

    monkeypatch.setattr(surum.settings, "ANDROID_SON_SURUM", 6)
    r = TestClient(app).get("/v1/surum")
    assert r.status_code == 200 and r.json() == {"android": 6, "ios": 0}
