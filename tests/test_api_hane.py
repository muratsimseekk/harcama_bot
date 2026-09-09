import pytest
from fastapi.testclient import TestClient

from api import deps, usage
from api.auth import current_user
from api.main import app
from api.routes import hane as rota
from core.models import HaneUye, HaneUyelik, Household


@pytest.fixture
def client():
    app.dependency_overrides[current_user] = lambda: "u1"
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture(autouse=True)
def _pro(monkeypatch):
    from api.usage import PlanDurum

    async def _durum(uid):
        return PlanDurum(ham="pro", etkin="pro", trial_bitis=None, ai_limit=10**9)
    monkeypatch.setattr(usage, "plan_durum", _durum)


def _uyelik(uid="hh1", rol="owner", owner="u1"):
    return HaneUyelik(household_id=uid, ad="Evimiz", kod="ABC234", owner_id=owner, rol=rol)


def test_getir_hanede_degil_null(client, monkeypatch):
    async def yok(uid):
        return None
    monkeypatch.setattr(rota.repo, "hane_uyeligi", yok)
    r = client.get("/v1/hane")
    assert r.status_code == 200 and r.json() is None


@pytest.mark.parametrize(
    ("ham", "ai_limit"),
    [("base", 150), ("trial", 10**9)],  # trial de hane kuramaz (deneme = Base kapsamı)
)
def test_olustur_pro_degil_402(client, monkeypatch, ham, ai_limit):
    from api.usage import PlanDurum

    async def _durum(uid):
        return PlanDurum(ham=ham, etkin="base", trial_bitis=None, ai_limit=ai_limit)
    monkeypatch.setattr(usage, "plan_durum", _durum)

    async def yok(uid):
        return None
    monkeypatch.setattr(rota.repo, "hane_uyeligi", yok)

    r = client.post("/v1/hane", json={"ad": "Evimiz", "uye_adi": "Murat"})
    assert r.status_code == 402


def test_olustur_basarili(client, monkeypatch):
    durum = {"var": False}

    async def uyelik(uid):
        return _uyelik() if durum["var"] else None

    async def olustur(uid, ad, uye_adi):
        durum["var"] = True
        return Household(id="hh1", ad=ad, kod="ABC234", owner_id=uid)

    async def uyeler(hid):
        return [HaneUye(user_id="u1", ad="Murat", rol="owner")]

    monkeypatch.setattr(rota.repo, "hane_uyeligi", uyelik)
    monkeypatch.setattr(rota.repo, "hane_olustur", olustur)
    monkeypatch.setattr(rota.repo, "hane_uyeleri", uyeler)

    r = client.post("/v1/hane", json={"ad": "Evimiz", "uye_adi": "Murat"})
    assert r.status_code == 201
    j = r.json()
    assert j["ad"] == "Evimiz" and j["kod"] == "ABC234" and j["owner"] is True
    assert j["uyeler"][0]["ben"] is True


def test_olustur_zaten_hanede_409(client, monkeypatch):
    async def uyelik(uid):
        return _uyelik()
    monkeypatch.setattr(rota.repo, "hane_uyeligi", uyelik)
    r = client.post("/v1/hane", json={"ad": "X", "uye_adi": "M"})
    assert r.status_code == 409


def test_katil_kod_yok_404(client, monkeypatch):
    async def yok(uid):
        return None

    async def bul(kod):
        return None
    monkeypatch.setattr(rota.repo, "hane_uyeligi", yok)
    monkeypatch.setattr(rota.repo, "hane_kod_ile_bul", bul)
    r = client.post("/v1/hane/katil", json={"kod": "ZZZZZZ", "uye_adi": "Ayşe"})
    assert r.status_code == 404


def test_katil_basarili(client, monkeypatch):
    durum = {"var": False}

    async def uyelik(uid):
        return HaneUyelik("hh1", "Evimiz", "ABC234", "u9", "editor") if durum["var"] else None

    async def bul(kod):
        return Household(id="hh1", ad="Evimiz", kod="ABC234", owner_id="u9")

    async def katil(uid, hid, uye_adi):
        durum["var"] = True

    async def uyeler(hid):
        return [HaneUye("u9", "Sahip", "owner"), HaneUye("u1", "Ayşe", "editor")]

    monkeypatch.setattr(rota.repo, "hane_uyeligi", uyelik)
    monkeypatch.setattr(rota.repo, "hane_kod_ile_bul", bul)
    monkeypatch.setattr(rota.repo, "hane_katil", katil)
    monkeypatch.setattr(rota.repo, "hane_uyeleri", uyeler)

    r = client.post("/v1/hane/katil", json={"kod": "abc234", "uye_adi": "Ayşe"})
    assert r.status_code == 200
    j = r.json()
    assert j["rol"] == "editor" and j["owner"] is False


def test_uye_rol_degistir_owner_only(client, monkeypatch):
    async def uyelik(uid):
        return _uyelik(rol="editor")  # owner değil
    monkeypatch.setattr(rota.repo, "hane_uyeligi", uyelik)
    r = client.patch("/v1/hane/uye/u2", json={"rol": "viewer"})
    assert r.status_code == 403


def test_uye_cikar_owner(client, monkeypatch):
    cikan = {}

    async def uyelik(uid):
        return _uyelik()

    async def cikar(hid, hedef):
        cikan["hedef"] = hedef

    monkeypatch.setattr(rota.repo, "hane_uyeligi", uyelik)
    monkeypatch.setattr(rota.repo, "hane_uye_cikar", cikar)
    r = client.request("DELETE", "/v1/hane/uye/u2")
    assert r.status_code == 200 and cikan["hedef"] == "u2"


def test_owner_ayrilamaz(client, monkeypatch):
    async def uyelik(uid):
        return _uyelik(owner="u1")
    monkeypatch.setattr(rota.repo, "hane_uyeligi", uyelik)
    r = client.request("DELETE", "/v1/hane/uye/u1")
    assert r.status_code == 400


def test_hane_sil_cascade(client, monkeypatch):
    silindi = {}

    async def uyelik(uid):
        return _uyelik()

    async def idler(hid):
        return ["u1", "u2"]

    async def sil(hid):
        silindi["hid"] = hid

    monkeypatch.setattr(rota.repo, "hane_uyeligi", uyelik)
    monkeypatch.setattr(rota.repo, "hane_uye_idleri", idler)
    monkeypatch.setattr(rota.repo, "hane_sil", sil)
    r = client.request("DELETE", "/v1/hane")
    assert r.status_code == 200 and silindi["hid"] == "hh1"


def test_kapsam_hanedeyse_uye_idleri(monkeypatch):
    async def uyelik(uid):
        return _uyelik(uid="hh1")

    async def idler(hid):
        return ["u1", "u2", "u3"]

    monkeypatch.setattr(deps.repo, "hane_uyeligi", uyelik)
    monkeypatch.setattr(deps.repo, "hane_uye_idleri", idler)
    deps._uyelik_cache.clear()

    import asyncio
    ids = asyncio.run(deps.kapsam("u1"))
    assert set(ids) == {"u1", "u2", "u3"}
