import json
import types

import pytest

from core import llm
from core.dates import today


class _FakeResp:
    def __init__(self, content):
        self.choices = [types.SimpleNamespace(message=types.SimpleNamespace(content=content))]


class _FakeClient:
    def __init__(self, content):
        self._content = content
        self.chat = types.SimpleNamespace(
            completions=types.SimpleNamespace(create=self._create)
        )

    def _create(self, **kw):
        return _FakeResp(self._content)


def _patch(monkeypatch, content):
    monkeypatch.setattr(llm, "_c", lambda: _FakeClient(content))


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


async def test_parse_api_hatasi_yukari_firlar(monkeypatch):
    class _Boom:
        chat = types.SimpleNamespace(completions=types.SimpleNamespace(
            create=lambda **kw: (_ for _ in ()).throw(RuntimeError("500"))
        ))
    monkeypatch.setattr(llm, "_c", lambda: _Boom())
    with pytest.raises(RuntimeError):
        await llm.parse_transactions("kahve 90")
