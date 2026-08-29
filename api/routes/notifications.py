"""/v1/notifications — bütçe durumu + son aktiviteden üretilen bildirimler."""
from __future__ import annotations

import calendar

from fastapi import APIRouter
from pydantic import BaseModel

from api.deps import CurrentUser
from core import repo
from core.dates import donem_araligi, today, turkce_tutar
from core.summary import hedef_ilerleme, yatirim_ilerleme

router = APIRouter(prefix="/v1", tags=["notifications"])


class Bildirim(BaseModel):
    tur: str          # 'uyari' | 'bilgi' | 'motivasyon' | 'islem'
    baslik: str
    metin: str
    grup: str         # 'Bugün' | 'Bu hafta' | ...
    ikon: str


class BildirimYanit(BaseModel):
    bildirimler: list[Bildirim]


def _kalan_gun() -> int:
    b = today()
    son = calendar.monthrange(b.year, b.month)[1]
    return son - b.day


@router.get("/notifications", response_model=BildirimYanit)
async def notifications(user_id: CurrentUser) -> BildirimYanit:
    bas, bit = donem_araligi("month", today())
    txs = await repo.list_period(user_id, bas, bit)
    kalan_gun = _kalan_gun()
    out: list[Bildirim] = []

    try:
        butceler = await repo.budgets_list(user_id)
    except Exception:
        butceler = []

    for h in hedef_ilerleme(txs, butceler):
        if h.durum == "asti":
            out.append(Bildirim(
                tur="uyari", grup="Bugün", ikon="alert",
                baslik=f"{h.etiket} limitini aştın",
                metin=(f"{turkce_tutar(h.harcanan)} ₺ harcadın, limit {turkce_tutar(h.limit)} ₺. "
                       f"Ay sonuna {kalan_gun} gün var."),
            ))
        elif h.durum == "yaklasti":
            out.append(Bildirim(
                tur="uyari", grup="Bugün", ikon="alert",
                baslik=f"{h.etiket} limitinin %{round(h.oran)}'i doldu",
                metin=(f"{turkce_tutar(h.kalan)} ₺ kaldı. Ay sonuna {kalan_gun} gün var, "
                       f"biraz yavaşlamakta fayda var."),
            ))
        elif h.kapsam == "kategori" and h.oran < 60 and kalan_gun <= 8 and h.kalan > 0:
            out.append(Bildirim(
                tur="motivasyon", grup="Bu hafta", ikon="bulb",
                baslik=f"{h.etiket}'de iyi gidiyorsun",
                metin=(f"Limitinin altında {turkce_tutar(h.kalan)} ₺ kaldı — "
                       f"bunu yatırımda değerlendirebilirsin."),
            ))

    try:
        g = await repo.goal_get(user_id, "yatirim")
    except Exception:
        g = None
    if g:
        y = yatirim_ilerleme(txs, g.hedef_amount)
        if y["oran"] >= 100:
            out.append(Bildirim(
                tur="motivasyon", grup="Bugün", ikon="trophy",
                baslik="Yatırım hedefine ulaştın! 🎉",
                metin=f"Bu ay {turkce_tutar(y['birikmis'])} ₺ yatırdın.",
            ))
        elif y["kalan"] > 0:
            out.append(Bildirim(
                tur="motivasyon", grup="Bugün", ikon="target",
                baslik="Yatırım hedefin yaklaşıyor",
                metin=(f"Hedefe {turkce_tutar(y['kalan'])} ₺ kaldı, {kalan_gun} gün var. "
                       f"Şu ana kadar {turkce_tutar(y['birikmis'])} ₺."),
            ))

    for t in (await repo.list_recent(user_id, 4)):
        isaret = "+" if t.direction == "gelir" else "-"
        out.append(Bildirim(
            tur="islem", grup="Bu hafta", ikon="cash",
            baslik="Yeni işlem kaydedildi",
            metin=f"{t.aciklama} · {t.kategori} · {isaret}{turkce_tutar(t.tutar)} ₺",
        ))

    return BildirimYanit(bildirimler=out)
