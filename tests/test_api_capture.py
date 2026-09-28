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


def _durum(etkin="free", limit=3):
    from api.usage import PlanDurum
    return PlanDurum(ham=etkin, etkin=etkin, gunluk_limit=limit)


def test_transactions_olustur_enerji_asimi_402(client, monkeypatch):
    async def fake_durum(uid):
        return _durum("free", 3)
    async def fake_sayac(uid):
        return 3  # bugünkü 3 hakkı da kullanılmış
    monkeypatch.setattr(usage, "plan_durum", fake_durum)
    monkeypatch.setattr(usage, "gun_kayit_sayisi", fake_sayac)

    r = client.post("/v1/transactions", json={"candidates": [{
        "aciklama": "kahve", "tutar": 90, "kategori": "Kafe/Restoran",
        "tarih": "2026-08-28", "kaynak": "mobile_text",
    }]})
    assert r.status_code == 402
    assert r.json()["detail"]["kod"] == "enerji_bitti"


def test_transactions_elle_giris_de_enerji_harcar(client, monkeypatch):
    """Elle giriş artık muaf değil — günlük enerji elle+AI arasında paylaşılıyor."""
    async def fake_durum(uid):
        return _durum("free", 3)
    async def fake_sayac(uid):
        return 3  # bugünkü hak dolmuş
    monkeypatch.setattr(usage, "plan_durum", fake_durum)
    monkeypatch.setattr(usage, "gun_kayit_sayisi", fake_sayac)

    r = client.post("/v1/transactions", json={"candidates": [{
        "aciklama": "kahve", "tutar": 90, "kategori": "Kafe/Restoran", "tarih": "2026-08-28",
    }]})  # kaynak yok → varsayılan mobile_manual, yine de 402
    assert r.status_code == 402


def test_transactions_elle_giris_hak_varsa_gecer(client, monkeypatch):
    from core.models import Transaction

    async def fake_durum(uid):
        return _durum("free", 3)
    async def fake_sayac(uid):
        return 1  # bugün 1 kayıt yapılmış, 2 hak kaldı
    async def fake_add_many(adaylar, uid):
        return [Transaction(
            id="tx1", user_id=uid, direction=a.direction, tip=a.tip, kategori=a.kategori,
            aciklama=a.aciklama, tutar=a.tutar, para_birimi="TRY", tarih=a.tarih, kaynak=a.kaynak,
        ) for a in adaylar]
    monkeypatch.setattr(usage, "plan_durum", fake_durum)
    monkeypatch.setattr(usage, "gun_kayit_sayisi", fake_sayac)
    monkeypatch.setattr(transactions.repo, "add_many", fake_add_many)

    r = client.post("/v1/transactions", json={"candidates": [{
        "aciklama": "kahve", "tutar": 90, "kategori": "Kafe/Restoran", "tarih": "2026-08-28",
    }]})
    assert r.status_code == 201


def test_reklam_kredisiyle_sinirsiz_gunluk_limit_asilmaz(client, monkeypatch):
    from core.models import Transaction

    async def fake_durum(uid):
        return _durum("free", 10**9)  # ör. çok sayıda reklam kredisiyle gunluk_limit sınırsız
    async def fake_sayac(uid):
        return 999  # tavan çok aşılmış görünse de limit sınırsız olduğu için geçmeli
    async def fake_add_many(adaylar, uid):
        return [Transaction(
            id="tx1", user_id=uid, direction=a.direction, tip=a.tip, kategori=a.kategori,
            aciklama=a.aciklama, tutar=a.tutar, para_birimi="TRY", tarih=a.tarih, kaynak=a.kaynak,
        ) for a in adaylar]
    monkeypatch.setattr(usage, "plan_durum", fake_durum)
    monkeypatch.setattr(usage, "gun_kayit_sayisi", fake_sayac)
    monkeypatch.setattr(transactions.repo, "add_many", fake_add_many)

    r = client.post("/v1/transactions", json={"candidates": [{
        "aciklama": "kahve", "tutar": 90, "kategori": "Kafe/Restoran",
        "tarih": "2026-08-28", "kaynak": "mobile_text",
    }]})
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
