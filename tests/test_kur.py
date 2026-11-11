"""Döviz kurları: TCMB XML çözümü, hafta sonu doldurma, işlem bazında çevirme, ?para=USD."""
from __future__ import annotations

from datetime import date

import pytest
from fastapi.testclient import TestClient

from api.auth import current_user
from api.main import app
from api.routes import summary as rota
from core import kur
from core.models import Transaction

XML = """<?xml version="1.0" encoding="UTF-8"?>
<Tarih_Date Tarih="10.11.2026" Date="11/10/2026" Bulten_No="2026/212">
  <Currency CrossOrder="0" Kod="USD" CurrencyCode="USD"><Unit>1</Unit>
    <ForexBuying>50.1</ForexBuying><ForexSelling>50.2</ForexSelling></Currency>
  <Currency CrossOrder="9" Kod="EUR" CurrencyCode="EUR"><Unit>1</Unit>
    <ForexBuying>55.8</ForexBuying><ForexSelling>56.0</ForexSelling></Currency>
  <Currency CrossOrder="1" Kod="JPY" CurrencyCode="JPY"><Unit>100</Unit>
    <ForexSelling>33.0</ForexSelling></Currency>
</Tarih_Date>"""


def test_tcmb_xml_cozumu():
    k = kur.tcmb_coz(XML)
    assert k == kur.Kur(tarih=date(2026, 11, 10), USD=50.2, EUR=56.0, kaynak="tcmb")


@pytest.fixture
def sahte_kurlar(monkeypatch):
    """Kaynağa/DB'ye gitmeden: Cuma 6.11 = 40 ₺, Pazartesi 9.11 = 50 ₺ (EUR = USD + 5)."""
    kur._sifirla_bellek()
    for g, usd in [(date(2026, 11, 6), 40.0), (date(2026, 11, 9), 50.0)]:
        kur._bellek[g] = kur.Kur(tarih=g, USD=usd, EUR=usd + 5)

    async def tamamla(*a, **k):
        return None

    monkeypatch.setattr(kur, "_tamamla", tamamla)
    yield
    kur._sifirla_bellek()


@pytest.mark.asyncio
async def test_hafta_sonu_onceki_is_gununu_alir(sahte_kurlar):
    t = await kur.kurlar(date(2026, 11, 6), date(2026, 11, 10))
    assert t[date(2026, 11, 7)].USD == 40.0  # Cumartesi → Cuma
    assert t[date(2026, 11, 8)].tarih == date(2026, 11, 6)
    assert t[date(2026, 11, 10)].USD == 50.0  # bülten henüz yok → Pazartesi


def _tx(g, tutar, yon="gider"):
    return Transaction(
        id=str(g), user_id="u1", direction=yon, tip="kisisel", kategori="Market",
        aciklama="", tutar=tutar, para_birimi="TRY", tarih=g, kaynak="test",
    )


@pytest.mark.asyncio
async def test_her_islem_kendi_gununun_kuruyla(sahte_kurlar):
    txs = [_tx(date(2026, 11, 6), 400.0), _tx(date(2026, 11, 9), 400.0)]
    t = await kur.kurlar(date(2026, 11, 6), date(2026, 11, 9))
    usd = kur.cevir(txs, "USD", t)
    assert [x.tutar for x in usd] == [10.0, 8.0]
    assert [x.tutar for x in txs] == [400.0, 400.0]  # asıl kayıtlar değişmez
    assert kur.cevir(txs, "EUR", t)[0].tutar == round(400 / 45, 2)


def test_mevcut_dolar(sahte_kurlar, monkeypatch):
    app.dependency_overrides[current_user] = lambda: "u1"
    monkeypatch.setattr(rota, "today", lambda: date(2026, 11, 9))
    monkeypatch.setattr(kur, "today", lambda: date(2026, 11, 9))

    async def toplamlar(ids, bas, bit, cevir=None):
        satirlar = [(date(2026, 11, 6), 4000.0, "gelir"), (date(2026, 11, 9), 500.0, "gider")]
        gelir = sum(cevir(g, t) for g, t, y in satirlar if y == "gelir")
        gider = sum(cevir(g, t) for g, t, y in satirlar if y == "gider")
        return round(gelir, 2), round(gider, 2)

    monkeypatch.setattr(rota.repo, "donem_toplamlari", toplamlar)
    try:
        r = TestClient(app).get("/v1/summary/mevcut", params={"aylar": 1, "para": "USD"})
    finally:
        app.dependency_overrides.clear()
    d = r.json()
    assert (d["gelir"], d["gider"], d["net"], d["para"]) == (100.0, 10.0, 90.0, "USD")
    assert d["kur"] == {"para": "USD", "deger": 50.0, "tarih": "2026-11-09", "kaynak": "tcmb"}
