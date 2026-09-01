"""budget_upsert elle upsert yapmalı (PostgREST on_conflict yok — ifade indeksi).

Regresyon: `.upsert(on_conflict="user_id,kapsam,kapsam_deger")` 42P10 veriyordu
çünkü benzersizlik `coalesce(kapsam_deger,'')` ifade indeksi.
"""
from __future__ import annotations

import pytest

from core import repo


class _FakeQuery:
    def __init__(self, log: list[str], sonuc: list[dict]):
        self._log = log
        self._sonuc = sonuc

    def select(self, *a):
        self._log.append("select")
        return self

    def insert(self, row):
        self._log.append("insert")
        self._sonuc = [{"id": "yeni", **row}]
        return self

    def update(self, row):
        self._log.append("update")
        self._sonuc = [{
            "id": "mevcut", "user_id": "u1", "kapsam": "genel",
            "kapsam_deger": None, "period": "month", **row,
        }]
        return self

    def eq(self, *a):
        return self

    def is_(self, *a):
        return self

    def limit(self, *a):
        return self

    def execute(self):
        return type("R", (), {"data": self._sonuc})()


class _FakeDB:
    def __init__(self, mevcut: list[dict]):
        self.log: list[str] = []
        self._mevcut = mevcut

    def table(self, _ad):
        return _FakeQuery(self.log, list(self._mevcut))


@pytest.mark.asyncio
async def test_budget_upsert_yoksa_insert(monkeypatch):
    db = _FakeDB(mevcut=[])
    monkeypatch.setattr(repo, "_db", lambda: db)
    b = await repo.budget_upsert("u1", "kategori", "Market", 2000)
    assert "insert" in db.log and "update" not in db.log
    assert b.limit_amount == 2000
    assert "on_conflict" not in "".join(db.log)


@pytest.mark.asyncio
async def test_budget_upsert_varsa_update(monkeypatch):
    db = _FakeDB(mevcut=[{"id": "mevcut"}])
    monkeypatch.setattr(repo, "_db", lambda: db)
    b = await repo.budget_upsert("u1", "genel", None, 55000)
    assert "update" in db.log and "insert" not in db.log
    assert b.limit_amount == 55000
