"""Kullanım kolaylığı uçları: tekrarlayan kayıtlar, geri al, dışa aktarma, içgörü kıyası."""
import io
from datetime import date

import pytest
from fastapi.testclient import TestClient
from openpyxl import load_workbook

from api import usage
from api.auth import current_user
from api.main import app
from api.routes import disa_aktar as rota_dis
from api.routes import summary as rota_ozet
from api.routes import tekrarlayan as rota_tek
from api.routes import transactions as rota_tx
from api.usage import PlanDurum
from core.models import Transaction
from core.tekrarlayan import ay_gunu, sonraki_tarih, vadesi_gelenler


def _tx(tutar, g, kat="Market", direction="gider", uid="u1"):
    return Transaction(
        id="t1", user_id=uid, direction=direction, tip="kisisel", kategori=kat,
        aciklama="a", tutar=tutar, para_birimi="TRY", tarih=g, kaynak="t",
    )


@pytest.fixture
def client():
    app.dependency_overrides[current_user] = lambda: "u1"
    yield TestClient(app)
    app.dependency_overrides.clear()


def _plan(monkeypatch, pro: bool):
    async def durum(uid):
        return PlanDurum(ham="pro" if pro else "free", etkin="pro" if pro else "free", gunluk_limit=5)

    monkeypatch.setattr(usage, "plan_durum", durum)


# ------------------------------------------------------------- tekrarlayan mantık
def test_ay_gunu_kisa_aylarda_son_gun():
    assert ay_gunu(2026, 2, 31) == date(2026, 2, 28)
    assert ay_gunu(2026, 4, 31) == date(2026, 4, 30)


def test_vadesi_gelenler_telafi_ve_tekrar_etmez():
    # 5'inde kira; en son Eylül eklendi, bugün 12 Kasım → Ekim + Kasım
    assert vadesi_gelenler(5, date(2026, 1, 1), date(2026, 9, 5), date(2026, 11, 12)) == [
        date(2026, 10, 5), date(2026, 11, 5)]
    # günü gelmemiş: 20'sinde, bugün 12 → Kasım yok
    assert vadesi_gelenler(20, date(2026, 1, 1), date(2026, 10, 20), date(2026, 11, 12)) == []
    # yeni kural, bugün oluşturuldu, gün bugün → bugün eklenir
    assert vadesi_gelenler(12, date(2026, 11, 12), None, date(2026, 11, 12)) == [date(2026, 11, 12)]
    # başlangıçtan önceki gün eklenmez
    assert vadesi_gelenler(1, date(2026, 11, 12), None, date(2026, 11, 30)) == []
    # en çok 12 ay telafi
    assert len(vadesi_gelenler(1, date(2020, 1, 1), None, date(2026, 11, 12))) == 12


def test_sonraki_tarih():
    assert sonraki_tarih(5, date(2026, 1, 1), date(2026, 11, 5), date(2026, 11, 12)) == date(2026, 12, 5)
    assert sonraki_tarih(31, date(2026, 1, 1), None, date(2027, 2, 1)) == date(2027, 2, 28)


# ------------------------------------------------------------- tekrarlayan uçlar
def _kural(**kw):
    k = {"id": "k1", "aciklama": "Kira", "tutar": 18000.0, "kategori": "Kira", "tip": "kisisel",
         "direction": "gider", "gun": 5, "aktif": True, "son_eklenen": date(2026, 9, 5),
         "baslangic": date(2026, 1, 1)}
    k.update(kw)
    return k


def test_isle_ekler_ve_kilit_kaybedilirse_eklemez(client, monkeypatch):
    eklenen = []
    talepler = []

    async def liste(uid, yalniz_aktif=False):
        return [_kural(), _kural(id="k2", aciklama="Netflix", gun=1)]

    async def talep(kid, eski, yeni):
        talepler.append((kid, eski, yeni))
        return kid == "k1"  # k2'yi başka istek almış gibi

    async def add_many(adaylar, uid):
        eklenen.extend(adaylar)
        return []

    monkeypatch.setattr(rota_tek, "today", lambda: date(2026, 11, 12))
    monkeypatch.setattr(rota_tek.repo, "tekrar_listesi", liste)
    monkeypatch.setattr(rota_tek.repo, "tekrar_talep", talep)
    monkeypatch.setattr(rota_tek.repo, "add_many", add_many)
    r = client.post("/v1/tekrarlayan/isle")
    assert r.status_code == 200, r.text
    assert r.json() == {"eklenen": 2, "aciklamalar": ["Kira"]}
    assert [a.tarih for a in eklenen] == [date(2026, 10, 5), date(2026, 11, 5)]
    assert all(a.kaynak == "tekrarlayan" for a in eklenen)
    assert talepler[0] == ("k1", date(2026, 9, 5), date(2026, 11, 5))


def test_isle_ekleme_duserse_talep_geri_alinir(client, monkeypatch):
    talepler = []

    async def liste(uid, yalniz_aktif=False):
        return [_kural()]

    async def talep(kid, eski, yeni):
        talepler.append((eski, yeni))
        return True

    async def add_many(adaylar, uid):
        raise RuntimeError("db düştü")

    monkeypatch.setattr(rota_tek, "today", lambda: date(2026, 11, 12))
    monkeypatch.setattr(rota_tek.repo, "tekrar_listesi", liste)
    monkeypatch.setattr(rota_tek.repo, "tekrar_talep", talep)
    monkeypatch.setattr(rota_tek.repo, "add_many", add_many)
    r = client.post("/v1/tekrarlayan/isle")
    assert r.json()["eklenen"] == 0
    assert talepler == [(date(2026, 9, 5), date(2026, 11, 5)), (date(2026, 11, 5), date(2026, 9, 5))]


def test_isle_tablo_yoksa_sessiz(client, monkeypatch):
    async def liste(uid, yalniz_aktif=False):
        raise RuntimeError("relation recurring does not exist")

    monkeypatch.setattr(rota_tek.repo, "tekrar_listesi", liste)
    r = client.post("/v1/tekrarlayan/isle")
    assert r.status_code == 200 and r.json()["eklenen"] == 0


def test_free_en_cok_uc_aktif(client, monkeypatch):
    _plan(monkeypatch, pro=False)

    async def liste(uid, yalniz_aktif=False):
        return [_kural(id=f"k{i}") for i in range(3)]

    monkeypatch.setattr(rota_tek.repo, "tekrar_listesi", liste)
    govde = {"aciklama": "Spor salonu", "tutar": 900, "gun": 3}
    r = client.post("/v1/tekrarlayan", json=govde)
    assert r.status_code == 402 and r.json()["detail"]["kod"] == "pro_gerekli"

    _plan(monkeypatch, pro=True)
    alinan = {}

    async def olustur(uid, alanlar):
        alinan.update(alanlar)
        return _kural(aciklama="Spor salonu", gun=3, son_eklenen=None, baslangic=date(2026, 11, 12))

    monkeypatch.setattr(rota_tek.repo, "tekrar_olustur", olustur)
    monkeypatch.setattr(rota_tek, "today", lambda: date(2026, 11, 12))
    r = client.post("/v1/tekrarlayan", json=govde)
    assert r.status_code == 201, r.text
    assert alinan["day_of_month"] == 3 and alinan["last_added_on"] is None
    assert r.json()["sonraki"] == "2026-12-03"


# ------------------------------------------------------------- geri al
def test_geri_al(client, monkeypatch):
    async def bul(tx_id):
        return _tx(100, date(2026, 11, 10)), True

    async def geri(tx_id):
        return _tx(100, date(2026, 11, 10))

    monkeypatch.setattr(rota_tx.repo, "get_silinen_dahil", bul)
    monkeypatch.setattr(rota_tx.repo, "geri_al", geri)
    r = client.post("/v1/transactions/t1/geri-al")
    assert r.status_code == 200 and r.json()["id"] == "t1"


def test_geri_al_baskasinin_kaydi_404(client, monkeypatch):
    async def bul(tx_id):
        return _tx(100, date(2026, 11, 10), uid="baska"), True

    monkeypatch.setattr(rota_tx.repo, "get_silinen_dahil", bul)
    assert client.post("/v1/transactions/t1/geri-al").status_code == 404


# ------------------------------------------------------------- dışa aktarma
def _disa_hazirla(monkeypatch, pro=True):
    _plan(monkeypatch, pro)

    async def kapsam(uid):
        return ["u1"]

    async def list_period(ids, bas, bit, **kw):
        return [_tx(250, date(2026, 11, 3)), _tx(45000, date(2026, 11, 1), "Maaş", "gelir")]

    monkeypatch.setattr(rota_dis.deps, "kapsam", kapsam)
    monkeypatch.setattr(rota_dis.repo, "list_period", list_period)


def test_disa_aktar_free_402(client, monkeypatch):
    _disa_hazirla(monkeypatch, pro=False)
    r = client.get("/v1/disa-aktar?bas=2026-11-01&bit=2026-11-30")
    assert r.status_code == 402 and r.json()["detail"]["kod"] == "pro_gerekli"


def test_disa_aktar_xlsx(client, monkeypatch):
    _disa_hazirla(monkeypatch)
    r = client.get("/v1/disa-aktar?bas=2026-11-01&bit=2026-11-30&bicim=xlsx")
    assert r.status_code == 200
    assert "parazi_2026-11-01_2026-11-30.xlsx" in r.headers["content-disposition"]
    wb = load_workbook(io.BytesIO(r.content))
    ws = wb["Kayıtlar"]
    assert [c.value for c in ws[1]][:6] == ["Tarih", "Tür", "Bölüm", "Kategori", "Açıklama", "Tutar"]
    tutarlar = sorted(ws.cell(i, 6).value for i in range(2, ws.max_row + 1))
    assert tutarlar == [-250, 45000]
    oz = wb["Özet"]
    assert oz["B3"].value == 45000 and oz["B4"].value == 250


def test_disa_aktar_kategori_filtresi(client, monkeypatch):
    _plan(monkeypatch, True)
    alinan = {}

    async def kapsam(uid):
        return ["u1"]

    async def list_period(ids, bas, bit, **kw):
        alinan.update(kw)
        return [_tx(1200, date(2026, 7, 3), "Kafe/Restoran")]

    monkeypatch.setattr(rota_dis.deps, "kapsam", kapsam)
    monkeypatch.setattr(rota_dis.repo, "list_period", list_period)
    r = client.get("/v1/disa-aktar?bas=2026-06-01&bit=2026-08-31&kategori=Kafe/Restoran&yon=gider")
    assert r.status_code == 200
    assert alinan == {"direction": "gider", "kategoriler": ["Kafe/Restoran"]}
    assert "parazi_kafe-restoran_2026-06-01_2026-08-31.xlsx" in r.headers["content-disposition"]
    h = client.get("/v1/disa-aktar?bas=2026-06-01&bit=2026-08-31&kategori=Diğer&bicim=html")
    assert alinan["kategoriler"] == ["Diğer", ""]  # kategorisizler de "Diğer"de
    assert "Paraİzi dökümü · Diğer" in h.text


def test_disa_aktar_html(client, monkeypatch):
    _disa_hazirla(monkeypatch)
    r = client.get("/v1/disa-aktar?bas=2026-11-01&bit=2026-11-30&bicim=html")
    assert r.status_code == 200 and "text/html" in r.headers["content-type"]
    assert "45.000,00 ₺" in r.text and "−250,00 ₺" in r.text and "1 Kasım 2026" in r.text


# ------------------------------------------------------------- içgörü kıyası
def test_kategoriler_ozel_kiyas_donemi(client, monkeypatch):
    async def kapsam(uid):
        return "u1"

    async def list_period(ids, bas, bit, **kw):
        return []

    monkeypatch.setattr(rota_ozet.deps, "kapsam", kapsam)
    monkeypatch.setattr(rota_ozet.repo, "list_period", list_period)
    r = client.get("/v1/summary/kategoriler?bas=2026-11-01&bit=2026-11-12&obas=2026-10-01&obit=2026-10-12")
    assert r.status_code == 200
    assert r.json()["onceki_baslangic"] == "2026-10-01" and r.json()["onceki_bitis"] == "2026-10-12"
