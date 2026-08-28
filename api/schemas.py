"""API istek/yanıt modelleri (Pydantic). `core.models` ile eşlenir."""
from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field

from core.models import Candidate, Category, Transaction
from core.summary import Ozet

Tip = Literal["kisisel", "isletme", "yatirim"]
Yon = Literal["gider", "gelir"]


class AdayModel(BaseModel):
    aciklama: str
    tutar: float = Field(gt=0)
    kategori: str
    tip: Tip = "kisisel"
    direction: Yon = "gider"
    tarih: date
    para_birimi: str = "TRY"
    emin: bool = True
    inceleme_sebepleri: list[str] = Field(default_factory=list)

    @classmethod
    def from_candidate(cls, c: Candidate) -> AdayModel:
        return cls(
            aciklama=c.aciklama, tutar=c.tutar, kategori=c.kategori, tip=c.tip,
            direction=c.direction, tarih=c.tarih, para_birimi=c.para_birimi,
            emin=c.emin, inceleme_sebepleri=list(c.inceleme_sebepleri),
        )

    def to_candidate(self, kaynak: str) -> Candidate:
        return Candidate(
            aciklama=self.aciklama, tutar=self.tutar, kategori=self.kategori, tip=self.tip,
            direction=self.direction, tarih=self.tarih, para_birimi=self.para_birimi,
            emin=self.emin, kaynak=kaynak, inceleme_sebepleri=list(self.inceleme_sebepleri),
        )


class CaptureYanit(BaseModel):
    candidates: list[AdayModel]
    needs_review: bool
    transcript: str | None = None


class IslemOlusturIstek(BaseModel):
    candidates: list[AdayModel] = Field(min_length=1)


class IslemModel(BaseModel):
    id: str
    direction: Yon
    tip: Tip
    kategori: str
    aciklama: str
    tutar: float
    para_birimi: str
    tarih: date
    kaynak: str
    created_at: datetime | None = None

    @classmethod
    def from_tx(cls, t: Transaction) -> IslemModel:
        return cls(
            id=t.id, direction=t.direction, tip=t.tip, kategori=t.kategori,
            aciklama=t.aciklama, tutar=t.tutar, para_birimi=t.para_birimi,
            tarih=t.tarih, kaynak=t.kaynak, created_at=t.created_at,
        )


class IslemGuncelleIstek(BaseModel):
    tutar: float | None = Field(default=None, gt=0)
    kategori: str | None = None
    aciklama: str | None = None
    tip: Tip | None = None
    direction: Yon | None = None
    tarih: date | None = None

    def kolonlar(self) -> dict:
        m = {
            "tutar": ("amount", lambda v: round(float(v), 2)),
            "kategori": ("category", str),
            "aciklama": ("description", str),
            "tip": ("type", str),
            "direction": ("direction", str),
            "tarih": ("occurred_on", lambda v: v.isoformat()),
        }
        out: dict = {}
        for alan, (kolon, cev) in m.items():
            deger = getattr(self, alan)
            if deger is not None:
                out[kolon] = cev(deger)
        return out


class BenModel(BaseModel):
    plan: str
    ay_kayit: int
    limit: int
    toplam_kayit: int = 0


# --------------------------------------------------------------------------- #
# Kategoriler
# --------------------------------------------------------------------------- #
class KategoriModel(BaseModel):
    id: str
    name: str
    tip: Tip
    color: str | None = None
    keywords: list[str] = Field(default_factory=list)
    is_active: bool = True
    sort_order: int = 0

    @classmethod
    def from_cat(cls, c: Category) -> KategoriModel:
        return cls(
            id=c.id, name=c.name, tip=c.tip, color=c.color,
            keywords=list(c.keywords), is_active=c.is_active, sort_order=c.sort_order,
        )


class KategoriOlusturIstek(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    tip: Tip
    color: str | None = None
    keywords: list[str] = Field(default_factory=list)


class KategoriGuncelleIstek(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=60)
    tip: Tip | None = None
    color: str | None = None
    is_active: bool | None = None
    sort_order: int | None = None

    def kolonlar(self) -> dict:
        m = {"name": "name", "tip": "type", "color": "color",
             "is_active": "is_active", "sort_order": "sort_order"}
        return {kol: getattr(self, alan) for alan, kol in m.items()
                if getattr(self, alan) is not None}


# --------------------------------------------------------------------------- #
# Özet (dashboard + rapor)
# --------------------------------------------------------------------------- #
class TipKirilimModel(BaseModel):
    tip: str
    etiket: str
    tutar: float
    adet: int
    oran: float


class KategoriKirilimModel(BaseModel):
    kategori: str
    tip: str
    tutar: float
    adet: int
    oran: float


class GunlukNoktaModel(BaseModel):
    tarih: date
    gider: float
    gelir: float


class OzetGovde(BaseModel):
    toplam_gider: float
    toplam_gelir: float
    net: float
    adet: int
    tip_kirilim: list[TipKirilimModel]
    kategori_kirilim: list[KategoriKirilimModel]
    gunluk: list[GunlukNoktaModel]

    @classmethod
    def from_ozet(cls, o: Ozet) -> OzetGovde:
        return cls(
            toplam_gider=o.toplam_gider, toplam_gelir=o.toplam_gelir, net=o.net, adet=o.adet,
            tip_kirilim=[TipKirilimModel(**vars(x)) for x in o.tip_kirilim],
            kategori_kirilim=[KategoriKirilimModel(**vars(x)) for x in o.kategori_kirilim],
            gunluk=[GunlukNoktaModel(**vars(x)) for x in o.gunluk],
        )


class OzetModel(BaseModel):
    period: str
    baslangic: date
    bitis: date
    etiket: str
    bu_donem: OzetGovde
    onceki: OzetGovde
