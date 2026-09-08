import json

import pytest

from core import llm
from core.dates import today


def _patch(monkeypatch, content):
    """llm._chat_json'ı sabit içerik döndürecek şekilde değiştirir."""
    def _fake(system, user, *, max_tokens, temperature=0.1, reasoning_effort="low"):
        return content
    monkeypatch.setattr(llm, "_chat_json", _fake)


async def test_parse_tekli(monkeypatch):
    _patch(monkeypatch, json.dumps({"kayitlar": [
        {"aciklama": "kahve", "tutar": 90, "kategori": "Kafe/Restoran",
         "tip": "kisisel", "yon": "gider", "tarih": "", "emin": True}
    ]}))
    adaylar = await llm.parse_transactions("kahve 90")
    assert len(adaylar) == 1
    assert adaylar[0].tutar == 90.0
    assert adaylar[0].direction == "gider"
    assert adaylar[0].tarih == today()


async def test_parse_gelir(monkeypatch):
    _patch(monkeypatch, json.dumps({"kayitlar": [
        {"aciklama": "maaş", "tutar": 45000, "kategori": "Maaş",
         "tip": "kisisel", "yon": "gelir", "tarih": "01.08.2026", "emin": True}
    ]}))
    a = (await llm.parse_transactions("maaş geldi 45000"))[0]
    assert a.direction == "gelir"
    assert a.tutar == 45000.0


async def test_parse_bos(monkeypatch):
    _patch(monkeypatch, json.dumps({"kayitlar": []}))
    assert await llm.parse_transactions("bugün hava güzel") == []


async def test_parse_bozuk_json_bos_doner(monkeypatch):
    _patch(monkeypatch, "bu json değil")
    assert await llm.parse_transactions("x") == []


async def test_parse_sifir_elenir_negatif_pozitiflenir(monkeypatch):
    _patch(monkeypatch, json.dumps({"kayitlar": [
        {"aciklama": "a", "tutar": -5, "kategori": "X", "tip": "kisisel"},
        {"aciklama": "b", "tutar": 0, "kategori": "X", "tip": "kisisel"},
        {"aciklama": "c", "tutar": 10, "kategori": "X", "tip": "kisisel"},
    ]}))
    adaylar = await llm.parse_transactions("x")
    assert [(a.aciklama, a.tutar) for a in adaylar] == [("a", 5.0), ("c", 10.0)]


async def test_parse_bos_kategori_diger_olmaz(monkeypatch):
    """AI kategoriyi boş bırakırsa aday boş kalır — 'Diğer'e çevrilmez."""
    _patch(monkeypatch, json.dumps({"kayitlar": [
        {"aciklama": "belirsiz", "tutar": 200, "kategori": "", "tip": "kisisel",
         "yon": "gider", "emin": False},
        {"aciklama": "yok", "tutar": 50, "tip": "kisisel", "yon": "gider"},
    ]}))
    adaylar = await llm.parse_transactions("şey için 200, 50 harcadım")
    assert adaylar[0].kategori == ""
    assert adaylar[0].emin is False
    assert adaylar[1].kategori == ""


async def test_parse_neden_alani(monkeypatch):
    _patch(monkeypatch, json.dumps({"kayitlar": [
        {"aciklama": "elektrik faturası", "tutar": 850, "kategori": "Faturalar",
         "neden": "fatura anahtar kelimesi", "tip": "kisisel", "yon": "gider", "emin": True}
    ]}))
    a = (await llm.parse_transactions("elektrik faturası 850"))[0]
    assert a.kategori == "Faturalar"
    assert a.neden == "fatura anahtar kelimesi"


async def test_parse_liste_disi_kategori_bosaltilir(monkeypatch):
    """Model listede olmayan bir kategori uydurursa boşaltılır + emin=false."""
    from core.models import Category

    _patch(monkeypatch, json.dumps({"kayitlar": [
        {"aciklama": "x", "tutar": 100, "kategori": "Uydurma Kategori",
         "tip": "kisisel", "yon": "gider", "emin": True},
    ]}))
    cats = [Category(id="1", user_id="u", name="Market", tip="kisisel")]
    a = (await llm.parse_transactions("x", kategoriler=cats))[0]
    assert a.kategori == ""
    assert a.emin is False


async def test_parse_kategoriler_prompta_girer(monkeypatch):
    from core.models import Category

    yakalanan = {}

    def _fake(system, user, *, max_tokens, temperature=0.1, reasoning_effort="low"):
        yakalanan["system"] = system
        return json.dumps({"kayitlar": []})

    monkeypatch.setattr(llm, "_chat_json", _fake)
    cats = [
        Category(id="1", user_id="u", name="Nargile", tip="kisisel",
                 keywords=["nargile", "tömbeki"]),
        Category(id="2", user_id="u", name="Sac Levha", tip="isletme"),
    ]
    await llm.parse_transactions("x", kategoriler=cats)
    assert "Nargile" in yakalanan["system"]
    assert "tömbeki" in yakalanan["system"]  # anahtar kelimeler de prompt'a girer
    assert "Sac Levha" in yakalanan["system"]
    assert "Market" not in yakalanan["system"]  # varsayılan liste kullanılmadı


async def test_parse_api_hatasi_yukari_firlar(monkeypatch):
    def _boom(system, user, *, max_tokens, temperature=0.1, reasoning_effort="low"):
        raise RuntimeError("500")
    monkeypatch.setattr(llm, "_chat_json", _boom)
    with pytest.raises(RuntimeError):
        await llm.parse_transactions("kahve 90")


async def test_parse_ratelimit_groqbusy(monkeypatch):
    import httpx
    from groq import RateLimitError

    def _429(system, user, *, max_tokens, temperature=0.1, reasoning_effort="low"):
        resp = httpx.Response(429, request=httpx.Request("POST", "https://api.groq.com"))
        raise RateLimitError("rate limited", response=resp, body=None)

    monkeypatch.setattr(llm, "_chat_json", _429)
    with pytest.raises(llm.GroqBusy):
        await llm.parse_transactions("kahve 90")
