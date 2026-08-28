"""İşlem listesinden özet (dashboard + rapor). Saf fonksiyon — I/O yok."""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date

from core.models import TIP_ETIKETI, Transaction, TxType


@dataclass
class TipKirilim:
    tip: TxType
    etiket: str
    tutar: float
    adet: int
    oran: float  # gider toplamına oran (0–100)


@dataclass
class KategoriKirilim:
    kategori: str
    tip: TxType
    tutar: float
    adet: int
    oran: float


@dataclass
class GunlukNokta:
    tarih: date
    gider: float
    gelir: float


@dataclass
class Ozet:
    toplam_gider: float = 0.0
    toplam_gelir: float = 0.0
    net: float = 0.0
    adet: int = 0
    tip_kirilim: list[TipKirilim] = field(default_factory=list)
    kategori_kirilim: list[KategoriKirilim] = field(default_factory=list)
    gunluk: list[GunlukNokta] = field(default_factory=list)


def _oran(pay: float, toplam: float) -> float:
    return round(pay / toplam * 100, 1) if toplam else 0.0


def ozetle(txs: list[Transaction]) -> Ozet:
    """Giderleri tip/kategori/gün bazında toplar; gelir ayrı tutulur."""
    giderler = [t for t in txs if t.direction == "gider"]
    gelirler = [t for t in txs if t.direction == "gelir"]

    toplam_gider = round(sum(t.tutar for t in giderler), 2)
    toplam_gelir = round(sum(t.tutar for t in gelirler), 2)

    tip_top: dict[str, list[float]] = {}  # tip -> [tutar, adet]
    for t in giderler:
        acc = tip_top.setdefault(t.tip, [0.0, 0])
        acc[0] += t.tutar
        acc[1] += 1
    tip_kirilim = [
        TipKirilim(
            tip=tip,  # type: ignore[arg-type]
            etiket=TIP_ETIKETI.get(tip, tip),
            tutar=round(tut, 2),
            adet=ad,
            oran=_oran(tut, toplam_gider),
        )
        for tip, (tut, ad) in sorted(tip_top.items(), key=lambda kv: kv[1][0], reverse=True)
    ]

    kat_top: dict[tuple[str, str], list[float]] = {}
    for t in giderler:
        anahtar = (t.kategori or "Diğer", t.tip)
        acc = kat_top.setdefault(anahtar, [0.0, 0])
        acc[0] += t.tutar
        acc[1] += 1
    kategori_kirilim = [
        KategoriKirilim(
            kategori=kat,
            tip=tip,  # type: ignore[arg-type]
            tutar=round(tut, 2),
            adet=ad,
            oran=_oran(tut, toplam_gider),
        )
        for (kat, tip), (tut, ad) in sorted(
            kat_top.items(), key=lambda kv: kv[1][0], reverse=True
        )
    ]

    gun_top: dict[date, list[float]] = {}  # tarih -> [gider, gelir]
    for t in txs:
        acc = gun_top.setdefault(t.tarih, [0.0, 0.0])
        if t.direction == "gelir":
            acc[1] += t.tutar
        else:
            acc[0] += t.tutar
    gunluk = [
        GunlukNokta(tarih=g, gider=round(v[0], 2), gelir=round(v[1], 2))
        for g, v in sorted(gun_top.items())
    ]

    return Ozet(
        toplam_gider=toplam_gider,
        toplam_gelir=toplam_gelir,
        net=round(toplam_gelir - toplam_gider, 2),
        adet=len(txs),
        tip_kirilim=tip_kirilim,
        kategori_kirilim=kategori_kirilim,
        gunluk=gunluk,
    )
