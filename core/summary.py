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
    gelir_kirilim: list[KategoriKirilim] = field(default_factory=list)


def _oran(pay: float, toplam: float) -> float:
    return round(pay / toplam * 100, 1) if toplam else 0.0


def _kategori_kirilimi(kayitlar: list[Transaction], toplam: float) -> list[KategoriKirilim]:
    """Kayıtları (kategori, tip) bazında toplar, tutara göre azalan sıralar."""
    kat_top: dict[tuple[str, str], list[float]] = {}
    for t in kayitlar:
        anahtar = (t.kategori or "Diğer", t.tip)
        acc = kat_top.setdefault(anahtar, [0.0, 0])
        acc[0] += t.tutar
        acc[1] += 1
    return [
        KategoriKirilim(
            kategori=kat,
            tip=tip,  # type: ignore[arg-type]
            tutar=round(tut, 2),
            adet=ad,
            oran=_oran(tut, toplam),
        )
        for (kat, tip), (tut, ad) in sorted(
            kat_top.items(), key=lambda kv: kv[1][0], reverse=True
        )
    ]


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
        kategori_kirilim=_kategori_kirilimi(giderler, toplam_gider),
        gunluk=gunluk,
        gelir_kirilim=_kategori_kirilimi(gelirler, toplam_gelir),
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


ALT_HEDEF_ON = "yatirim:"  # goals.tip = "yatirim:<kategori adı>" → o kategorinin aylık hedefi


def _ilerleme(birikmis: float, hedef: float) -> dict:
    return {
        "hedef": round(hedef, 2),
        "birikmis": round(birikmis, 2),
        "kalan": round(max(0.0, hedef - birikmis), 2),
        "oran": round(birikmis / hedef * 100, 1) if hedef else 0.0,
    }


def alt_hedefler(goals) -> dict[str, float]:
    """goals listesinden {kategori: hedef} (yalnız yatırım alt hedefleri)."""
    return {
        g.tip[len(ALT_HEDEF_ON):]: g.hedef_amount
        for g in goals if g.tip.startswith(ALT_HEDEF_ON) and g.tip[len(ALT_HEDEF_ON):]
    }


def yatirim_ilerleme(txs, hedef_amount: float, alt: dict[str, float] | None = None) -> dict:
    """Dönemde 'yatirim' tipi giderlerin toplamı = birikmiş. `alt` verilirse her alt hedefin
    ilerlemesi (kategori bazında birikmiş) ve alt hedeflerin toplamı da döner."""
    yatirimlar = [t for t in txs if t.direction == "gider" and t.tip == "yatirim"]
    out = _ilerleme(sum(t.tutar for t in yatirimlar), hedef_amount)
    alt = alt or {}
    out["kategoriler"] = [
        {"kategori": k, **_ilerleme(sum(t.tutar for t in yatirimlar if t.kategori == k), h)}
        for k, h in sorted(alt.items(), key=lambda kv: -kv[1])
    ]
    out["alt_toplam"] = round(sum(alt.values()), 2)
    return out


def genel_hedef_senkron(genel: float | None, eski_toplam: float, yeni_toplam: float) -> float | None:
    """Bir alt hedef değişince genel yatırım hedefinin yeni değeri; None = dokunma.

    Genel hedef alt hedeflerin toplamıyla uyumluysa (ya da hiç yoksa) yeni toplamı izler.
    Kullanıcı genel hedefi bilerek farklı bir tutara koyduysa korunur — uygulama farkı
    gösterip "toplama eşitle" önerir. 0 dönerse genel hedef silinmeli.
    """
    if genel is None or abs(genel - eski_toplam) < 0.01:
        return round(yeni_toplam, 2)
    return None


# --------------------------------------------------------------------------- #
# Kategori karşılaştırması (Analiz → kategoriler) ve aylık trend
# --------------------------------------------------------------------------- #
def _ay_sonu(d: date) -> date:
    sonraki = date(d.year + (d.month == 12), d.month % 12 + 1, 1)
    return date.fromordinal(sonraki.toordinal() - 1)


def _ay_ekle(d: date, n: int) -> date:
    """Ayın 1'ine göre n ay kaydırır (gün 1 kabul edilir)."""
    m = d.year * 12 + (d.month - 1) + n
    return date(m // 12, m % 12 + 1, 1)


def onceki_aralik(bas: date, bit: date) -> tuple[date, date]:
    """Kıyas dönemi. Tam takvim ay(lar)ı ise bir önceki aynı sayıda ay (Kasım → Ekim,
    Q3 → Q2, yıl → önceki yıl); değilse hemen önceki aynı uzunlukta pencere."""
    if bas.day == 1 and bit == _ay_sonu(bit):
        ay = (bit.year - bas.year) * 12 + bit.month - bas.month + 1
        obas = _ay_ekle(bas, -ay)
        return obas, _ay_sonu(_ay_ekle(bas, -1))
    gun = (bit - bas).days + 1
    obit = date.fromordinal(bas.toordinal() - 1)
    return date.fromordinal(obit.toordinal() - gun + 1), obit


def degisim(bu: float, onceki: float) -> float | None:
    """Yüzde değişim; önceki 0 ise tanımsız (None → istemci 'yeni' der)."""
    if onceki <= 0:
        return None
    return round((bu - onceki) / onceki * 100, 1)


def kategori_karsilastir(bu: list[Transaction], onceki: list[Transaction], yon: str) -> dict:
    """Seçilen yönde (gider/gelir) her kategorinin bu ve önceki dönem toplamı + % değişim.
    Önceki dönemde olup bu dönem hiç olmayan kategoriler de (0 ile) listelenir."""
    bu = [t for t in bu if t.direction == yon]
    onceki = [t for t in onceki if t.direction == yon]
    toplam = round(sum(t.tutar for t in bu), 2)
    otoplam = round(sum(t.tutar for t in onceki), 2)
    # Ada göre gruplanır (aynı ad farklı bölümde olabilir: kişisel "Diğer" + işletme "Diğer");
    # liste/detay da ada göre süzdüğü için iki satır olsa önceki dönem iki kez sayılırdı.
    oharita: dict[str, float] = {}
    for t in onceki:
        k = t.kategori or "Diğer"
        oharita[k] = oharita.get(k, 0.0) + t.tutar
    bharita: dict[str, list] = {}  # ad -> [tutar, adet, tip]
    for t in bu:
        acc = bharita.setdefault(t.kategori or "Diğer", [0.0, 0, t.tip])
        acc[0] += t.tutar
        acc[1] += 1
    satirlar = []
    gorulen = set()
    for ad, (tut, adet, tip) in sorted(bharita.items(), key=lambda kv: kv[1][0], reverse=True):
        tut = round(tut, 2)
        o = round(oharita.get(ad, 0.0), 2)
        gorulen.add(ad)
        satirlar.append({"kategori": ad, "tip": tip, "tutar": tut, "adet": adet,
                         "oran": _oran(tut, toplam), "onceki_tutar": o, "degisim": degisim(tut, o)})
    tipler = {t.kategori or "Diğer": t.tip for t in onceki}
    for kat, o in sorted(oharita.items(), key=lambda kv: kv[1], reverse=True):
        if kat not in gorulen:
            satirlar.append({"kategori": kat, "tip": tipler[kat], "tutar": 0.0, "adet": 0,
                             "oran": 0.0, "onceki_tutar": round(o, 2), "degisim": -100.0})
    return {"toplam": toplam, "onceki_toplam": otoplam, "degisim": degisim(toplam, otoplam),
            "kategoriler": satirlar}


def aylik_trend(txs: list[Transaction], son_ay: date, aylar: int) -> list[dict]:
    """`son_ay` dahil geriye `aylar` takvim ayının toplamı + bir önceki aya göre % değişim."""
    ilk = _ay_ekle(date(son_ay.year, son_ay.month, 1), -(aylar - 1))
    sepet: dict[tuple[int, int], list[float]] = {}
    for t in txs:
        acc = sepet.setdefault((t.tarih.year, t.tarih.month), [0.0, 0])
        acc[0] += t.tutar
        acc[1] += 1
    sonuc: list[dict] = []
    for i in range(aylar):
        a = _ay_ekle(ilk, i)
        tut, adet = sepet.get((a.year, a.month), [0.0, 0])
        tut = round(tut, 2)
        onceki = sonuc[-1]["tutar"] if sonuc else None
        sonuc.append({"ay": f"{a.year}-{a.month:02d}", "tutar": tut, "adet": int(adet),
                      "degisim": degisim(tut, onceki) if onceki is not None else None})
    return sonuc
