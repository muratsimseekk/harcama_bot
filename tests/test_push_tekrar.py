import httpx

from core import push


def _istemci(cevaplar, monkeypatch):
    sira = iter(cevaplar)
    cagri = {"n": 0}

    def handler(request):
        cagri["n"] += 1
        c = next(sira)
        if isinstance(c, Exception):
            raise c
        return c

    gercek = httpx.Client
    monkeypatch.setattr(push.httpx, "Client", lambda **kw: gercek(transport=httpx.MockTransport(handler)))
    monkeypatch.setattr(push.time, "sleep", lambda s: None)
    return cagri


TOKEN = "ExponentPushToken[abc]"
OK = httpx.Response(200, json={"data": [{"status": "ok"}]})


def test_503_sonra_basari(monkeypatch):
    cagri = _istemci([httpx.Response(503), OK], monkeypatch)
    assert push._gonder_sync(push._mesajlar([TOKEN], "b", "g", None)) == (1, 0, [])
    assert cagri["n"] == 2


def test_ag_hatasi_sonra_basari(monkeypatch):
    cagri = _istemci([httpx.ConnectError("x"), OK], monkeypatch)
    assert push._gonder_sync(push._mesajlar([TOKEN], "b", "g", None)) == (1, 0, [])
    assert cagri["n"] == 2


def test_uc_deneme_sonra_vazgecer(monkeypatch):
    cagri = _istemci([httpx.Response(503)] * 3, monkeypatch)
    assert push._gonder_sync(push._mesajlar([TOKEN], "b", "g", None)) == (0, 1, [])
    assert cagri["n"] == 3


def test_400_tekrar_denenmez(monkeypatch):
    cagri = _istemci([httpx.Response(400)], monkeypatch)
    assert push._gonder_sync(push._mesajlar([TOKEN], "b", "g", None)) == (0, 1, [])
    assert cagri["n"] == 1
