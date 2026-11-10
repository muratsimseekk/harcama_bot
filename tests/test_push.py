"""Push altyapısı: Expo payload + /v1/push/run cron auth + dedup."""
from __future__ import annotations

from datetime import date

import pytest
from fastapi.testclient import TestClient

from api.main import app
from api.routes import push as rota
from core.models import Budget, Transaction
from core.push import _mesajlar


@pytest.fixture
def client():
    return TestClient(app)


def test_expo_payload_gecersiz_token_eler():
    m = _mesajlar(
        ["ExponentPushToken[abc]", "cihaz-yok", ""],
        "Başlık", "Gövde", {"tur": "butce"},
    )
    assert len(m) == 1
    assert m[0]["to"] == "ExponentPushToken[abc]"
    assert m[0]["title"] == "Başlık"
    assert m[0]["sound"] == "default"


def test_push_run_yanlis_sir_401(client):
    r = client.post("/v1/push/run", json={"tur": "butce"}, headers={"X-Cron-Secret": "yanlis"})
    assert r.status_code == 401


def test_push_run_butce_uyarisi_bir_kez(client, monkeypatch):
    monkeypatch.setattr(rota.settings, "CRON_SECRET", "gizli")

    async def tokens_all():
        return [{"user_id": "u1", "token": "ExponentPushToken[x]", "platform": "ios"}]

    tx = Transaction(
        id="1", user_id="u1", direction="gider", tip="kisisel",
        kategori="Market", aciklama="market", tutar=900.0, para_birimi="TRY",
        tarih=date.today(), kaynak="test",
    )

    async def list_period(uid, bas, bit, **kw):
        return [tx]

    async def budgets_list(uid):
        return [Budget(id="b", user_id="u1", kapsam="kategori", kapsam_deger="Market", limit_amount=1000)]

    gonderilenler: list[str] = []

    async def isaretle(uid, anahtar):
        gonderilenler.append(anahtar)

    async def gonderildi_mi(uid, anahtar):
        return anahtar in gonderilenler

    async def sahte_push(tokens, baslik, govde, veri=None):
        return (len(tokens), 0, [])

    monkeypatch.setattr(rota.repo, "push_tokens_all", tokens_all)
    monkeypatch.setattr(rota.repo, "list_period", list_period)
    monkeypatch.setattr(rota.repo, "budgets_list", budgets_list)
    monkeypatch.setattr(rota.repo, "bildirim_isaretle", isaretle)
    monkeypatch.setattr(rota.repo, "bildirim_gonderildi_mi", gonderildi_mi)
    monkeypatch.setattr(rota.push, "expo_push_gonder", sahte_push)

    h = {"X-Cron-Secret": "gizli"}
    r1 = client.post("/v1/push/run", json={"tur": "butce"}, headers=h)
    assert r1.status_code == 200 and r1.json()["gonderim"] == 1

    r2 = client.post("/v1/push/run", json={"tur": "butce"}, headers=h)
    assert r2.json()["gonderim"] == 0  # dedup — ikinci kez göndermez


# ---- özet bildirim metinleri ---------------------------------------------- #
from types import SimpleNamespace as _NS  # noqa: E402

from api.routes.push import gunluk_mesaj, haftalik_mesaj  # noqa: E402


def _g(tutar, kat="Market"):
    return _NS(tutar=tutar, kategori=kat)


def test_gunluk_mesaj_genel_butce_kalan():
    baslik, govde = gunluk_mesaj(
        [_g(600), _g(650.4, "Kafe/Restoran")],
        [_g(600), _g(650.4, "Kafe/Restoran"), _g(5000)],
        [_NS(kapsam="genel", limit_amount=10000)],
    )
    assert baslik == "🌙 Bugünün özeti"
    assert govde.splitlines() == [
        "Bugün 2 harcama, toplam 1.250 ₺.",
        "En çok: Kafe/Restoran (650 ₺)",
        "Bu ay bütçende 3.750 ₺ kaldı 💪",
        "Eklemeyi unuttuğun bir harcama varsa şimdi ekleyebilirsin.",
    ]


def test_gunluk_mesaj_butce_yok_tek_islem():
    _, govde = gunluk_mesaj([_g(90)], [_g(90), _g(1000)], [])
    assert govde.splitlines()[:2] == ["Bugün 1 harcama, toplam 90 ₺.", "Bu ay toplam 1.090 ₺ harcadın."]


def test_gunluk_mesaj_butce_asildi():
    _, govde = gunluk_mesaj([_g(500)], [_g(10500)], [_NS(kapsam="genel", limit_amount=10000)])
    assert govde.splitlines()[-2] == "Aylık bütçeni 500 ₺ aştın ⚠️"


def test_haftalik_mesaj_karsilastirma():
    baslik, govde = haftalik_mesaj([_g(800), _g(200, "Ulaşım")], [_g(1250)])
    assert baslik == "📊 Haftan nasıl geçti?"
    assert govde.splitlines() == [
        "Bu hafta 2 harcama, toplam 1.000 ₺.",
        "Geçen haftadan %20 daha az 👏",
        "En çok: Market (800 ₺)",
        "Yeni haftaya iyi başlangıçlar ✨",
    ]


def test_haftalik_mesaj_gecen_hafta_yok():
    _, govde = haftalik_mesaj([_g(300)], [])
    assert "Geçen hafta" not in govde


# ---- günlük hatırlatma / Pazar yönlendirmesi ------------------------------- #
def _gunluk_kur(monkeypatch, islemler, bugun):
    monkeypatch.setattr(rota.settings, "CRON_SECRET", "gizli")
    monkeypatch.setattr(rota, "today", lambda: bugun)
    gonderilen: list[tuple[str, str]] = []

    async def tokens_all():
        return [{"user_id": "u1", "token": "ExponentPushToken[x]", "platform": "android"}]

    async def list_period(uid, bas, bit, **kw):
        return [t for t in islemler if bas <= t.tarih <= bit]

    async def bos(*a, **k):
        return []

    async def hayir(*a, **k):
        return False

    async def sahte_push(tokens, baslik, govde, veri=None):
        gonderilen.append((baslik, govde))
        return (1, 0, [])

    monkeypatch.setattr(rota.repo, "push_tokens_all", tokens_all)
    monkeypatch.setattr(rota.repo, "list_period", list_period)
    monkeypatch.setattr(rota.repo, "budgets_list", bos)
    monkeypatch.setattr(rota.repo, "bildirim_isaretle", bos)
    monkeypatch.setattr(rota.repo, "bildirim_gonderildi_mi", hayir)
    monkeypatch.setattr(rota.push, "expo_push_gonder", sahte_push)
    return gonderilen


def _tx(gun, tutar=100.0):
    return Transaction(
        id=str(gun), user_id="u1", direction="gider", tip="kisisel", kategori="Market",
        aciklama="", tutar=tutar, para_birimi="TRY", tarih=gun, kaynak="test",
    )


def test_gunluk_kayit_yoksa_hatirlatir(client, monkeypatch):
    sali = date(2026, 11, 10)
    g = _gunluk_kur(monkeypatch, [_tx(date(2026, 11, 8))], sali)
    r = client.post("/v1/push/run", json={"tur": "gunluk"}, headers={"X-Cron-Secret": "gizli"})
    assert r.json()["tur"] == "gunluk" and g == [rota.HATIRLATMA]


def test_gunluk_uzun_suredir_pasif_kullaniciya_gitmez(client, monkeypatch):
    g = _gunluk_kur(monkeypatch, [_tx(date(2026, 10, 1))], date(2026, 11, 10))
    client.post("/v1/push/run", json={"tur": "gunluk"}, headers={"X-Cron-Secret": "gizli"})
    assert g == []


def test_pazar_gunluk_cagrisi_haftalik_ozete_doner(client, monkeypatch):
    pazar = date(2026, 11, 15)
    g = _gunluk_kur(monkeypatch, [_tx(date(2026, 11, 12)), _tx(pazar)], pazar)
    r = client.post("/v1/push/run", json={"tur": "gunluk"}, headers={"X-Cron-Secret": "gizli"})
    assert r.json()["tur"] == "haftalik"
    assert len(g) == 1 and g[0][0] == "📊 Haftan nasıl geçti?"
