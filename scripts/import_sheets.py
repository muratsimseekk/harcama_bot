"""Tek seferlik: eski Google Sheets verisini Supabase `transactions` tablosuna taşır.

Kullanım:
    .venv/bin/python -m scripts.import_sheets            # kuru çalışma (yazmaz)
    .venv/bin/python -m scripts.import_sheets --write     # gerçekten yazar (idempotent)

Gerekli env: GOOGLE_SHEETS_ID, GOOGLE_CREDENTIALS_JSON, SUPABASE_URL, SUPABASE_SERVICE_KEY,
IZIN_VERILEN_KULLANICI_ID.
"""
import sys

from core import repo
from core.config import settings
from core.dates import AYLAR_TR, tarih_parse, today
from core.models import tip_normalize

# Eski modül — henüz silinmedi; Google Sheets okuması için kullanılıyor.
from rapor import _sayfa_verilerini_al, _sheets_baglantisi  # noqa: E402


def _sheet_kayitlari() -> list[dict]:
    sheets = _sheets_baglantisi()
    bugun = today()
    kayitlar: list[dict] = []
    for yil in (2025, 2026):
        for ay_no in range(1, 13):
            if yil == bugun.year and ay_no > bugun.month:
                break
            sayfa = f"{AYLAR_TR[ay_no]} {yil}"
            satirlar = _sayfa_verilerini_al(sheets, sayfa)
            if satirlar:
                print(f"  {sayfa}: {len(satirlar)} satır")
            for s in satirlar:
                if not s.get("tutar") or float(s["tutar"]) <= 0:
                    continue
                kayitlar.append({
                    "user_id": str(settings.IZIN_VERILEN_KULLANICI_ID),
                    "direction": "gider",
                    "type": tip_normalize(s.get("tip", "kisisel")),
                    "category": (s.get("kategori") or "Diğer").strip(),
                    "description": (s.get("aciklama") or "—").strip(),
                    "amount": round(float(s["tutar"]), 2),
                    "currency": "TRY",
                    "occurred_on": tarih_parse(s.get("tarih", "")).isoformat(),
                    "source": "import",
                })
    return kayitlar


def _mevcut_anahtarlar(user_id: str) -> set[tuple]:
    db = repo._db()
    var = set()
    bas = 0
    while True:
        res = (
            db.table("transactions")
            .select("occurred_on,description,amount,type")
            .eq("user_id", user_id).eq("source", "import")
            .range(bas, bas + 999).execute()
        )
        for r in res.data:
            var.add((r["occurred_on"], r["description"], float(r["amount"]), r["type"]))
        if len(res.data) < 1000:
            break
        bas += 1000
    return var


def _ozet(kayitlar: list[dict], baslik: str) -> None:
    print(f"\n{baslik}: {len(kayitlar)} kayıt")
    for tip in ("kisisel", "isletme", "yatirim"):
        alt = [k for k in kayitlar if k["type"] == tip]
        if alt:
            print(f"  {tip:9}: {len(alt):4} kayıt  {sum(k['amount'] for k in alt):>14,.2f} ₺")
    print(f"  {'TOPLAM':9}: {len(kayitlar):4} kayıt  {sum(k['amount'] for k in kayitlar):>14,.2f} ₺")


def main() -> None:
    yaz = "--write" in sys.argv
    print("Google Sheets okunuyor...")
    kayitlar = _sheet_kayitlari()
    _ozet(kayitlar, "Sheet'ten okunan")

    user_id = str(settings.IZIN_VERILEN_KULLANICI_ID)
    mevcut = _mevcut_anahtarlar(user_id)
    yeni = [
        k for k in kayitlar
        if (k["occurred_on"], k["description"], k["amount"], k["type"]) not in mevcut
    ]
    _ozet(yeni, "Supabase'e yazılacak (yeni)")
    print(f"  (zaten var: {len(kayitlar) - len(yeni)})")

    if not yaz:
        print("\n[kuru çalışma] --write ile gerçek aktarım yapılır.")
        return
    if not yeni:
        print("\nYazılacak yeni kayıt yok.")
        return

    db = repo._db()
    for i in range(0, len(yeni), 500):
        db.table("transactions").insert(yeni[i:i + 500]).execute()
        print(f"  yazıldı {min(i + 500, len(yeni))}/{len(yeni)}")
    print("\n✅ Aktarım tamam. Supabase Table Editor'da kontrol et.")


if __name__ == "__main__":
    main()
