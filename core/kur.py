"""Döviz kurları (USD/EUR → TL) — her işlem kendi gününün kuruyla çevrilir.

Kaynak: TCMB günlük bülteni (döviz satış, `ForexSelling`). İş günleri ~15:30'da yayınlanır;
hafta sonu / resmi tatilde bülten yoktur (arşiv 404) → o gün için son iş gününün kuru geçerli.
TCMB'ye ulaşılamazsa yedek: Avrupa Merkez Bankası referans kurları (frankfurter.dev).

Kurlar `kurlar` tablosunda kalıcı tutulur (scripts/schema_kurlar.sql) + süreç içi önbellek.
Tablo yoksa yalnız önbellekle çalışır. Eksik günler istek anında çekilir; geçmişin toplu
doldurulması: `python scripts/kur_doldur.py`.
"""
from __future__ import annotations

import asyncio
import logging
import time
import xml.etree.ElementTree as ET
from dataclasses import dataclass, replace
from datetime import date, datetime, timedelta

import httpx

from core.dates import today

logger = logging.getLogger(__name__)

PARALAR = ("USD", "EUR")
TCMB_BUGUN = "https://www.tcmb.gov.tr/kurlar/today.xml"
TCMB_ARSIV = "https://www.tcmb.gov.tr/kurlar/{ym}/{dmy}.xml"
YEDEK = "https://api.frankfurter.dev/v1/{bas}..{bit}?from=EUR&to=TRY,USD"
ISTEK_BASINA_EN_COK = 25  # bir API isteği en çok bu kadar eksik günü kaynaktan çeker


@dataclass(frozen=True)
class Kur:
    tarih: date  # bültenin tarihi (hafta sonu için önceki iş günü)
    USD: float  # 1 USD kaç TL
    EUR: float
    kaynak: str = "tcmb"

    def deger(self, para: str) -> float:
        return self.USD if para == "USD" else self.EUR


_bellek: dict[date, Kur] = {}
_yok: dict[date, float] = {}  # bülteni olmayan gün → ne zaman denendi (tatil kalıcı, yakın gün 1 sa)
_kilit = asyncio.Lock()


# --------------------------------------------------------------------------- #
# kaynaklar
# --------------------------------------------------------------------------- #
def tcmb_coz(xml: str) -> Kur | None:
    kok = ET.fromstring(xml)
    tarih = datetime.strptime(kok.attrib["Tarih"], "%d.%m.%Y").date()
    d: dict[str, float] = {}
    for c in kok.findall("Currency"):
        kod = c.attrib.get("CurrencyCode") or c.attrib.get("Kod")
        if kod in PARALAR:
            deger = (c.findtext("ForexSelling") or "").strip()
            birim = float((c.findtext("Unit") or "1").strip() or 1)
            if deger:
                d[kod] = float(deger) / birim
    if not all(p in d for p in PARALAR):
        return None
    return Kur(tarih=tarih, USD=d["USD"], EUR=d["EUR"], kaynak="tcmb")


async def _tcmb_gun(c: httpx.AsyncClient, g: date) -> Kur | None | bool:
    """Kur, None (o gün bülten yok) ya da False (ulaşılamadı)."""
    url = TCMB_BUGUN if g == today() else TCMB_ARSIV.format(ym=g.strftime("%Y%m"), dmy=g.strftime("%d%m%Y"))
    try:
        r = await c.get(url)
        if r.status_code == 404:
            return None
        r.raise_for_status()
        k = tcmb_coz(r.text)
        # today.xml yayından önce dünün bültenini döndürür → bugüne yazma
        return k if k and k.tarih == g else None
    except Exception as e:
        logger.warning("TCMB kur alınamadı %s: %s", g, e)
        return False


async def _yedek_aralik(c: httpx.AsyncClient, bas: date, bit: date) -> list[Kur]:
    try:
        r = await c.get(YEDEK.format(bas=bas.isoformat(), bit=bit.isoformat()))
        r.raise_for_status()
        out = []
        for gun, k in (r.json().get("rates") or {}).items():
            eur_try, eur_usd = k.get("TRY"), k.get("USD")
            if eur_try and eur_usd:
                out.append(Kur(tarih=date.fromisoformat(gun), USD=eur_try / eur_usd, EUR=eur_try, kaynak="ecb"))
        return out
    except Exception as e:
        logger.warning("yedek kur alınamadı %s..%s: %s", bas, bit, e)
        return []


# --------------------------------------------------------------------------- #
# kalıcı tablo (yoksa sessizce atlanır)
# --------------------------------------------------------------------------- #
async def _db_oku(bas: date, bit: date) -> list[Kur]:
    from core import repo

    try:
        return await repo.kurlar_aralik(bas, bit)
    except Exception as e:
        logger.debug("kurlar tablosu okunamadı: %s", e)
        return []


async def _db_yaz(kurlar: list[Kur]) -> None:
    from core import repo

    if not kurlar:
        return
    try:
        await repo.kurlar_yaz(kurlar)
    except Exception as e:
        logger.warning("kurlar tablosuna yazılamadı: %s", e)


# --------------------------------------------------------------------------- #
# ana API
# --------------------------------------------------------------------------- #
def _denenmeli(g: date) -> bool:
    if g.weekday() >= 5 or g in _bellek:
        return False
    t = _yok.get(g)
    if t is None:
        return True
    # Yakın günler (bugün yayın 15:30'da, dün geç yüklenmiş olabilir) saatte bir yeniden denenir.
    return (today() - g).days <= 3 and time.time() - t > 3600


async def _tamamla(bas: date, bit: date, en_cok: int) -> None:
    bit = min(bit, today())
    if bas > bit:
        return
    gunler = [bas + timedelta(days=i) for i in range((bit - bas).days + 1)]
    if not any(_denenmeli(g) for g in gunler):
        return
    async with _kilit:
        for k in await _db_oku(bas, bit):
            _bellek[k.tarih] = k
        eksik = [g for g in gunler if _denenmeli(g)][-en_cok:]  # en yeniler önce gelsin
        if not eksik:
            return
        yeni: list[Kur] = []
        ulasilamadi: list[date] = []
        sinir = asyncio.Semaphore(6)
        async with httpx.AsyncClient(timeout=10, follow_redirects=True) as c:
            async def tek(g: date):
                async with sinir:
                    return g, await _tcmb_gun(c, g)

            for g, sonuc in await asyncio.gather(*(tek(g) for g in eksik)):
                if isinstance(sonuc, Kur):
                    yeni.append(sonuc)
                elif sonuc is None:
                    _yok[g] = time.time()
                else:
                    ulasilamadi.append(g)
            if ulasilamadi:
                for k in await _yedek_aralik(c, min(ulasilamadi), max(ulasilamadi)):
                    if k.tarih in ulasilamadi:
                        yeni.append(k)
        for k in yeni:
            _bellek[k.tarih] = k
        await _db_yaz(yeni)


async def kurlar(bas: date, bit: date, *, en_cok: int = ISTEK_BASINA_EN_COK) -> dict[date, Kur]:
    """[bas, bit] aralığındaki her gün için geçerli kur. Bülteni olmayan gün önceki iş
    gününün kurunu alır; aralığın başından önce hiç kur yoksa ilk bilinen kullanılır."""
    await _tamamla(bas - timedelta(days=10), bit, en_cok)
    bilinen = sorted(_bellek)
    if not bilinen:
        return {}
    out: dict[date, Kur] = {}
    son = next((_bellek[g] for g in reversed(bilinen) if g <= bas), _bellek[bilinen[0]])
    g = bas
    while g <= bit:
        son = _bellek.get(g, son)
        out[g] = son
        g += timedelta(days=1)
    return out


async def guncel_kur() -> Kur | None:
    b = today()
    k = await kurlar(b, b)
    return k.get(b)


def cevir(txs, para: str, tablo: dict[date, Kur]):
    """TL işlemleri `para` cinsine çevirir (her işlem kendi gününün kuru). Kopya döner."""
    if para == "TRY":
        return list(txs)
    out = []
    for t in txs:
        k = tablo.get(t.tarih)
        if k is None or (t.para_birimi or "TRY") != "TRY":
            out.append(t)
            continue
        out.append(replace(t, tutar=round(t.tutar / k.deger(para), 2), para_birimi=para))
    return out


def _sifirla_bellek() -> None:  # testler için
    _bellek.clear()
    _yok.clear()


