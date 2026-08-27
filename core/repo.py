"""Supabase veri erişim katmanı. Tek veri kaynağı: `transactions` tablosu.

supabase-py senkron; çağrılar `asyncio.to_thread` ile sarılır.
"""
from __future__ import annotations

import asyncio
import logging
from datetime import date

from supabase import Client, create_client

from core.config import settings
from core.dates import now
from core.models import Candidate, Transaction

logger = logging.getLogger(__name__)

_client: Client | None = None


def _db() -> Client:
    global _client
    if _client is None:
        if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_KEY:
            raise RuntimeError("SUPABASE_URL / SUPABASE_SERVICE_KEY tanımlı değil")
        _client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    return _client


# --------------------------------------------------------------------------- #
# transactions
# --------------------------------------------------------------------------- #
async def add(aday: Candidate, user_id: str) -> Transaction:
    occurred_at = now() if aday.tarih == now().date() else None
    row = aday.to_row(user_id, occurred_at)

    def _run() -> dict:
        res = _db().table("transactions").insert(row).execute()
        return res.data[0]

    return Transaction.from_row(await asyncio.to_thread(_run))


async def add_many(adaylar: list[Candidate], user_id: str) -> list[Transaction]:
    n = now()
    rows = [
        a.to_row(user_id, n if a.tarih == n.date() else None)
        for a in adaylar
    ]

    def _run() -> list[dict]:
        res = _db().table("transactions").insert(rows).execute()
        return res.data

    return [Transaction.from_row(r) for r in await asyncio.to_thread(_run)]


async def get(tx_id: str) -> Transaction | None:
    def _run() -> dict | None:
        res = (
            _db().table("transactions")
            .select("*")
            .eq("id", tx_id)
            .is_("deleted_at", "null")
            .limit(1)
            .execute()
        )
        return res.data[0] if res.data else None

    r = await asyncio.to_thread(_run)
    return Transaction.from_row(r) if r else None


async def update(tx_id: str, alanlar: dict) -> Transaction | None:
    """alanlar: {'amount': .., 'category': .., 'type': .., 'direction': .., 'occurred_on': ..}"""
    if not alanlar:
        return await get(tx_id)
    alanlar = {**alanlar, "updated_at": now().isoformat()}

    def _run() -> dict | None:
        res = _db().table("transactions").update(alanlar).eq("id", tx_id).execute()
        return res.data[0] if res.data else None

    r = await asyncio.to_thread(_run)
    return Transaction.from_row(r) if r else None


async def soft_delete(tx_id: str) -> bool:
    def _run() -> bool:
        res = (
            _db().table("transactions")
            .update({"deleted_at": now().isoformat()})
            .eq("id", tx_id)
            .execute()
        )
        return bool(res.data)

    return await asyncio.to_thread(_run)


async def list_recent(user_id: str, n: int = 5) -> list[Transaction]:
    def _run() -> list[dict]:
        res = (
            _db().table("transactions")
            .select("*")
            .eq("user_id", user_id)
            .is_("deleted_at", "null")
            .order("created_at", desc=True)
            .limit(n)
            .execute()
        )
        return res.data

    return [Transaction.from_row(r) for r in await asyncio.to_thread(_run)]


async def list_period(
    user_id: str,
    baslangic: date,
    bitis: date,
    *,
    direction: str | None = None,
    tip: str | None = None,
) -> list[Transaction]:
    def _run() -> list[dict]:
        q = (
            _db().table("transactions")
            .select("*")
            .eq("user_id", user_id)
            .is_("deleted_at", "null")
            .gte("occurred_on", baslangic.isoformat())
            .lte("occurred_on", bitis.isoformat())
        )
        if direction and direction != "hepsi":
            q = q.eq("direction", direction)
        if tip and tip != "hepsi":
            q = q.eq("type", tip)
        return q.order("occurred_on", desc=False).execute().data

    return [Transaction.from_row(r) for r in await asyncio.to_thread(_run)]


# --------------------------------------------------------------------------- #
# pending_transactions (onay akışı — restart'a dayanır)
# --------------------------------------------------------------------------- #
async def pending_create(user_id: str, chat_id: int, message_id: int, payload: dict) -> str:
    def _run() -> str:
        res = _db().table("pending_transactions").insert({
            "user_id": user_id,
            "chat_id": chat_id,
            "message_id": message_id,
            "payload": payload,
        }).execute()
        return res.data[0]["id"]

    return await asyncio.to_thread(_run)


async def pending_get(pending_id: str) -> dict | None:
    def _run() -> dict | None:
        res = (
            _db().table("pending_transactions")
            .select("*").eq("id", pending_id).limit(1).execute()
        )
        return res.data[0] if res.data else None

    return await asyncio.to_thread(_run)


async def pending_delete(pending_id: str) -> None:
    def _run() -> None:
        _db().table("pending_transactions").delete().eq("id", pending_id).execute()

    await asyncio.to_thread(_run)


async def pending_set_message(pending_id: str, chat_id: int, message_id: int) -> None:
    def _run() -> None:
        _db().table("pending_transactions").update(
            {"chat_id": chat_id, "message_id": message_id}
        ).eq("id", pending_id).execute()

    await asyncio.to_thread(_run)
