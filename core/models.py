"""Uygulama veri modelleri."""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Literal

Direction = Literal["gider", "gelir"]
TxType = Literal["kisisel", "isletme", "yatirim"]

TIP_ETIKETI = {"kisisel": "Kişisel", "isletme": "İşletme", "yatirim": "Yatırım"}
TIP_EMOJI = {"kisisel": "👤", "isletme": "🏭", "yatirim": "💹"}


def tip_normalize(s: str) -> TxType:
    t = (s or "").lower().strip()
    if "yat" in t:
        return "yatirim"
    if "let" in t or "işl" in t or "isl" in t:
        return "isletme"
    return "kisisel"


@dataclass
class Candidate:
    """LLM'in metinden/sesten çıkardığı, henüz kaydedilmemiş aday işlem."""
    aciklama: str
    tutar: float
    kategori: str
    tip: TxType = "kisisel"
    direction: Direction = "gider"
    tarih: date = field(default_factory=date.today)
    para_birimi: str = "TRY"
    emin: bool = True
    ham_girdi: str = ""
    kaynak: str = "telegram_text"
    # onay aşamasında dolar:
    inceleme_sebepleri: list[str] = field(default_factory=list)

    @property
    def inceleme_gerek(self) -> bool:
        return bool(self.inceleme_sebepleri)

    def to_dict(self) -> dict:
        """pending_transactions.payload için JSON-serileştirilebilir sözlük."""
        return {
            "aciklama": self.aciklama,
            "tutar": self.tutar,
            "kategori": self.kategori,
            "tip": self.tip,
            "direction": self.direction,
            "tarih": self.tarih.isoformat(),
            "para_birimi": self.para_birimi,
            "emin": self.emin,
            "ham_girdi": self.ham_girdi,
            "kaynak": self.kaynak,
            "inceleme_sebepleri": self.inceleme_sebepleri,
        }

    @classmethod
    def from_dict(cls, d: dict) -> Candidate:
        return cls(
            aciklama=d["aciklama"],
            tutar=float(d["tutar"]),
            kategori=d["kategori"],
            tip=d.get("tip", "kisisel"),
            direction=d.get("direction", "gider"),
            tarih=date.fromisoformat(d["tarih"]),
            para_birimi=d.get("para_birimi", "TRY"),
            emin=d.get("emin", True),
            ham_girdi=d.get("ham_girdi", ""),
            kaynak=d.get("kaynak", "telegram_text"),
            inceleme_sebepleri=list(d.get("inceleme_sebepleri", [])),
        )

    def to_row(self, user_id: str, occurred_at: datetime | None = None) -> dict:
        """Supabase `transactions` satırına çevirir."""
        return {
            "user_id": user_id,
            "direction": self.direction,
            "type": self.tip,
            "category": self.kategori,
            "description": self.aciklama,
            "amount": round(float(self.tutar), 2),
            "currency": self.para_birimi,
            "occurred_on": self.tarih.isoformat(),
            "occurred_at": occurred_at.isoformat() if occurred_at else None,
            "source": self.kaynak,
            "raw_input": self.ham_girdi or None,
        }


@dataclass
class Transaction:
    """Kaydedilmiş işlem (Supabase satırından)."""
    id: str
    user_id: str
    direction: Direction
    tip: TxType
    kategori: str
    aciklama: str
    tutar: float
    para_birimi: str
    tarih: date
    kaynak: str
    created_at: datetime | None = None

    @classmethod
    def from_row(cls, r: dict) -> Transaction:
        return cls(
            id=r["id"],
            user_id=r["user_id"],
            direction=r.get("direction", "gider"),
            tip=tip_normalize(r.get("type", "kisisel")),
            kategori=r.get("category", ""),
            aciklama=r.get("description", ""),
            tutar=float(r.get("amount", 0) or 0),
            para_birimi=r.get("currency", "TRY"),
            tarih=_as_date(r.get("occurred_on")),
            kaynak=r.get("source", ""),
            created_at=_as_dt(r.get("created_at")),
        )


def _as_date(v) -> date:
    if isinstance(v, date):
        return v
    try:
        return datetime.fromisoformat(str(v)).date()
    except (ValueError, TypeError):
        return date.today()


def _as_dt(v) -> datetime | None:
    if v is None:
        return None
    try:
        return datetime.fromisoformat(str(v).replace("Z", "+00:00"))
    except (ValueError, TypeError):
        return None


@dataclass
class Category:
    """Kullanıcının düzenlenebilir harcama kategorisi."""
    id: str
    user_id: str
    name: str
    tip: TxType
    color: str | None = None
    keywords: list[str] = field(default_factory=list)
    is_active: bool = True
    sort_order: int = 0

    @classmethod
    def from_row(cls, r: dict) -> Category:
        return cls(
            id=r["id"],
            user_id=r["user_id"],
            name=r.get("name", ""),
            tip=tip_normalize(r.get("type", "kisisel")),
            color=r.get("color"),
            keywords=list(r.get("keywords") or []),
            is_active=bool(r.get("is_active", True)),
            sort_order=int(r.get("sort_order", 0) or 0),
        )


Kapsam = Literal["genel", "kategori", "tip"]


@dataclass
class Budget:
    """Aylık harcama limiti (genel / kategori / tür)."""
    id: str
    user_id: str
    kapsam: Kapsam
    kapsam_deger: str | None
    limit_amount: float
    period: str = "month"

    @classmethod
    def from_row(cls, r: dict) -> Budget:
        return cls(
            id=r["id"],
            user_id=r["user_id"],
            kapsam=r.get("kapsam", "genel"),
            kapsam_deger=r.get("kapsam_deger"),
            limit_amount=float(r.get("limit_amount", 0) or 0),
            period=r.get("period", "month"),
        )


@dataclass
class Goal:
    """Aylık yatırım/birikim hedefi."""
    id: str
    user_id: str
    hedef_amount: float
    tip: str = "yatirim"
    period: str = "month"

    @classmethod
    def from_row(cls, r: dict) -> Goal:
        return cls(
            id=r["id"],
            user_id=r["user_id"],
            hedef_amount=float(r.get("hedef_amount", 0) or 0),
            tip=r.get("tip", "yatirim"),
            period=r.get("period", "month"),
        )
