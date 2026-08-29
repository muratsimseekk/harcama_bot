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


@dataclass
class HedefIlerleme:
    kapsam: str            # 'genel' | 'kategori' | 'tip'
    kapsam_deger: str | None
    etiket: str
    limit: float
    harcanan: float
    oran: float            # 0–100+
    kalan: float
    durum: str             # 'iyi' | 'yaklasti' (>=80) | 'asti' (>=100)


def _bucket_durum(oran: float) -> str:
    if oran >= 100:
        return "asti"
    if oran >= 80:
        return "yaklasti"
    return "iyi"


def hedef_ilerleme(txs, budgets) -> list[HedefIlerleme]:
    """Dönem giderlerini bütçe kapsamlarına böler (budgets: list[core.models.Budget])."""
    giderler = [t for t in txs if t.direction == "gider"]
    toplam_gider = sum(t.tutar for t in giderler)
    kat_top: dict[str, float] = {}
    tip_top: dict[str, float] = {}
    for t in giderler:
        kat_top[t.kategori] = kat_top.get(t.kategori, 0.0) + t.tutar
        tip_top[t.tip] = tip_top.get(t.tip, 0.0) + t.tutar

    out: list[HedefIlerleme] = []
    for b in budgets:
        if b.kapsam == "genel":
            harcanan = toplam_gider
            etiket = "Toplam"
        elif b.kapsam == "kategori":
            harcanan = kat_top.get(b.kapsam_deger or "", 0.0)
            etiket = b.kapsam_deger or "?"
        else:  # tip
            harcanan = tip_top.get(b.kapsam_deger or "", 0.0)
            etiket = TIP_ETIKETI.get(b.kapsam_deger or "", b.kapsam_deger or "?")
        harcanan = round(harcanan, 2)
        oran = round(harcanan / b.limit_amount * 100, 1) if b.limit_amount else 0.0
        out.append(HedefIlerleme(
            kapsam=b.kapsam, kapsam_deger=b.kapsam_deger, etiket=etiket,
            limit=b.limit_amount, harcanan=harcanan, oran=oran,
            kalan=round(b.limit_amount - harcanan, 2), durum=_bucket_durum(oran),
        ))
    # genel önce, sonra tutara göre
    out.sort(key=lambda h: (h.kapsam != "genel", -h.harcanan))
    return out


def yatirim_ilerleme(txs, hedef_amount: float) -> dict:
    """Dönemde 'yatirim' tipi giderlerin toplamı = birikmiş."""
    birikmis = round(sum(t.tutar for t in txs if t.direction == "gider" and t.tip == "yatirim"), 2)
    oran = round(birikmis / hedef_amount * 100, 1) if hedef_amount else 0.0
    return {
        "hedef": round(hedef_amount, 2),
        "birikmis": birikmis,
        "kalan": round(max(0.0, hedef_amount - birikmis), 2),
        "oran": oran,
    }
