import pytest
from fastapi.testclient import TestClient

from api import usage
from api.auth import current_user
from api.main import app
from api.routes import capture, transactions
from core.models import Candidate


def _aday(aciklama="kahve", tutar=90.0, kategori="Kafe/Restoran", tip="kisisel"):
    return Candidate(aciklama=aciklama, tutar=tutar, kategori=kategori, tip=tip)


@pytest.fixture
def client(monkeypatch):
    app.dependency_overrides[current_user] = lambda: "test-user"

    async def _bos_kategoriler(uid, **k):
        return []
    monkeypatch.setattr(capture.repo, "categories_list", _bos_kategoriler)

    yield TestClient(app)
    app.dependency_overrides.clear()


def test_auth_yok_401(monkeypatch):
    monkeypatch.setattr("api.auth.settings.DEV_BYPASS_USER_ID", "")
    c = TestClient(app)
    r = c.post("/v1/capture", data={"text": "kahve 90"})
    assert r.status_code == 401


def test_capture_tekli_dusuk_tutar(client, monkeypatch):
    async def fake_parse(metin, *, kaynak="x", kategoriler=None):
        return [_aday()]
    monkeypatch.setattr(capture, "parse_transactions", fake_parse)

    r = client.post("/v1/capture", data={"text": "kahve 90"})
    assert r.status_code == 200
    j = r.json()
    assert len(j["candidates"]) == 1
    assert j["needs_review"] is False
    assert j["candidates"][0]["tutar"] == 90.0


def test_capture_yuksek_tutar_onay_ister(client, monkeypatch):
    async def fake_parse(metin, *, kaynak="x", kategoriler=None):
        return [_aday(aciklama="danışmanlık", tutar=40000, kategori="Diğer İşletme", tip="isletme")]
    monkeypatch.setattr(capture, "parse_transactions", fake_parse)

    r = client.post("/v1/capture", data={"text": "danışmanlık 40000"})
    j = r.json()
    assert j["needs_review"] is True
    assert any("yüksek" in s.lower() for s in j["candidates"][0]["inceleme_sebepleri"])


def test_capture_bos_sonuc(client, monkeypatch):
    async def fake_parse(metin, *, kaynak="x", kategoriler=None):
        return []
    monkeypatch.setattr(capture, "parse_transactions", fake_parse)

    r = client.post("/v1/capture", data={"text": "bugün hava güzel"})
    assert r.status_code == 200
    assert r.json() == {"candidates": [], "needs_review": False, "transcript": None}


def test_capture_girdi_yok_400(client):
    r = client.post("/v1/capture", data={})
    assert r.status_code == 400


def test_capture_ai_hata_503(client, monkeypatch):
    async def patlat(metin, *, kaynak="x", kategoriler=None):
        raise RuntimeError("groq down")
    monkeypatch.setattr(capture, "parse_transactions", patlat)

    r = client.post("/v1/capture", data={"text": "kahve 90"})
    assert r.status_code == 503


def test_capture_ai_mesgul_429(client, monkeypatch):
    async def mesgul(metin, *, kaynak="x", kategoriler=None):
        raise capture.GroqBusy("rate limited")
    monkeypatch.setattr(capture, "parse_transactions", mesgul)

    r = client.post("/v1/capture", data={"text": "kahve 90"})
    assert r.status_code == 429
    assert r.headers.get("Retry-After") == "20"


def test_capture_hiz_limiti_429(client, monkeypatch):
    from api import deps

    deps._capture_pencere.clear()
    monkeypatch.setattr(deps.settings, "CAPTURE_LIMIT_ISTEK", 3)

    async def fake_parse(metin, *, kaynak="x", kategoriler=None):
        return []
    monkeypatch.setattr(capture, "parse_transactions", fake_parse)

    for _ in range(3):
        assert client.post("/v1/capture", data={"text": "x"}).status_code == 200
    r = client.post("/v1/capture", data={"text": "x"})
    assert r.status_code == 429
    assert r.headers.get("Retry-After") == "60"
    deps._capture_pencere.clear()


def _durum(etkin="base", limit=50):
    from api.usage import PlanDurum
    return PlanDurum(ham=etkin, etkin=etkin, trial_bitis=None, ai_limit=limit)


def test_transactions_olustur_ai_limit_asimi_402(client, monkeypatch):
    async def fake_durum(uid):
        return _durum("base", 50)
    async def fake_sayac(uid):
        return 50
    monkeypatch.setattr(usage, "plan_durum", fake_durum)
    monkeypatch.setattr(usage, "ay_kayit_sayisi", fake_sayac)

    r = client.post("/v1/transactions", json={"candidates": [{
        "aciklama": "kahve", "tutar": 90, "kategori": "Kafe/Restoran",
        "tarih": "2026-08-28", "kaynak": "mobile_text",
    }]})
    assert r.status_code == 402


def test_transactions_elle_giris_limitten_muaf(client, monkeypatch):
    from core.models import Transaction

    async def fake_durum(uid):
        return _durum("base", 50)
    async def fake_sayac(uid):
        return 999  # limit çok aşılmış ama elle giriş sayılmaz
    async def fake_add_many(adaylar, uid):
        return [Transaction(
            id="tx1", user_id=uid, direction=a.direction, tip=a.tip, kategori=a.kategori,
            aciklama=a.aciklama, tutar=a.tutar, para_birimi="TRY", tarih=a.tarih, kaynak=a.kaynak,
        ) for a in adaylar]
    monkeypatch.setattr(usage, "plan_durum", fake_durum)
    monkeypatch.setattr(usage, "ay_kayit_sayisi", fake_sayac)
    monkeypatch.setattr(transactions.repo, "add_many", fake_add_many)

    r = client.post("/v1/transactions", json={"candidates": [{
        "aciklama": "kahve", "tutar": 90, "kategori": "Kafe/Restoran", "tarih": "2026-08-28",
    }]})  # kaynak yok → varsayılan mobile_manual
    assert r.status_code == 201


def test_transactions_olustur_basarili(client, monkeypatch):
    from core.models import Transaction

    async def fake_durum(uid):
        return _durum("pro", 10**9)
    async def fake_add_many(adaylar, uid):
        return [Transaction(
            id="tx1", user_id=uid, direction=a.direction, tip=a.tip, kategori=a.kategori,
            aciklama=a.aciklama, tutar=a.tutar, para_birimi="TRY", tarih=a.tarih, kaynak="mobile",
        ) for a in adaylar]
    monkeypatch.setattr(usage, "plan_durum", fake_durum)
    monkeypatch.setattr(transactions.repo, "add_many", fake_add_many)

    r = client.post("/v1/transactions", json={"candidates": [{
        "aciklama": "kahve", "tutar": 90, "kategori": "Kafe/Restoran", "tarih": "2026-08-28"
    }]})
    assert r.status_code == 201
    assert r.json()[0]["id"] == "tx1"
