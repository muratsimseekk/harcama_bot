"""Varsayılan kategoriler — tek kaynak.

`core.repo.categories_seed` (yeni kullanıcıya bu listeyi yazar) ve `core.llm`
(parse prompt'una kategori + anahtar kelime bölümünü kurar) buradan okur.
Anahtar kelimeler yapay zekanın kategori eşleştirmesini yönlendirir; kullanıcı
uygulamadan düzenleyebilir.
"""
from __future__ import annotations

# tip -> [{"name": kategori adı, "keywords": [tetikleyici kelimeler]}]
VARSAYILAN_KATEGORILER: dict[str, list[dict]] = {
    "kisisel": [
        {"name": "Market", "keywords": [
            "market", "bakkal", "manav", "süpermarket", "a101", "bim", "şok",
            "migros", "carrefour", "gıda", "alışveriş",
        ]},
        {"name": "Faturalar", "keywords": [
            "fatura", "elektrik", "su faturası", "doğalgaz", "gaz faturası",
            "internet", "telefon faturası", "gsm", "aidat", "abonelik",
            "netflix", "spotify", "youtube premium",
        ]},
        {"name": "Kafe/Restoran", "keywords": [
            "kafe", "cafe", "restoran", "lokanta", "yemek", "kahve", "çay",
            "starbucks", "fast food", "döner", "pizza",
        ]},
        {"name": "Ulaşım", "keywords": [
            "otobüs", "metro", "metrobüs", "iett", "taksi", "uber", "bitaksi",
            "bilet", "hgs", "ogs", "otopark", "benzin",
        ]},
        {"name": "Sağlık", "keywords": [
            "eczane", "ilaç", "doktor", "hastane", "muayene", "tahlil",
            "diş", "gözlük", "optik",
        ]},
        {"name": "Giyim", "keywords": [
            "giyim", "kıyafet", "ayakkabı", "tekstil", "mont", "pantolon",
            "tişört", "çanta",
        ]},
        {"name": "Eğlence", "keywords": [
            "sinema", "konser", "tiyatro", "oyun", "steam", "playstation",
            "tatil", "gezi", "bar",
        ]},
        {"name": "Sigara/İçecek", "keywords": [
            "sigara", "tütün", "puro", "içki", "alkol", "bira", "rakı", "şarap",
        ]},
    ],
    "isletme": [
        {"name": "Hammadde", "keywords": [
            "demir", "alüminyum", "çelik", "sac", "sac levha", "profil",
            "hammadde", "malzeme", "boru", "lama",
        ]},
        {"name": "Nakliye", "keywords": [
            "nakliye", "kargo", "sevkiyat", "taşıma", "lojistik", "navlun",
            "kamyon", "tır",
        ]},
        {"name": "Personel", "keywords": [
            "maaş", "işçi", "personel", "yevmiye", "sgk", "prim", "mesai",
            "avans", "bordro",
        ]},
        {"name": "Yakıt/Araç", "keywords": [
            "mazot", "motorin", "yakıt", "araç", "servis", "lastik", "yağ değişimi",
            "araç bakım",
        ]},
        {"name": "Elektrik/Su", "keywords": [
            "fabrika elektrik", "sanayi elektrik", "işyeri su", "fabrika su",
            "tesis elektrik",
        ]},
        {"name": "Kira", "keywords": [
            "kira", "dükkan kirası", "işyeri kirası", "depo kirası", "fabrika kirası",
        ]},
        {"name": "Makine/Ekipman", "keywords": [
            "makine", "ekipman", "tezgah", "cnc", "kaynak makinesi", "kompresör",
            "alet", "el aleti",
        ]},
        {"name": "Galvaniz", "keywords": [
            "galvaniz", "kaplama", "boya", "astar", "toz boya", "elektrostatik",
        ]},
    ],
    "yatirim": [
        {"name": "BES/Emeklilik", "keywords": [
            "bes", "bireysel emeklilik", "emeklilik", "otomatik katılım",
        ]},
        {"name": "Hisse Senedi", "keywords": [
            "hisse", "borsa", "bist", "midas", "temettü", "pay senedi",
        ]},
        {"name": "Kripto Para", "keywords": [
            "bitcoin", "btc", "ethereum", "eth", "kripto", "coin", "binance",
            "usdt", "altcoin",
        ]},
        {"name": "Altın/Döviz", "keywords": [
            "altın", "gram altın", "çeyrek altın", "dolar", "euro", "sterlin",
            "döviz", "külçe",
        ]},
        {"name": "Yatırım Fonu", "keywords": [
            "fon", "yatırım fonu", "portföy", "serbest fon", "hisse fonu",
        ]},
        {"name": "Tahvil/Bono", "keywords": [
            "tahvil", "bono", "hazine bonosu", "eurobond", "devlet tahvili",
        ]},
    ],
}

# Gelir kategorileri tabloya girmez, yalnız prompt'ta kullanılır.
GELIR_KATEGORILERI: list[str] = ["Maaş", "Tahsilat", "Satış", "Diğer Gelir"]

# "Diğer" türevi isimler — yapay zekaya asla seçtirilmez (kullanıcı elle seçebilir).
# Eski seed'lerden kalma "Diğer" kategorileri prompt'tan ve geçerli-isim setinden düşürülür.
DIGER_ADLARI: frozenset[str] = frozenset({
    "diğer", "diger", "diğer işletme", "diger isletme",
    "diğer yatırım", "diger yatirim",
})


def digermi(ad: str) -> bool:
    return ad.strip().lower() in DIGER_ADLARI

_TIP_BASLIK = {"kisisel": "KİŞİSEL", "isletme": "İŞLETME", "yatirim": "YATIRIM"}


def kategori_bolumu(
    gruplar: dict[str, list[tuple[str, list[str]]]], *, keyword_limiti: int = 5
) -> str:
    """{tip: [(ad, keywords), ...]} -> prompt için kategori + anahtar kelime bloğu."""
    satirlar: list[str] = []
    for tip, ogeler in gruplar.items():
        if not ogeler:
            continue
        satirlar.append(f"- {_TIP_BASLIK[tip]}:")
        for ad, kws in ogeler:
            kws = [k for k in kws if k][:keyword_limiti]
            if kws:
                satirlar.append(f"  • {ad} — {', '.join(kws)}")
            else:
                satirlar.append(f"  • {ad}")
    return "\n".join(satirlar)


def varsayilan_bolum() -> str:
    """Kullanıcı kategorisi yokken kullanılan varsayılan prompt bloğu."""
    gruplar = {
        tip: [(o["name"], o["keywords"]) for o in ogeler]
        for tip, ogeler in VARSAYILAN_KATEGORILER.items()
    }
    return kategori_bolumu(gruplar)
