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
from core.models import Budget, Candidate, Category, Goal, Transaction

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


# --------------------------------------------------------------------------- #
# categories (düzenlenebilir kategori sistemi)
# --------------------------------------------------------------------------- #
# Mobil uygulama paletiyle aynı sıra (mobile/lib/theme.ts PALET) — kategori
# renkleri hem grafikte hem listede tutarlı görünsün.
PALET = [
    "#D97757", "#C15F3C", "#7A9E7E", "#61758A", "#C99A4E", "#9B8FB0",
    "#A56E5A", "#6E8B8A", "#B0894B", "#5F8A6B", "#8C6D9C", "#7C8B3E",
]

VARSAYILAN_KATEGORILER: dict[str, list[str]] = {
    "kisisel": [
        "Market", "Sigara/İçecek", "Kafe/Restoran", "Ulaşım", "Sağlık",
        "Giyim", "Eğlence", "Fatura", "Telefon/İnternet", "Diğer",
    ],
    "isletme": [
        "Hammadde", "Nakliye", "Personel", "Yakıt/Araç", "Elektrik/Su",
        "Kira", "Makine/Ekipman", "Galvaniz", "Diğer İşletme",
    ],
    "yatirim": [
        "BES/Emeklilik", "Hisse Senedi", "Kripto Para", "Altın/Döviz",
        "Yatırım Fonu", "Tahvil/Bono", "Diğer Yatırım",
    ],
}


async def categories_list(user_id: str, *, only_active: bool = True) -> list[Category]:
    def _run() -> list[dict]:
        q = _db().table("categories").select("*").eq("user_id", user_id)
        if only_active:
            q = q.eq("is_active", True)
        return q.order("type").order("sort_order").order("name").execute().data

    return [Category.from_row(r) for r in await asyncio.to_thread(_run)]


async def category_create(
    user_id: str, name: str, tip: str, color: str | None = None,
    keywords: list[str] | None = None,
) -> Category:
    row = {
        "user_id": user_id,
        "name": name.strip(),
        "type": tip,
        "color": color or PALET[abs(hash(name)) % len(PALET)],
        "keywords": keywords or [],
    }

    def _run() -> dict:
        return _db().table("categories").insert(row).execute().data[0]

    return Category.from_row(await asyncio.to_thread(_run))


async def category_get(cat_id: str) -> Category | None:
    def _run() -> dict | None:
        res = _db().table("categories").select("*").eq("id", cat_id).limit(1).execute()
        return res.data[0] if res.data else None

    r = await asyncio.to_thread(_run)
    return Category.from_row(r) if r else None


async def category_update(cat_id: str, alanlar: dict) -> Category | None:
    if not alanlar:
        return await category_get(cat_id)
    alanlar = {**alanlar, "updated_at": now().isoformat()}

    def _run() -> dict | None:
        res = _db().table("categories").update(alanlar).eq("id", cat_id).execute()
        return res.data[0] if res.data else None

    r = await asyncio.to_thread(_run)
    return Category.from_row(r) if r else None


async def category_delete(cat_id: str) -> bool:
    def _run() -> bool:
        res = _db().table("categories").delete().eq("id", cat_id).execute()
        return bool(res.data)

    return await asyncio.to_thread(_run)


async def categories_seed(user_id: str) -> int:
    """Kullanıcının hiç kategorisi yoksa: varsayılan liste + geçmişteki kategoriler.
    Var olanı bozmaz (idempotent). Eklenen satır sayısını döndürür.
    """
    def _run() -> int:
        db = _db()
        mevcut = db.table("categories").select("id").eq("user_id", user_id).limit(1).execute()
        if mevcut.data:
            return 0

        # geçmiş işlemlerdeki (kategori, tip) çiftleri
        gecmis: dict[str, str] = {}
        bas = 0
        while True:
            res = (
                db.table("transactions")
                .select("category,type")
                .eq("user_id", user_id).eq("direction", "gider")
                .range(bas, bas + 999).execute()
            )
            for r in res.data:
                ad = (r.get("category") or "").strip()
                if ad:
                    gecmis.setdefault(ad, r.get("type") or "kisisel")
            if len(res.data) < 1000:
                break
            bas += 1000

        satirlar: list[dict] = []
        eklendi: set[str] = set()
        for tip, adlar in VARSAYILAN_KATEGORILER.items():
            for i, ad in enumerate(adlar):
                if ad.lower() in eklendi:
                    continue
                eklendi.add(ad.lower())
                satirlar.append({
                    "user_id": user_id, "name": ad, "type": tip,
                    "color": PALET[len(satirlar) % len(PALET)], "sort_order": i,
                })
        for ad, tip in gecmis.items():
            if ad.lower() in eklendi:
                continue
            eklendi.add(ad.lower())
            satirlar.append({
                "user_id": user_id, "name": ad,
                "type": tip if tip in VARSAYILAN_KATEGORILER else "kisisel",
                "color": PALET[len(satirlar) % len(PALET)], "sort_order": 50,
            })

        if not satirlar:
            return 0
        db.table("categories").insert(satirlar).execute()
        return len(satirlar)

    return await asyncio.to_thread(_run)


# --------------------------------------------------------------------------- #
# budgets & goals (bütçe / hedef)
# --------------------------------------------------------------------------- #
async def budgets_list(user_id: str) -> list[Budget]:
    def _run() -> list[dict]:
        return (
            _db().table("budgets").select("*").eq("user_id", user_id)
            .order("kapsam").execute().data
        )

    return [Budget.from_row(r) for r in await asyncio.to_thread(_run)]


async def budget_get(bid: str) -> Budget | None:
    def _run() -> dict | None:
        res = _db().table("budgets").select("*").eq("id", bid).limit(1).execute()
        return res.data[0] if res.data else None

    r = await asyncio.to_thread(_run)
    return Budget.from_row(r) if r else None


async def budget_upsert(user_id: str, kapsam: str, kapsam_deger: str | None, limit_amount: float) -> Budget:
    row = {
        "user_id": user_id, "kapsam": kapsam,
        "kapsam_deger": kapsam_deger, "limit_amount": round(float(limit_amount), 2),
        "updated_at": now().isoformat(),
    }

    def _run() -> dict:
        return (
            _db().table("budgets")
            .upsert(row, on_conflict="user_id,kapsam,kapsam_deger")
            .execute().data[0]
        )

    return Budget.from_row(await asyncio.to_thread(_run))


async def budget_delete(bid: str) -> bool:
    def _run() -> bool:
        return bool(_db().table("budgets").delete().eq("id", bid).execute().data)

    return await asyncio.to_thread(_run)


async def goal_get(user_id: str, tip: str = "yatirim") -> Goal | None:
    def _run() -> dict | None:
        res = (
            _db().table("goals").select("*")
            .eq("user_id", user_id).eq("tip", tip).limit(1).execute()
        )
        return res.data[0] if res.data else None

    r = await asyncio.to_thread(_run)
    return Goal.from_row(r) if r else None


async def goal_upsert(user_id: str, hedef_amount: float, tip: str = "yatirim") -> Goal:
    row = {
        "user_id": user_id, "tip": tip, "period": "month",
        "hedef_amount": round(float(hedef_amount), 2), "updated_at": now().isoformat(),
    }

    def _run() -> dict:
        return (
            _db().table("goals")
            .upsert(row, on_conflict="user_id,tip,period")
            .execute().data[0]
        )

    return Goal.from_row(await asyncio.to_thread(_run))


async def goal_delete(user_id: str, tip: str = "yatirim") -> bool:
    def _run() -> bool:
        return bool(
            _db().table("goals").delete()
            .eq("user_id", user_id).eq("tip", tip).execute().data
        )

    return await asyncio.to_thread(_run)
