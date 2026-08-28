"""API istek/yanıt modelleri (Pydantic). `core.models` ile eşlenir."""
from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field

from core.models import Candidate, Transaction

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
