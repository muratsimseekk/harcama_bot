"""/v1/summary — dönem (hafta/ay/yıl) özeti + önceki döneme kıyas + bütçe ilerlemesi."""
from __future__ import annotations

import asyncio
from datetime import date

from fastapi import APIRouter, HTTPException, Query

from api import deps
from api.deps import CurrentUser
from api.schemas import (
    HedefIlerlemeModel,
    KategoriKiyasYanit,
    KategoriTrendYanit,
    KurModel,
    MevcutModel,
    OzetGovde,
    OzetModel,
    Para,
    YatirimModel,
)
from core import kur as kurlar
from core import repo
from core.dates import donem_araligi, donem_etiket, donem_kaydir, son_aylar_araligi, today
from core.summary import (
    alt_hedefler,
    aylik_trend,
    hedef_ilerleme,
    kategori_karsilastir,
    onceki_aralik,
    ozetle,
    yatirim_ilerleme,
)

ARALIK_EN_COK_GUN = 731  # özel aralık en çok ~2 yıl

router = APIRouter(prefix="/v1", tags=["summary"])


async def kur_modeli(para: str) -> KurModel | None:
    """Gösterilen güncel kur (bugün ya da son iş günü)."""
    if para == "TRY":
        return None
    k = await kurlar.guncel_kur()
    return KurModel(para=para, deger=round(k.deger(para), 4), tarih=k.tarih, kaynak=k.kaynak) if k else None


@router.get("/kur")
async def guncel_kur() -> dict:
    """Güncel TCMB döviz satış kurları (herkese açık): 1 USD / 1 EUR kaç TL."""
    k = await kurlar.guncel_kur()
    if not k:
        return {"tarih": None, "USD": None, "EUR": None, "kaynak": None}
    return {"tarih": k.tarih, "USD": round(k.USD, 4), "EUR": round(k.EUR, 4), "kaynak": k.kaynak}


@router.get("/summary/mevcut", response_model=MevcutModel)
async def mevcut(
    user_id: CurrentUser,
    aylar: int = Query(default=3, ge=1, le=12),
    para: Para = Query(default="TRY"),
) -> MevcutModel:
    """Son `aylar` takvim ayının (içinde bulunulan ay dahil) gelir − gider durumu."""
    bas, bit = son_aylar_araligi(aylar, today())
    ids = await deps.kapsam(user_id)
    if para == "TRY":
        gelir, gider = await repo.donem_toplamlari(ids, bas, bit)
    else:
        tablo = await kurlar.kurlar(bas, bit)

        def cevir(g: date, tutar: float) -> float:
            k = tablo.get(g)
            return tutar / k.deger(para) if k else tutar

        gelir, gider = await repo.donem_toplamlari(ids, bas, bit, cevir)
    return MevcutModel(
        aylar=aylar, baslangic=bas, bitis=bit,
        gelir=gelir, gider=gider, net=round(gelir - gider, 2),
        para=para, kur=await kur_modeli(para),
    )


async def _cevrilmis(txs, para: str, bas: date, bit: date):
    if para == "TRY" or not txs:
        return txs
    return kurlar.cevir(txs, para, await kurlar.kurlar(bas, bit))


@router.get("/summary/kategoriler", response_model=KategoriKiyasYanit)
async def kategori_kiyas(
    user_id: CurrentUser,
    bas: date = Query(...),
    bit: date = Query(...),
    para: Para = Query(default="TRY"),
    obas: date | None = Query(default=None),
    obit: date | None = Query(default=None),
) -> KategoriKiyasYanit:
    """Seçilen aralıkta her kategorinin toplamı ve önceki eşdeğer döneme göre % değişimi.
    Kıyas dönemi verilmezse otomatik (`onceki_aralik`); ana sayfa içgörüsü "bu ayın ilk N
    günü ↔ geçen ayın ilk N günü" kıyası için `obas`/`obit` gönderir."""
    if bit < bas:
        raise HTTPException(422, "Bitiş tarihi başlangıçtan önce olamaz")
    if (bit - bas).days + 1 > ARALIK_EN_COK_GUN:
        raise HTTPException(422, "Tarih aralığı en çok 2 yıl olabilir")
    if obas is None or obit is None or obit < obas or (obit - obas).days + 1 > ARALIK_EN_COK_GUN:
        obas, obit = onceki_aralik(bas, bit)
    ids = await deps.kapsam(user_id)
    bu, onceki = await asyncio.gather(repo.list_period(ids, bas, bit), repo.list_period(ids, obas, obit))
    bu, onceki = await asyncio.gather(_cevrilmis(bu, para, bas, bit), _cevrilmis(onceki, para, obas, obit))
    return KategoriKiyasYanit(
        baslangic=bas, bitis=bit, onceki_baslangic=obas, onceki_bitis=obit,
        gider=kategori_karsilastir(bu, onceki, "gider"),
        gelir=kategori_karsilastir(bu, onceki, "gelir"),
        para=para,
    )


@router.get("/summary/kategori-trend", response_model=KategoriTrendYanit)
async def kategori_trend(
    user_id: CurrentUser,
    kategori: list[str] = Query(...),
    yon: str = Query(default="gider", pattern="^(gider|gelir)$"),
    aylar: int = Query(default=6, ge=2, le=12),
    ref: date | None = Query(default=None),
    para: Para = Query(default="TRY"),
) -> KategoriTrendYanit:
    """Kategori(ler)in son `aylar` takvim ayı toplamı (ref'in ayı dahil) + aydan aya % değişim."""
    bas, bit = son_aylar_araligi(aylar, ref or today())
    ids = await deps.kapsam(user_id)
    txs = await repo.list_period(ids, bas, bit, direction=yon, kategoriler=kategori)
    txs = await _cevrilmis(txs, para, bas, bit)
    return KategoriTrendYanit(
        kategoriler=kategori, yon=yon, aylar=aylik_trend(txs, bit, aylar), para=para,
    )


@router.get("/summary", response_model=OzetModel)
async def summary(
    user_id: CurrentUser,
    period: str = Query(default="month", pattern="^(week|month|year)$"),
    ref: date | None = Query(default=None),
    para: Para = Query(default="TRY"),
) -> OzetModel:
    ref = ref or today()
    bas, bit = donem_araligi(period, ref)  # type: ignore[arg-type]
    onceki_ref = donem_kaydir(period, ref, -1)  # type: ignore[arg-type]
    obas, obit = donem_araligi(period, onceki_ref)  # type: ignore[arg-type]

    # Supabase uzakta; her sorgu ~300 ms gidiş-dönüş. Bağımsız olanlar sıralı
    # beklenince uç ~1,6 sn sürüyordu. İki paralel dalgaya indirildi.
    # Dalga 1: kapsam + bütçe + hedef (üçü de yalnız user_id'ye bağlı)
    ids, butceler, g = await asyncio.gather(
        deps.kapsam(user_id),
        repo.budgets_list(user_id),
        repo.goals_list(user_id),
        return_exceptions=True,  # bütçe/hedef tabloları yoksa özet yine dönsün
    )
    if isinstance(ids, BaseException):
        raise ids
    if isinstance(butceler, BaseException):
        butceler = []
    if isinstance(g, BaseException):
        g = []

    # Dalga 2: iki dönemin işlemleri (ids geldikten sonra, ikisi paralel)
    bu_txs, onceki_txs = await asyncio.gather(
        repo.list_period(ids, bas, bit),
        repo.list_period(ids, obas, obit),
    )

    hedefler: list[HedefIlerlemeModel] = []
    if butceler:
        hedefler = [HedefIlerlemeModel.from_h(h) for h in hedef_ilerleme(bu_txs, butceler)]
    genel_g = next((x for x in g if x.tip == "yatirim"), None)
    hedef_tutar = genel_g.hedef_amount if genel_g else 0.0
    # yatırım kartı: hedef olmasa bile bu ay birikeni göster
    yatirim = YatirimModel(**yatirim_ilerleme(bu_txs, hedef_tutar, alt_hedefler(g)))

    # Gösterim para birimi: her işlem kendi gününün kuruyla (hedef/yatırım TL kalır).
    gbu, gonceki = bu_txs, onceki_txs
    if para != "TRY":
        tablo = await kurlar.kurlar(min(bas, obas), max(bit, obit))
        gbu, gonceki = kurlar.cevir(bu_txs, para, tablo), kurlar.cevir(onceki_txs, para, tablo)

    return OzetModel(
        period=period,
        baslangic=bas,
        bitis=bit,
        etiket=donem_etiket(period, ref),  # type: ignore[arg-type]
        bu_donem=OzetGovde.from_ozet(ozetle(gbu)),
        onceki=OzetGovde.from_ozet(ozetle(gonceki)),
        hedefler=hedefler,
        yatirim=yatirim,
        para=para,
        kur=await kur_modeli(para),
    )
