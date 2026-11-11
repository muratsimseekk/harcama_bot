"""/v1/push — cihaz token kaydı + planlı bildirim tetikleyici (cron)."""
from __future__ import annotations

import logging
from datetime import date, timedelta

from fastapi import APIRouter, Header, HTTPException, status
from pydantic import BaseModel

from api.deps import CurrentUser
from core import push, repo
from core.config import settings
from core.dates import donem_araligi, hafta_araligi, now, today, turkce_tutar
from core.summary import hedef_ilerleme

router = APIRouter(prefix="/v1/push", tags=["push"])
logger = logging.getLogger(__name__)


class TokenIstek(BaseModel):
    token: str
    platform: str | None = None


@router.put("/token")
async def token_kaydet(user_id: CurrentUser, istek: TokenIstek) -> dict:
    try:
        await repo.push_token_upsert(user_id, istek.token, istek.platform)
        return {"ok": True}
    except Exception as e:  # push_tokens tablosu henüz yoksa uygulamayı kırma
        logger.warning("push token kaydedilemedi: %s", e)
        return {"ok": False}


@router.delete("/token")
async def token_sil(istek: TokenIstek) -> dict:
    try:
        await repo.push_token_delete(istek.token)
    except Exception:
        pass
    return {"ok": True}


class RunIstek(BaseModel):
    tur: str = "butce"  # butce | gunluk | haftalik
    zorla: bool = False  # elle test: saat penceresini atla


# Günlük/haftalık özet yalnız akşam gider. Geç tetiklenen bir cron (GitHub Actions
# zamanlanmış işleri saatlerce gecikebiliyor — 11-11 02:06'da herkese "bugün kayıt
# girmedin" gitti) gece yarısından sonra gelirse hiçbir şey göndermez.
OZET_SAAT_ARALIGI = range(20, 24)  # 20:00–23:59 (Europe/Istanbul)


@router.post("/run")
async def calistir(istek: RunIstek, x_cron_secret: str = Header(default="")) -> dict:
    if not settings.CRON_SECRET or x_cron_secret != settings.CRON_SECRET:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Geçersiz cron sırrı")

    if istek.tur in ("gunluk", "haftalik") and not istek.zorla and now().hour not in OZET_SAAT_ARALIGI:
        logger.warning("push/run %s saat dışında (%s) — atlandı", istek.tur, now().strftime("%H:%M"))
        return {"tur": istek.tur, "kullanici": 0, "gonderim": 0, "atlandi": "saat_disi"}

    kayitlar = await repo.push_tokens_all()
    kullanici_token: dict[str, list[str]] = {}
    for r in kayitlar:
        kullanici_token.setdefault(r["user_id"], []).append(r["token"])

    b = today()
    # Tek cron (her gün 21:00) yeter: Pazar günü "gunluk" çağrısı haftalık özete döner.
    # Ayrıca kurulu Pazar 21:05 "haftalik" işi tekrar göndermez (dedup anahtarı).
    tur = "haftalik" if istek.tur == "gunluk" and b.weekday() == 6 else istek.tur
    gonderim = 0
    for uid, tokens in kullanici_token.items():
        try:
            if tur == "gunluk":
                gonderim += await _gunluk_ozet(uid, tokens, b)
            elif tur == "haftalik":
                gonderim += await _haftalik_ozet(uid, tokens, b)
            else:
                gonderim += await _butce_uyarilari(uid, tokens, b)
        except Exception as e:  # bir kullanıcının hatası diğerlerini durdurmasın
            logger.error("push kullanıcı %s hata: %s", uid, e, exc_info=True)

    return {"tur": tur, "kullanici": len(kullanici_token), "gonderim": gonderim}


async def _butce_uyarilari(uid: str, tokens: list[str], b: date) -> int:
    bas, bit = donem_araligi("month", b)
    txs = await repo.list_period(uid, bas, bit)
    try:
        butceler = await repo.budgets_list(uid)
    except Exception:
        return 0
    donem = f"{b.year}-{b.month:02d}"
    n = 0
    for h in hedef_ilerleme(txs, butceler):
        if h.durum not in ("yaklasti", "asti"):
            continue
        anahtar = f"butce_{h.durum}:{h.kapsam_deger or 'genel'}:{donem}"
        if await repo.bildirim_gonderildi_mi(uid, anahtar):
            continue
        if h.durum == "asti":
            baslik = f"{h.etiket} limitini aştın"
            govde = f"{turkce_tutar(h.harcanan)} / {turkce_tutar(h.limit)} ₺ · %{round(h.oran)}"
        else:
            baslik = f"{h.etiket}: limitin %{round(h.oran)}'i doldu"
            govde = f"{turkce_tutar(h.kalan)} ₺ kaldı"
        ok, _, olu = await push.expo_push_gonder(tokens, baslik, govde, {"tur": "butce"})
        await _olu_temizle(olu)
        if ok:
            await repo.bildirim_isaretle(uid, anahtar)
            n += 1
    return n


async def _olu_temizle(olu: list[str]) -> None:
    for t in olu:
        try:
            await repo.push_token_delete(t)
        except Exception:
            pass


def _tl(x: float) -> str:
    """Bildirimde kuruşsuz tutar: 1250.4 → '1.250'."""
    return f"{round(x):,}".replace(",", ".")


def _en_cok(giderler) -> tuple[str, float] | None:
    toplamlar: dict[str, float] = {}
    for t in giderler:
        toplamlar[t.kategori] = toplamlar.get(t.kategori, 0.0) + t.tutar
    return max(toplamlar.items(), key=lambda kv: kv[1]) if toplamlar else None


def gunluk_mesaj(bugun, ay_giderleri, butceler) -> tuple[str, str]:
    """Günlük özet bildirimi (başlık, gövde). `bugun`/`ay_giderleri`: gider işlemleri."""
    toplam = sum(t.tutar for t in bugun)
    satirlar = [f"Bugün {len(bugun)} harcama, toplam {_tl(toplam)} ₺."]
    en = _en_cok(bugun)
    if en and len(bugun) > 1:
        satirlar.append(f"En çok: {en[0]} ({_tl(en[1])} ₺)")
    genel = next((b for b in butceler if b.kapsam == "genel"), None)
    ay_toplam = sum(t.tutar for t in ay_giderleri)
    if genel:
        kalan = genel.limit_amount - ay_toplam
        satirlar.append(
            f"Bu ay bütçende {_tl(kalan)} ₺ kaldı 💪" if kalan > 0
            else f"Aylık bütçeni {_tl(-kalan)} ₺ aştın ⚠️"
        )
    else:
        satirlar.append(f"Bu ay toplam {_tl(ay_toplam)} ₺ harcadın.")
    satirlar.append("Eklemeyi unuttuğun bir harcama varsa şimdi ekleyebilirsin.")
    return "🌙 Bugünün özeti", "\n".join(satirlar)


HATIRLATMA = (
    "📝 Bugünkü harcamalarını ekledin mi?",
    "Bugün henüz bir kayıt girmedin. Unutmadan şimdi ekle, sesle söylemen yeterli 🎙️",
)
# Hatırlatma yalnız son bu kadar günde en az bir kayıt girmiş kullanıcılara gider —
# uygulamayı bırakmış birine her akşam bildirim atıp rahatsız etmeyelim.
HATIRLATMA_AKTIF_GUN = 14


def haftalik_mesaj(bu_hafta, gecen_hafta) -> tuple[str, str]:
    """Haftalık özet bildirimi (başlık, gövde). İki liste de gider işlemleri."""
    toplam = sum(t.tutar for t in bu_hafta)
    onceki = sum(t.tutar for t in gecen_hafta)
    satirlar = [f"Bu hafta {len(bu_hafta)} harcama, toplam {_tl(toplam)} ₺."]
    if onceki > 0:
        fark = (toplam - onceki) / onceki * 100
        if fark <= -5:
            satirlar.append(f"Geçen haftadan %{round(-fark)} daha az 👏")
        elif fark >= 5:
            satirlar.append(f"Geçen haftadan %{round(fark)} daha fazla.")
        else:
            satirlar.append("Geçen haftayla hemen hemen aynı.")
    en = _en_cok(bu_hafta)
    if en:
        satirlar.append(f"En çok: {en[0]} ({_tl(en[1])} ₺)")
    satirlar.append("Yeni haftaya iyi başlangıçlar ✨")
    return "📊 Haftan nasıl geçti?", "\n".join(satirlar)


async def _gunluk_ozet(uid: str, tokens: list[str], b: date) -> int:
    anahtar = f"gunluk:{b.isoformat()}"
    if await repo.bildirim_gonderildi_mi(uid, anahtar):
        return 0
    ay_bas, _ = donem_araligi("month", b)
    aktif_bas = b - timedelta(days=HATIRLATMA_AKTIF_GUN)
    tum = await repo.list_period(uid, min(ay_bas, aktif_bas), b)
    ay = [t for t in tum if t.direction == "gider" and t.tarih >= ay_bas]
    bugun = [t for t in ay if t.tarih == b]
    if bugun:
        try:
            butceler = await repo.budgets_list(uid)
        except Exception:
            butceler = []
        baslik, govde = gunluk_mesaj(bugun, ay, butceler)
    elif not any(t.tarih == b for t in tum) and any(t.tarih >= aktif_bas for t in tum):
        baslik, govde = HATIRLATMA  # bugün hiç kayıt yok, ama son 2 haftada aktif
    else:
        return 0
    ok, _, olu = await push.expo_push_gonder(tokens, baslik, govde, {"tur": "gunluk"})
    await _olu_temizle(olu)
    if ok:
        await repo.bildirim_isaretle(uid, anahtar)
        return 1
    return 0


async def _haftalik_ozet(uid: str, tokens: list[str], b: date) -> int:
    # Pazar akşamı çalışır → biten haftanın (Pazartesi–bugün) özeti. Başka gün çalıştırılırsa
    # bir önceki tam haftayı özetler.
    hafta_gunu = b if b.weekday() == 6 else b - timedelta(days=7)
    bas, bit = hafta_araligi(hafta_gunu)
    anahtar = f"haftalik:{bas.isoformat()}"
    if await repo.bildirim_gonderildi_mi(uid, anahtar):
        return 0
    iki_hafta = [
        t for t in await repo.list_period(uid, bas - timedelta(days=7), bit) if t.direction == "gider"
    ]
    bu_hafta = [t for t in iki_hafta if t.tarih >= bas]
    if not bu_hafta:
        return 0
    gecen_hafta = [t for t in iki_hafta if t.tarih < bas]
    baslik, govde = haftalik_mesaj(bu_hafta, gecen_hafta)
    ok, _, olu = await push.expo_push_gonder(tokens, baslik, govde, {"tur": "haftalik"})
    await _olu_temizle(olu)
    if ok:
        await repo.bildirim_isaretle(uid, anahtar)
        return 1
    return 0
