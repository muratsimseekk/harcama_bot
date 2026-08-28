"""Groq tabanlı dil işlemleri: ses→metin, işlem çıkarımı, soru analizi, niyet sınıflama.

Groq SDK senkron; tüm çağrılar `asyncio.to_thread` ile sarılır ki Telegram event loop'u
bloke olmasın.

Sağlayıcıya özel her şey `_chat_json` ve `_transcribe_raw` yardımcılarında toplanmıştır;
ileride başka bir sağlayıcıya geçiş bu iki fonksiyonla sınırlıdır.
"""
from __future__ import annotations

import asyncio
import json
import logging
import os

from groq import Groq

from core.config import settings
from core.dates import tarih_parse, tarih_str, today
from core.models import Candidate, tip_normalize

logger = logging.getLogger(__name__)

_client: Groq | None = None


def _c() -> Groq:
    global _client
    if _client is None:
        _client = Groq(api_key=settings.GROQ_API_KEY)
    return _client


# --------------------------------------------------------------------------- #
# Sağlayıcı yardımcıları (tek değişim noktası)
# --------------------------------------------------------------------------- #
def _chat_json(system: str, user: str, *, max_tokens: int, temperature: float = 0.1) -> str:
    """JSON-object modunda sohbet tamamlaması; ham içerik string döner. Senkron."""
    yanit = _c().chat.completions.create(
        model=settings.PARSE_MODEL,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        temperature=temperature,
        max_tokens=max_tokens,
        reasoning_effort="low",
        response_format={"type": "json_object"},
    )
    return yanit.choices[0].message.content.strip()


def _transcribe_raw(dosya_yolu: str) -> str:
    """Ses dosyasını metne çevirir. Senkron."""
    with open(dosya_yolu, "rb") as f:
        sonuc = _c().audio.transcriptions.create(
            file=(os.path.basename(dosya_yolu), f.read()),
            model=settings.TRANSCRIBE_MODEL,
            language="tr",
            response_format="text",
        )
    return str(sonuc).strip()


# --------------------------------------------------------------------------- #
# Ses → metin
# --------------------------------------------------------------------------- #
async def transcribe(dosya_yolu: str) -> str:
    try:
        return await asyncio.to_thread(_transcribe_raw, dosya_yolu)
    except Exception as e:
        logger.error(f"transcribe hatası: {e}", exc_info=True)
        return ""


# --------------------------------------------------------------------------- #
# Metin → işlem adayları
# --------------------------------------------------------------------------- #
_PARSE_SISTEM = """Sen Rota Metal & Alüminyum şirketinin harcama/gelir takip asistanısın.
Bugünün tarihi: {bugun}

Kullanıcının mesajında bir veya birden fazla işlem (harcama veya gelir) olabilir. Tümünü analiz et.
Mesaj virgülle ayrılmış, satır satır veya karma formatta olabilir.

MUTLAKA şu JSON formatında yanıt ver (başka hiçbir şey yazma, sadece JSON):
{{
  "kayitlar": [
    {{
      "aciklama": "kısa açıklama",
      "tutar": 123.45,
      "kategori": "kategori adı",
      "tip": "kisisel | isletme | yatirim",
      "yon": "gider | gelir",
      "tarih": "DD.MM.YYYY",
      "emin": true
    }}
  ]
}}

YÖN KURALLARI:
- "maaş", "gelir", "tahsilat", "satış yaptım", "ödeme aldım", "para geldi", "fatura kestim" → yon: "gelir"
- Diğer her şey → yon: "gider"

TİP KURALLARI — ÖNCELİK SIRASI:
1. YATIRIM: BES, bireysel emeklilik, hisse, borsa, kripto, altın, döviz alımı, fon, tahvil, bono, yatırım fonu, BIST, Midas, temettü → tip: "yatirim"
2. İŞLETME: ankraj, galvaniz, üretim, nakliye, malzeme, personel, fabrika, demir, alüminyum, hammadde, çelik, rota metal, işçi, sevkiyat, makine, ekipman, dükkan gideri → tip: "isletme"
3. KİŞİSEL: diğer her şey → tip: "kisisel"

KATEGORİ KURALLARI (yalnız bu listelerden seç, uymuyorsa ilgili "Diğer"):
{kategori_bolumu}
- GELİR: Maaş, Tahsilat, Satış, Diğer Gelir

TARİH KURALLARI:
- Tarih belirtildiyse o tarihi kullan (örn: "2 Mayıs" → 02.05.{yil})
- "dün" → dünün tarihi, "geçen hafta" → 7 gün önce
- Tarih belirtilmemişse → bugün: {bugun}
- Format: DD.MM.YYYY

TUTAR KURALLARI:
- Sayıya çevir: "iki yüz elli" → 250.00, "1.500" → 1500.00, "1,5" → 1.5
- Her zaman pozitif float döndür

EMİN ALANI:
- "emin": false ver eğer tutar/kategori/tip'ten emin değilsen, açıklama çok belirsizse
  ("harcama", "ödeme" gibi), ya da tutar okunamadıysa. Aksi halde "emin": true.

SATIN ALMA KURALI:
- "dolar aldım 500 lira" → gider, yatirim (Altın/Döviz), tutar=500
- "altın aldım 2000 TL" → gider, yatirim (Altın/Döviz), tutar=2000

Eğer metin hiç işlem içermiyorsa boş liste döndür: {{"kayitlar": []}}"""

_VARSAYILAN_KATEGORI_BOLUMU = (
    "- KİŞİSEL: Market, Sigara/İçecek, Kafe/Restoran, Ulaşım, Sağlık, Giyim, Eğlence, "
    "Fatura, Telefon/İnternet, Diğer\n"
    "- İŞLETME: Hammadde, Nakliye, Personel, Yakıt/Araç, Elektrik/Su, Kira, "
    "Makine/Ekipman, Galvaniz, Diğer İşletme\n"
    "- YATIRIM: BES/Emeklilik, Hisse Senedi, Kripto Para, Altın/Döviz, Yatırım Fonu, "
    "Tahvil/Bono, Diğer Yatırım"
)

_TIP_BASLIK = {"kisisel": "KİŞİSEL", "isletme": "İŞLETME", "yatirim": "YATIRIM"}


def _kategori_bolumu(kategoriler) -> str:
    """Category listesinden tip'e göre gruplu prompt bölümü kurar."""
    if not kategoriler:
        return _VARSAYILAN_KATEGORI_BOLUMU
    gruplar: dict[str, list[str]] = {"kisisel": [], "isletme": [], "yatirim": []}
    for k in kategoriler:
        if k.tip in gruplar and k.name not in gruplar[k.tip]:
            gruplar[k.tip].append(k.name)
    satirlar = []
    for tip, adlar in gruplar.items():
        if adlar:
            satirlar.append(f"- {_TIP_BASLIK[tip]}: {', '.join(adlar)}")
    return "\n".join(satirlar) or _VARSAYILAN_KATEGORI_BOLUMU


async def parse_transactions(
    metin: str, *, kaynak: str = "telegram_text", kategoriler=None,
) -> list[Candidate]:
    """Metni işlem adaylarına çevirir. Groq'a ulaşılamazsa exception fırlatır.

    `kategoriler` verilirse (list[core.models.Category]) KATEGORİ bölümü bundan kurulur.
    """
    bugun = today()
    sistem = _PARSE_SISTEM.format(
        bugun=tarih_str(bugun), yil=bugun.year,
        kategori_bolumu=_kategori_bolumu(kategoriler),
    )

    try:
        ham = await asyncio.to_thread(_chat_json, sistem, metin, max_tokens=2000)
    except Exception as e:
        logger.error(f"parse_transactions Groq çağrısı başarısız: {e}", exc_info=True)
        raise

    try:
        veri = json.loads(ham)
    except json.JSONDecodeError as e:
        logger.error(f"parse_transactions JSON değil: {e} | {ham[:400]}")
        return []

    kayitlar = veri.get("kayitlar", []) if isinstance(veri, dict) else []
    adaylar: list[Candidate] = []
    for h in kayitlar if isinstance(kayitlar, list) else []:
        if not isinstance(h, dict) or "tutar" not in h:
            continue
        try:
            tutar = abs(float(h["tutar"]))
        except (TypeError, ValueError):
            continue
        if tutar <= 0:
            continue
        adaylar.append(Candidate(
            aciklama=str(h.get("aciklama", "")).strip() or "—",
            tutar=tutar,
            kategori=str(h.get("kategori", "")).strip() or "Diğer",
            tip=tip_normalize(h.get("tip", "kisisel")),
            direction="gelir" if str(h.get("yon", "gider")).lower().startswith("gel") else "gider",
            tarih=tarih_parse(h.get("tarih", "")) if h.get("tarih") else bugun,
            emin=bool(h.get("emin", True)),
            ham_girdi=metin,
            kaynak=kaynak,
        ))
    return adaylar


# --------------------------------------------------------------------------- #
# Soru analizi (raporlar)
# --------------------------------------------------------------------------- #
async def analyze_query(soru: str) -> dict | None:
    bugun = today()
    sistem = f"""Sen bir harcama/yatirim analiz asistanisin. Bugun: {tarih_str(bugun)}

Kullanicinin sorusunu analiz et ve SADECE su JSON formatinda yanit ver:
{{
  "mod": "ay veya yil",
  "ay": "ay adi veya gecen ay veya bu ay",
  "yil": {bugun.year},
  "tip_filtre": "kisisel veya isletme veya yatirim veya hepsi",
  "yon_filtre": "gider veya gelir veya hepsi",
  "kategori_anahtar_kelimeler": [],
  "soru_ozet": "kisa ozet"
}}

MOD: "gecen yil", "bu yil", "2025 yili", "yillik" -> mod: "yil". Diger -> mod: "ay"
TIP: "yatirim","BES","hisse","kripto","altin","emeklilik","fon" -> "yatirim"
     "kisisel","sahsi" -> "kisisel"
     "isletme","dukkan","fabrika" -> "isletme"
     Belirtilmemisse -> "hepsi"
YON: "gelir","maas","kazanc" -> "gelir"; "gider","harcama" -> "gider"; belirtilmemisse -> "hepsi"
"""

    try:
        ham = await asyncio.to_thread(_chat_json, sistem, soru, max_tokens=400)
        return json.loads(ham)
    except Exception as e:
        logger.error(f"analyze_query hatasi: {e}", exc_info=True)
        return None


# --------------------------------------------------------------------------- #
# Niyet sınıflama
# --------------------------------------------------------------------------- #
_RAPOR_KELIMELERI = (
    "rapor", "analiz", "özet", "ozet", "ne kadar", "kaç lira", "kac lira",
    "toplam", "istatistik", "listele", "grafik", "karşılaştır", "karsilastir",
)
_DUZELTME_KELIMELERI = (
    "sil", "düzelt", "duzelt", "geri al", "yanlış", "yanlis", "iptal",
    "değiştir", "degistir", "güncelle", "guncelle",
)

_INTENT_SISTEM = (
    "Kullanıcı mesajının niyetini sınıfla. SADECE şu JSON: "
    '{"niyet": "islem | rapor | duzeltme | yardim"}. '
    "islem = yeni harcama/gelir kaydı. rapor = geçmiş veri sorgusu/özet. "
    "duzeltme = var olan kaydı sil/düzelt. yardim = kullanım sorusu."
)


async def classify_intent(metin: str) -> str:
    """Döndürür: 'rapor' | 'duzeltme' | 'islem' | 'yardim'."""
    d = metin.lower().strip()
    if d in ("yardım", "yardim", "help", "?", "nasıl", "nasil", "komutlar", "start"):
        return "yardim"
    if any(k in d for k in ("nasıl kullan", "nasil kullan", "ne işe yar", "ne ise yar",
                            "nasıl çalış", "nasil calis", "yardım et", "yardim et")):
        return "yardim"
    if any(k in d for k in _DUZELTME_KELIMELERI) and not any(c.isdigit() for c in d[:3]):
        return "duzeltme"
    if any(k in d for k in _RAPOR_KELIMELERI):
        return "rapor"

    try:
        ham = await asyncio.to_thread(
            _chat_json, _INTENT_SISTEM, metin, max_tokens=200, temperature=0.0
        )
        niyet = json.loads(ham).get("niyet", "islem")
        return niyet if niyet in ("islem", "rapor", "duzeltme", "yardim") else "islem"
    except Exception as e:
        logger.warning(f"classify_intent LLM hatası, 'islem' varsayılıyor: {e}")
        return "islem"


# --------------------------------------------------------------------------- #
# Düzeltme metnini alan→değer sözlüğüne çevir
# --------------------------------------------------------------------------- #
_DUZELTME_SISTEM = (
    "Kullanıcı bir işlem kaydında ne değiştirmek istediğini söylüyor. "
    "SADECE değişecek alanları şu JSON'da döndür (değişmeyenleri ekleme): "
    '{"tutar": 0.0, "kategori": "", "aciklama": "", "tip": "kisisel|isletme|yatirim", '
    '"yon": "gider|gelir", "tarih": "DD.MM.YYYY"}. '
    "Tarih için 'dün','bugün' gibi ifadeleri DD.MM.YYYY'ye çevir."
)


async def parse_correction(metin: str) -> dict:
    """'kategori market, tutar 95' → {'kategori': 'market', 'tutar': 95.0}"""
    try:
        ham = await asyncio.to_thread(
            _chat_json, _DUZELTME_SISTEM, metin, max_tokens=120, temperature=0.0
        )
        veri = json.loads(ham)
        return veri if isinstance(veri, dict) else {}
    except Exception as e:
        logger.warning(f"parse_correction hatası: {e}")
        return {}
