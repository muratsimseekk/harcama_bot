"""Geçmiş TCMB kurlarını `kurlar` tablosuna doldurur (bir kerelik; tekrar çalıştırmak güvenli).

Kullanım:  python scripts/kur_doldur.py [BAŞLANGIÇ]     (varsayılan 2026-01-01)
"""
from __future__ import annotations

import asyncio
import sys
from datetime import date, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from dotenv import load_dotenv  # noqa: E402

load_dotenv()

from core import kur  # noqa: E402
from core.dates import today  # noqa: E402


async def main() -> None:
    bas = date.fromisoformat(sys.argv[1]) if len(sys.argv) > 1 else date(2026, 1, 1)
    bit = today()
    g = bas
    while g <= bit:
        son = min(bit, g + timedelta(days=30))
        await kur.kurlar(g, son, en_cok=40)
        g = son + timedelta(days=1)
        print(f"{son}: önbellekte {len(kur._bellek)} iş günü")
    k = await kur.guncel_kur()
    print("güncel:", k)


if __name__ == "__main__":
    asyncio.run(main())
