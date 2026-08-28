import time

import jwt
import pytest
from fastapi import HTTPException

from api import auth

_SECRET = "test-secret-at-least-32-bytes-long-000"


def _token(sub="user-abc", aud="authenticated", exp_delta=3600):
    return jwt.encode(
        {"sub": sub, "aud": aud, "exp": int(time.time()) + exp_delta},
        _SECRET,
        algorithm="HS256",
    )


@pytest.fixture(autouse=True)
def _temiz_cache_ve_secret(monkeypatch):
    monkeypatch.setattr(auth.settings, "SUPABASE_JWT_SECRET", _SECRET)
    monkeypatch.setattr(auth.settings, "DEV_BYPASS_USER_ID", "")
    auth._cache.clear()
    yield
    auth._cache.clear()


async def test_dev_bypass_baslik_yoksa_id_doner(monkeypatch):
    monkeypatch.setattr(auth.settings, "DEV_BYPASS_USER_ID", "admin-42")
    assert await auth.current_user(None) == "admin-42"


async def test_dev_bypass_baslik_varsa_normal_dogrular(monkeypatch):
    monkeypatch.setattr(auth.settings, "DEV_BYPASS_USER_ID", "admin-42")
    assert await auth.current_user(f"Bearer {_token(sub='gercek')}") == "gercek"


async def test_gecerli_jeton_sub_doner():
    uid = await auth.current_user(f"Bearer {_token(sub='xyz')}")
    assert uid == "xyz"


async def test_bearer_yok_401():
    with pytest.raises(HTTPException) as e:
        await auth.current_user(None)
    assert e.value.status_code == 401


async def test_bozuk_jeton_401():
    with pytest.raises(HTTPException) as e:
        await auth.current_user("Bearer not-a-jwt")
    assert e.value.status_code == 401


async def test_yanlis_secret_401():
    kotu = jwt.encode({"sub": "x", "aud": "authenticated", "exp": int(time.time()) + 60},
                      "tamamen-baska-bir-secret-32-bytes-uzun", algorithm="HS256")
    with pytest.raises(HTTPException) as e:
        await auth.current_user(f"Bearer {kotu}")
    assert e.value.status_code == 401


async def test_suresi_gecmis_401():
    with pytest.raises(HTTPException) as e:
        await auth.current_user(f"Bearer {_token(exp_delta=-10)}")
    assert e.value.status_code == 401


async def test_cache_calisiyor(monkeypatch):
    tok = _token(sub="cache-me")
    assert await auth.current_user(f"Bearer {tok}") == "cache-me"
    # secret'ı boz — cache'ten dönmeli
    monkeypatch.setattr(auth.settings, "SUPABASE_JWT_SECRET", "artik-farkli")
    assert await auth.current_user(f"Bearer {tok}") == "cache-me"
