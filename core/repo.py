"""Supabase veri erişim katmanı. Tek veri kaynağı: `transactions` tablosu.

supabase-py senkron; çağrılar `asyncio.to_thread` ile sarılır.
"""
from __future__ import annotations

import asyncio
import logging
import secrets
from datetime import date

from supabase import Client, create_client

from core.config import settings
from core.dates import now
from core.models import (
    Budget,
    Candidate,
    Category,
    Goal,
    HaneUye,
    HaneUyelik,
    Household,
    Transaction,
)
from core.varsayilan_kategoriler import VARSAYILAN_KATEGORILER

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


def _kullanici_filtresi(q, user_id: str | list[str]):
    """Tek kullanıcı → .eq; birden çok (hane) → .in_."""
    if isinstance(user_id, str):
        return q.eq("user_id", user_id)
    return q.in_("user_id", list(user_id))


async def list_recent(user_id: str | list[str], n: int = 5) -> list[Transaction]:
    def _run() -> list[dict]:
        q = _db().table("transactions").select("*")
        q = _kullanici_filtresi(q, user_id)
        return (
            q.is_("deleted_at", "null")
            .order("created_at", desc=True)
            .limit(n)
            .execute()
            .data
        )

    return [Transaction.from_row(r) for r in await asyncio.to_thread(_run)]


async def list_period(
    user_id: str | list[str],
    baslangic: date,
    bitis: date,
    *,
    direction: str | None = None,
    tip: str | None = None,
) -> list[Transaction]:
    def _run() -> list[dict]:
        q = _db().table("transactions").select("*")
        q = _kullanici_filtresi(q, user_id)
        q = (
            q.is_("deleted_at", "null")
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


async def categories_seed(user_id: str, tipler: list[str] | None = None) -> int:
    """Kullanıcının hiç kategorisi yoksa: seçili bölümlerin varsayılan listesi +
    geçmiş işlemlerdeki kategoriler. Var olanı bozmaz (idempotent).

    `tipler` verilirse yalnız o bölümler seed'lenir (örn. yeni kullanıcıya sadece
    "kisisel"). None → hepsi.
    """
    izin = set(tipler) if tipler is not None else set(VARSAYILAN_KATEGORILER)

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
        eklendi: set[tuple[str, str]] = set()  # (tip, ad.lower()) — bölüm bazlı benzersiz
        for tip, ogeler in VARSAYILAN_KATEGORILER.items():
            if tip not in izin:
                continue
            for i, oge in enumerate(ogeler):
                ad = oge["name"]
                anahtar = (tip, ad.lower())
                if anahtar in eklendi:
                    continue
                eklendi.add(anahtar)
                satirlar.append({
                    "user_id": user_id, "name": ad, "type": tip,
                    "color": PALET[len(satirlar) % len(PALET)], "sort_order": i,
                    "keywords": list(oge.get("keywords", [])),
                })
        for ad, tip in gecmis.items():
            tip = tip if tip in VARSAYILAN_KATEGORILER else "kisisel"
            if tip not in izin:
                continue
            anahtar = (tip, ad.lower())
            if anahtar in eklendi:
                continue
            eklendi.add(anahtar)
            satirlar.append({
                "user_id": user_id, "name": ad, "type": tip,
                "color": PALET[len(satirlar) % len(PALET)], "sort_order": 50,
            })

        if not satirlar:
            return 0
        db.table("categories").insert(satirlar).execute()
        return len(satirlar)

    return await asyncio.to_thread(_run)


async def category_seed_tip(user_id: str, tip: str) -> int:
    """Bir bölümün varsayılan kategorilerinden kullanıcıda henüz olmayanları ekler.
    Kullanıcı sonradan "İşletme bölümü ekle" dediğinde çağrılır. Eklenen sayıyı döndürür.
    """
    if tip not in VARSAYILAN_KATEGORILER:
        return 0

    def _run() -> int:
        db = _db()
        mevcut = {
            (r.get("name") or "").lower()
            for r in db.table("categories").select("name")
            .eq("user_id", user_id).eq("type", tip).execute().data
        }
        satirlar: list[dict] = []
        for i, oge in enumerate(VARSAYILAN_KATEGORILER[tip]):
            if oge["name"].lower() in mevcut:
                continue
            satirlar.append({
                "user_id": user_id, "name": oge["name"], "type": tip,
                "color": PALET[i % len(PALET)], "sort_order": i,
                "keywords": list(oge.get("keywords", [])),
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
    """Kapsam başına tek satır: varsa güncelle, yoksa ekle.

    (budgets tablosundaki benzersizlik `coalesce(kapsam_deger,'')` ifade indeksi
    olduğu için PostgREST `on_conflict` kullanılamıyor — elle upsert.)
    """
    tutar = round(float(limit_amount), 2)

    def _run() -> dict:
        db = _db()
        q = db.table("budgets").select("id").eq("user_id", user_id).eq("kapsam", kapsam)
        q = q.is_("kapsam_deger", "null") if kapsam_deger is None else q.eq("kapsam_deger", kapsam_deger)
        mevcut = q.limit(1).execute().data
        if mevcut:
            return (
                db.table("budgets")
                .update({"limit_amount": tutar, "updated_at": now().isoformat()})
                .eq("id", mevcut[0]["id"])
                .execute().data[0]
            )
        return (
            db.table("budgets")
            .insert({
                "user_id": user_id, "kapsam": kapsam,
                "kapsam_deger": kapsam_deger, "limit_amount": tutar,
            })
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


# --------------------------------------------------------------------------- #
# push_tokens & notifications_sent (bildirim altyapısı)
# --------------------------------------------------------------------------- #
async def push_token_upsert(user_id: str, token: str, platform: str | None) -> None:
    def _run() -> None:
        _db().table("push_tokens").upsert(
            {"user_id": user_id, "token": token, "platform": platform,
             "updated_at": now().isoformat()},
            on_conflict="token",
        ).execute()

    await asyncio.to_thread(_run)


async def push_token_delete(token: str) -> None:
    def _run() -> None:
        _db().table("push_tokens").delete().eq("token", token).execute()

    await asyncio.to_thread(_run)


async def push_tokens_all() -> list[dict]:
    """Tüm kayıtlı token'lar (cron için). [{user_id, token, platform}]"""
    def _run() -> list[dict]:
        try:
            return _db().table("push_tokens").select("user_id,token,platform").execute().data
        except Exception:
            return []

    return await asyncio.to_thread(_run)


async def bildirim_gonderildi_mi(user_id: str, anahtar: str) -> bool:
    def _run() -> bool:
        res = (
            _db().table("notifications_sent").select("anahtar")
            .eq("user_id", user_id).eq("anahtar", anahtar).limit(1).execute()
        )
        return bool(res.data)

    return await asyncio.to_thread(_run)


async def bildirim_isaretle(user_id: str, anahtar: str) -> None:
    def _run() -> None:
        _db().table("notifications_sent").upsert(
            {"user_id": user_id, "anahtar": anahtar, "gonderildi_at": now().isoformat()},
            on_conflict="user_id,anahtar",
        ).execute()

    await asyncio.to_thread(_run)


# --------------------------------------------------------------------------- #
# households (hane / aile paylaşımı)
# --------------------------------------------------------------------------- #
_KOD_ALFABE = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # I, O, 0, 1 yok


def _kod_uret(n: int = 6) -> str:
    return "".join(secrets.choice(_KOD_ALFABE) for _ in range(n))


async def hane_uyeligi(user_id: str) -> HaneUyelik | None:
    """Kullanıcının hane üyeliği (hane bilgisi + kendi rolü) ya da None.
    Tablolar henüz yoksa / hata olursa None döner (havuzlama devre dışı, güvenli)."""
    def _run() -> HaneUyelik | None:
        db = _db()
        m = (
            db.table("household_members").select("household_id,rol")
            .eq("user_id", user_id).limit(1).execute()
        )
        if not m.data:
            return None
        hid = m.data[0]["household_id"]
        h = db.table("households").select("*").eq("id", hid).limit(1).execute()
        if not h.data:
            return None
        r = h.data[0]
        return HaneUyelik(
            household_id=hid, ad=r.get("ad", ""), kod=r.get("kod", ""),
            owner_id=r.get("owner_id", ""), rol=m.data[0]["rol"],
        )

    try:
        return await asyncio.to_thread(_run)
    except Exception:
        logger.warning("hane_uyeligi sorgusu başarısız (tablo yok?) → None")
        return None


async def hane_uyeleri(household_id: str) -> list[HaneUye]:
    def _run() -> list[dict]:
        return (
            _db().table("household_members").select("user_id,ad,rol")
            .eq("household_id", household_id).order("joined_at").execute().data
        )

    return [HaneUye.from_row(r) for r in await asyncio.to_thread(_run)]


async def hane_uye_idleri(household_id: str) -> list[str]:
    def _run() -> list[str]:
        rows = (
            _db().table("household_members").select("user_id")
            .eq("household_id", household_id).execute().data
        )
        return [r["user_id"] for r in rows]

    return await asyncio.to_thread(_run)


async def hane_olustur(user_id: str, ad: str, uye_adi: str) -> Household:
    def _run() -> dict:
        db = _db()
        for _ in range(6):
            kod = _kod_uret()
            try:
                h = db.table("households").insert(
                    {"ad": ad.strip(), "kod": kod, "owner_id": user_id}
                ).execute().data[0]
                break
            except Exception:
                continue
        else:
            raise RuntimeError("Hane kodu üretilemedi")
        db.table("household_members").insert(
            {"household_id": h["id"], "user_id": user_id,
             "ad": uye_adi.strip() or "Üye", "rol": "owner"}
        ).execute()
        return h

    return Household.from_row(await asyncio.to_thread(_run))


async def hane_kod_ile_bul(kod: str) -> Household | None:
    def _run() -> dict | None:
        res = (
            _db().table("households").select("*")
            .eq("kod", kod.strip().upper()).limit(1).execute()
        )
        return res.data[0] if res.data else None

    r = await asyncio.to_thread(_run)
    return Household.from_row(r) if r else None


async def hane_katil(user_id: str, household_id: str, uye_adi: str) -> None:
    """Üye ekler. `ux_hh_one_per_user` çakışması → exception (route 409'a çevirir)."""
    def _run() -> None:
        _db().table("household_members").insert(
            {"household_id": household_id, "user_id": user_id,
             "ad": uye_adi.strip() or "Üye", "rol": "editor"}
        ).execute()

    await asyncio.to_thread(_run)


async def hane_ad_guncelle(household_id: str, ad: str) -> None:
    def _run() -> None:
        _db().table("households").update({"ad": ad.strip()}).eq("id", household_id).execute()

    await asyncio.to_thread(_run)


async def hane_kod_yenile(household_id: str) -> str:
    def _run() -> str:
        db = _db()
        for _ in range(6):
            kod = _kod_uret()
            try:
                db.table("households").update({"kod": kod}).eq("id", household_id).execute()
                return kod
            except Exception:
                continue
        raise RuntimeError("Hane kodu üretilemedi")

    return await asyncio.to_thread(_run)


async def hane_uye_rol(household_id: str, hedef_user_id: str, rol: str) -> None:
    def _run() -> None:
        (
            _db().table("household_members").update({"rol": rol})
            .eq("household_id", household_id).eq("user_id", hedef_user_id).execute()
        )

    await asyncio.to_thread(_run)


async def hane_uye_cikar(household_id: str, hedef_user_id: str) -> None:
    def _run() -> None:
        (
            _db().table("household_members").delete()
            .eq("household_id", household_id).eq("user_id", hedef_user_id).execute()
        )

    await asyncio.to_thread(_run)


async def hane_sil(household_id: str) -> None:
    def _run() -> None:
        _db().table("households").delete().eq("id", household_id).execute()

    await asyncio.to_thread(_run)
