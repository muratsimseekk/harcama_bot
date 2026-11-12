"""API istek/yanıt modelleri (Pydantic). `core.models` ile eşlenir."""
from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator

from core.models import Budget, Candidate, Category, Goal, Transaction
from core.summary import HedefIlerleme, Ozet

Tip = Literal["kisisel", "isletme", "yatirim"]
Yon = Literal["gider", "gelir"]
KategoriTip = Literal["kisisel", "isletme", "yatirim", "gelir"]


def bas_harf_buyuk(metin: str | None) -> str | None:
    """Açıklamanın ilk harfini Türkçe kurala göre büyütür ("iade" → "İade"); gerisine dokunmaz."""
    if not metin:
        return metin
    metin = metin.strip()
    # "iPhone", "eBay" gibi marka yazımları bozulmasın
    if not metin or (len(metin) > 1 and metin[1].isupper()):
        return metin
    ilk = {"i": "İ", "ı": "I"}.get(metin[0], metin[0].upper())
    return ilk + metin[1:]


class AdayModel(BaseModel):
    aciklama: str
    tutar: float = Field(gt=0)
    kategori: str
    tip: Tip = "kisisel"
    direction: Yon = "gider"
    tarih: date
    para_birimi: str = "TRY"
    emin: bool = True
    neden: str = ""
    kategori_onerisi: str = ""  # kategori boşken AI'ın önerdiği yeni kategori adı (kaydedilmez)
    kaynak: str = "mobile_manual"  # capture'dan gelen adaylarda mobile_text/mobile_voice
    inceleme_sebepleri: list[str] = Field(default_factory=list)

    _aciklama_buyuk = field_validator("aciklama")(bas_harf_buyuk)

    @classmethod
    def from_candidate(cls, c: Candidate) -> AdayModel:
        return cls(
            aciklama=c.aciklama, tutar=c.tutar, kategori=c.kategori, tip=c.tip,
            direction=c.direction, tarih=c.tarih, para_birimi=c.para_birimi,
            emin=c.emin, neden=c.neden, kategori_onerisi=c.kategori_onerisi, kaynak=c.kaynak,
            inceleme_sebepleri=list(c.inceleme_sebepleri),
        )

    def to_candidate(self, kaynak: str | None = None) -> Candidate:
        return Candidate(
            aciklama=self.aciklama, tutar=self.tutar, kategori=self.kategori, tip=self.tip,
            direction=self.direction, tarih=self.tarih, para_birimi=self.para_birimi,
            emin=self.emin, neden=self.neden, kaynak=kaynak or self.kaynak,
            inceleme_sebepleri=list(self.inceleme_sebepleri),
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
    ekleyen: str | None = None  # hane havuzunda kaydı ekleyen başka üyenin adı
    # ?para=USD|EUR istenince: işlemin kendi gününün kuruyla karşılığı ve o kur (TL).
    cevrilmis: float | None = None
    kur: float | None = None

    @classmethod
    def from_tx(
        cls, t: Transaction, *, ekleyen: str | None = None,
        cevrilmis: float | None = None, kur: float | None = None,
    ) -> IslemModel:
        return cls(
            id=t.id, direction=t.direction, tip=t.tip, kategori=t.kategori,
            aciklama=t.aciklama, tutar=t.tutar, para_birimi=t.para_birimi,
            tarih=t.tarih, kaynak=t.kaynak, created_at=t.created_at, ekleyen=ekleyen,
            cevrilmis=cevrilmis, kur=kur,
        )


class IslemGuncelleIstek(BaseModel):
    tutar: float | None = Field(default=None, gt=0)
    kategori: str | None = None
    aciklama: str | None = None
    tip: Tip | None = None
    direction: Yon | None = None
    tarih: date | None = None

    _aciklama_buyuk = field_validator("aciklama")(bas_harf_buyuk)

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
    plan: str                       # etkin plan: free | pro
    ham_plan: str = "free"          # rapor edilen plan: free | pro
    gunluk_limit: int               # bugünkü toplam kayıt (elle+AI) tavanı — taban + reklam kredisi; pro → çok büyük
    gunluk_enerji: int              # Free katmanının sabit günlük tabanı (reklamsız, karşılaştırma tablosu)
    gun_kayit: int                  # bugün eklenen kayıt (elle+AI)
    gun_reklam_kredisi: int = 0     # bugün reklam izleyerek kazanılan ek kayıt hakkı
    reklam_kredi_adet: int = 1      # bir reklam izleyince kazanılacak kayıt hakkı (settings.AD_KREDI_ADET)
    limit: int                      # geriye dönük alias (= gunluk_limit)
    toplam_kayit: int = 0
    hane_rol: str | None = None     # hanedeyse rolü, değilse null


# --------------------------------------------------------------------------- #
# Kategoriler
# --------------------------------------------------------------------------- #
class KategoriModel(BaseModel):
    id: str
    name: str
    tip: KategoriTip
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
    tip: KategoriTip
    color: str | None = None
    keywords: list[str] = Field(default_factory=list)


class BolumEkleIstek(BaseModel):
    tip: KategoriTip


class KategoriGuncelleIstek(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=60)
    tip: KategoriTip | None = None
    color: str | None = None
    keywords: list[str] | None = None
    is_active: bool | None = None
    sort_order: int | None = None

    def kolonlar(self) -> dict:
        m = {"name": "name", "tip": "type", "color": "color", "keywords": "keywords",
             "is_active": "is_active", "sort_order": "sort_order"}
        return {kol: getattr(self, alan) for alan, kol in m.items()
                if getattr(self, alan) is not None}


# --------------------------------------------------------------------------- #
# Hane (aile paylaşımı)
# --------------------------------------------------------------------------- #
HaneRol = Literal["owner", "editor", "viewer"]


class HaneOlusturIstek(BaseModel):
    ad: str = Field(min_length=1, max_length=60)
    uye_adi: str = Field(default="", max_length=60)


class HaneKatilIstek(BaseModel):
    kod: str = Field(min_length=4, max_length=12)
    uye_adi: str = Field(default="", max_length=60)


class HaneAdIstek(BaseModel):
    ad: str = Field(min_length=1, max_length=60)


class HaneRolIstek(BaseModel):
    rol: HaneRol


class HaneUyeModel(BaseModel):
    user_id: str
    ad: str
    rol: HaneRol
    ben: bool


class HaneModel(BaseModel):
    ad: str
    kod: str
    rol: HaneRol
    owner: bool
    uyeler: list[HaneUyeModel]


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
    gelir_kirilim: list[KategoriKirilimModel] = Field(default_factory=list)

    @classmethod
    def from_ozet(cls, o: Ozet) -> OzetGovde:
        return cls(
            toplam_gider=o.toplam_gider, toplam_gelir=o.toplam_gelir, net=o.net, adet=o.adet,
            tip_kirilim=[TipKirilimModel(**vars(x)) for x in o.tip_kirilim],
            kategori_kirilim=[KategoriKirilimModel(**vars(x)) for x in o.kategori_kirilim],
            gunluk=[GunlukNoktaModel(**vars(x)) for x in o.gunluk],
            gelir_kirilim=[KategoriKirilimModel(**vars(x)) for x in o.gelir_kirilim],
        )


class KurModel(BaseModel):
    """Gösterimde kullanılan güncel kur: 1 birim `para` = `deger` TL (TCMB döviz satış)."""
    para: str
    deger: float
    tarih: date
    kaynak: str = "tcmb"


Para = Literal["TRY", "USD", "EUR"]


class MevcutModel(BaseModel):
    """Gelir − gider = mevcut; ana sayfa kartı (son N takvim ayı)."""
    aylar: int
    baslangic: date
    bitis: date
    gelir: float
    gider: float
    net: float
    para: str = "TRY"
    kur: KurModel | None = None


class HedefIlerlemeModel(BaseModel):
    kapsam: str
    kapsam_deger: str | None = None
    etiket: str
    limit: float
    harcanan: float
    oran: float
    kalan: float
    durum: str
    tur: str = "limit"

    @classmethod
    def from_h(cls, h: HedefIlerleme) -> HedefIlerlemeModel:
        return cls(**vars(h))


class YatirimKategoriModel(BaseModel):
    kategori: str
    hedef: float
    birikmis: float
    kalan: float
    oran: float


class YatirimModel(BaseModel):
    hedef: float
    birikmis: float
    kalan: float
    oran: float
    # Kategori bazında alt hedefler (Altın/Döviz, Hisse Senedi…) ve toplamları.
    kategoriler: list[YatirimKategoriModel] = Field(default_factory=list)
    alt_toplam: float = 0.0


class KategoriKiyasModel(BaseModel):
    kategori: str
    tip: str
    tutar: float
    adet: int
    oran: float
    onceki_tutar: float
    degisim: float | None = None  # % ; None = önceki dönemde yoktu


class YonKiyasModel(BaseModel):
    toplam: float
    onceki_toplam: float
    degisim: float | None = None
    kategoriler: list[KategoriKiyasModel]


class KategoriKiyasYanit(BaseModel):
    """Analiz → kategoriler: seçilen tarih aralığı + kıyas dönemi (önceki eşdeğer aralık)."""
    baslangic: date
    bitis: date
    onceki_baslangic: date
    onceki_bitis: date
    gider: YonKiyasModel
    gelir: YonKiyasModel
    para: str = "TRY"


class AyNoktaModel(BaseModel):
    ay: str  # "2026-11"
    tutar: float
    adet: int
    degisim: float | None = None  # bir önceki aya göre %


class KategoriTrendYanit(BaseModel):
    kategoriler: list[str]
    yon: str
    aylar: list[AyNoktaModel]
    para: str = "TRY"


class OzetModel(BaseModel):
    period: str
    baslangic: date
    bitis: date
    etiket: str
    bu_donem: OzetGovde
    onceki: OzetGovde
    hedefler: list[HedefIlerlemeModel] = Field(default_factory=list)
    yatirim: YatirimModel | None = None
    # bu_donem/onceki `para` cinsinden (her işlem kendi gününün kuruyla); hedefler ve
    # yatırım her zaman TL (limitler TL konur).
    para: str = "TRY"
    kur: KurModel | None = None


# --------------------------------------------------------------------------- #
# Bütçe / hedef
# --------------------------------------------------------------------------- #
class ButceModel(BaseModel):
    id: str
    kapsam: str
    kapsam_deger: str | None = None
    limit_amount: float
    period: str = "month"
    tur: str = "limit"

    @classmethod
    def from_b(cls, b: Budget) -> ButceModel:
        return cls(
            id=b.id, kapsam=b.kapsam, kapsam_deger=b.kapsam_deger,
            limit_amount=b.limit_amount, period=b.period, tur=b.tur,
        )


class ButceIstek(BaseModel):
    kapsam: Literal["genel", "kategori", "tip"]
    kapsam_deger: str | None = None
    limit_amount: float = Field(gt=0)
    # limit: üst sınır (aşınca uyarı) · hedef: ulaşmak istenen tutar (yalnız kategori)
    tur: Literal["limit", "hedef"] = "limit"


class HedefModel(BaseModel):
    id: str
    hedef_amount: float
    tip: str = "yatirim"
    period: str = "month"

    @classmethod
    def from_g(cls, g: Goal) -> HedefModel:
        return cls(id=g.id, hedef_amount=g.hedef_amount, tip=g.tip, period=g.period)


class HedefIstek(BaseModel):
    hedef_amount: float = Field(gt=0)
    tip: str = "yatirim"
    # Doluysa genel hedef değil, o yatırım kategorisinin alt hedefi ayarlanır.
    kategori: str | None = Field(default=None, min_length=1, max_length=60)
