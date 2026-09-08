import pytest


@pytest.fixture(autouse=True)
def _hane_yok(monkeypatch):
    """Varsayılan: kullanıcı bir hanede değil. Hane testleri bunu kendi override eder."""
    from api import deps
    from core import repo

    async def _uyelik_yok(user_id):
        return None

    async def _bos(*a, **k):
        return []

    monkeypatch.setattr(repo, "hane_uyeligi", _uyelik_yok)
    monkeypatch.setattr(repo, "hane_uye_idleri", _bos)
    monkeypatch.setattr(repo, "hane_uyeleri", _bos)
    deps._uyelik_cache.clear()
    yield
    deps._uyelik_cache.clear()
