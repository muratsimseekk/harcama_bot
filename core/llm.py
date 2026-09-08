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
import weakref

import httpx
from groq import (
    APIConnectionError,
    APIStatusError,
    APITimeoutError,
    BadRequestError,
    Groq,
    InternalServerError,
    RateLimitError,
)

from core.config import settings
from core.dates import tarih_parse, tarih_str, today
from core.models import Candidate, tip_normalize
from core.varsayilan_kategoriler import (
    GELIR_KATEGORILERI,
    VARSAYILAN_KATEGORILER,
    digermi,
)
from core.varsayilan_kategoriler import kategori_bolumu as _kategori_bolumu_kur
from core.varsayilan_kategoriler import varsayilan_bolum as _varsayilan_bolum

logger = logging.getLogger(__name__)

_client: Groq | None = None
# Event loop başına bir semaphore (test'ler loop başına yeni; prod tek loop).
# Tek anahtarın RPM'ini korur: fazla eşzamanlı istek reddedilmez, sıraya girer.
_sems: weakref.WeakKeyDictionary = weakref.WeakKeyDictionary()


def _semaphore() -> asyncio.Semaphore:
    loop = asyncio.get_running_loop()
    s = _sems.get(loop)
    if s is None:
        s = asyncio.Semaphore(settings.GROQ_MAX_ES)
        _sems[loop] = s
    return s


class GroqBusy(Exception):
    """Groq geçici olarak kullanılamıyor (rate-limit / 5xx / zaman aşımı) — sonra tekrar dene."""


# Geçici (tekrar denenebilir) sağlayıcı hataları.
_GECICI = (RateLimitError, APITimeoutError, APIConnectionError, InternalServerError)


def _c() -> Groq:
    global _client
    if _client is None:
        _client = Groq(
            api_key=settings.GROQ_API_KEY,
            timeout=httpx.Timeout(settings.GROQ_TIMEOUT, connect=5.0),
            max_retries=1,  # SDK varsayılanı 2 → olay anında istek çoğalmasını azalt
        )
    return _client


async def _isle(fn, *args, **kwargs):
    """Groq çağrısını semaphore altında thread'de çalıştırır; geçici hataları GroqBusy'e çevirir."""
    async with _semaphore():
        try:
            return await asyncio.to_thread(fn, *args, **kwargs)
        except _GECICI as e:
            raise GroqBusy(str(e)) from e
        except APIStatusError as e:
            if e.status_code and e.status_code >= 500:
                raise GroqBusy(str(e)) from e
            raise


# --------------------------------------------------------------------------- #
# Sağlayıcı yardımcıları (tek değişim noktası)
# --------------------------------------------------------------------------- #
def _chat_json(
    system: str, user: str, *, max_tokens: int, temperature: float = 0.1,
    reasoning_effort: str = "low",
) -> str:
    """JSON-object modunda sohbet tamamlaması; ham içerik string döner. Senkron."""
    yanit = _c().chat.completions.create(
        model=settings.PARSE_MODEL,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        temperature=temperature,
        max_tokens=max_tokens,
        reasoning_effort=reasoning_effort,
        response_format={"type": "json_object"},
    )
    return yanit.choices[0].message.content.strip()


def _transcribe_raw(dosya_yolu: str) -> str:
    """Ses dosyasını metne çevirir. Senkron."""
    with open(dosya_yolu, "rb") as f:
        sonuc = _c().audio.transcriptions.create(
            file=(os.path.basename(dosya_yolu), f),
            model=settings.TRANSCRIBE_MODEL,
            language="tr",
            response_format="text",
        )
    return str(sonuc).strip()


# --------------------------------------------------------------------------- #
# Ses → metin
# --------------------------------------------------------------------------- #
async def transcribe(dosya_yolu: str) -> str:
    """Sesi metne çevirir. Groq meşgulse GroqBusy fırlatır; gerçekten anlaşılamazsa "" döner."""
    try:
        return await _isle(_transcribe_raw, dosya_yolu)
    except GroqBusy:
        raise
    except Exception as e:
        logger.error(f"transcribe hatası: {e}", exc_info=True)
        return ""


# --------------------------------------------------------------------------- #
# Metin → işlem adayları
# --------------------------------------------------------------------------- #
_PARSE_SISTEM = """Sen Rota Metal & Alüminyum şirketi için çalışan bir harcama/gelir
takip asistanısın. Hem şirket (işletme) hem sahibinin kişisel ve yatırım işlemlerini
kaydediyorsun. Bugünün tarihi: {bugun}

Kullanıcının mesajında bir veya birden fazla işlem olabilir; virgülle, satır satır ya da
karışık yazılmış olabilir. Her işlemi ayrı ayrı, şu sırayla analiz et:
  1) TUTAR'ı bul ve sayıya çevir.
  2) YÖN: para giriyor mu (gelir) çıkıyor mu (gider)?
  3) TİP: yatirim / isletme / kisisel (aşağıdaki önceliğe göre).
  4) KATEGORİ: aşağıdaki listede, anahtar kelimelerle EŞLEŞEN kategoriyi seç.
  5) EMİN misin? Değilsen kategoriyi boş bırak.

MUTLAKA şu JSON formatında yanıt ver (başka hiçbir şey yazma, sadece JSON):
{{
  "kayitlar": [
    {{
      "aciklama": "kısa ve net açıklama (ne alındı / ne için)",
      "tutar": 123.45,
      "kategori": "listeden bir kategori adı VEYA boş string",
      "neden": "kategori/tip seçimini 8 kelimeyi geçmeyecek şekilde gerekçelendir",
      "tip": "kisisel | isletme | yatirim",
      "yon": "gider | gelir",
      "tarih": "DD.MM.YYYY",
      "emin": true
    }}
  ]
}}

YÖN KURALLARI:
- "maaş aldım", "tahsilat", "satış yaptım", "ödeme aldım", "para geldi", "fatura kestim",
  "sattım" → yon: "gelir"
- Diğer her şey (aldım, ödedim, harcadım, fatura geldi) → yon: "gider"

TİP KURALLARI — ÖNCELİK SIRASI (ilk uyan kazanır):
1. YATIRIM: BES, bireysel emeklilik, hisse, borsa, BIST, Midas, temettü, kripto, bitcoin,
   altın alımı, döviz/dolar/euro alımı, yatırım fonu, tahvil, bono → tip: "yatirim"
2. İŞLETME: galvaniz, üretim, nakliye/sevkiyat, hammadde, demir, alüminyum, çelik, sac,
   profil, personel/işçi maaşı, fabrika, makine, ekipman, işyeri/dükkan gideri,
   mazot/motorin (araç filosu) → tip: "isletme"
3. KİŞİSEL: ev, market, kişisel fatura, sağlık, yemek, ulaşım, giyim vb. → tip: "kisisel"

KATEGORİ KURALLARI:
- Kategoriyi YALNIZ aşağıdaki listeden seç. Her kategorinin yanındaki anahtar kelimelerle
  eşleştir; anlamca en yakın olanı kullan.
- Fatura türü tüm giderler (elektrik, su, doğalgaz, internet, telefon faturası, aidat,
  abonelik) → tek kategori: "Faturalar" (kişisel) veya "Elektrik/Su" (fabrika/işyeri ise).
- Hiçbir kategori net uymuyorsa: kategori alanını BOŞ string ("") bırak ve "emin": false ver.
  ASLA kategori uydurma, ASLA "Diğer" yazma, listede olmayan bir isim yazma.
{kategori_bolumu}
- GELİR: {gelir_kategorileri}

TARİH KURALLARI:
- Tarih belirtildiyse onu kullan (örn: "2 Mayıs" → 02.05.{yil}).
- "dün" → dünün tarihi, "bugün" → {bugun}, "geçen hafta" → 7 gün önce.
- Tarih belirtilmemişse → {bugun}. Format: DD.MM.YYYY.

TUTAR KURALLARI:
- Sayıya çevir: "iki yüz elli" → 250.00, "1.500" → 1500.00, "1,5" → 1.5, "2k" → 2000.
- Her zaman pozitif float döndür.

EMİN ALANI:
- "emin": false ver eğer: kategori listeye net oturmuyorsa, tutar/tip belirsizse,
  açıklama çok genelse ("harcama", "ödeme", "şey" gibi) ya da tutar okunamadıysa.
- Aksi halde "emin": true.

ÖRNEKLER (kategori adları temsilîdir — sen SADECE yukarıdaki listeden seç):
Girdi: "elektrik faturası 850, internet 400"
→ [{{"aciklama":"Elektrik faturası","tutar":850,"kategori":"Faturalar","neden":"fatura","tip":"kisisel","yon":"gider","emin":true}},
   {{"aciklama":"İnternet faturası","tutar":400,"kategori":"Faturalar","neden":"internet aboneliği","tip":"kisisel","yon":"gider","emin":true}}]
Girdi: "şey için 200 harcadım"
→ [{{"aciklama":"Belirsiz harcama","tutar":200,"kategori":"","neden":"kategori belirsiz","tip":"kisisel","yon":"gider","emin":false}}]

Eğer metin hiç işlem içermiyorsa: {{"kayitlar": []}}"""


def _kategori_bolumu(kategoriler) -> str:
    """Kategori listesini tip'e göre gruplu, anahtar kelimeli prompt bölümüne çevirir."""
    if not kategoriler:
        return _varsayilan_bolum()
    gruplar: dict[str, list[tuple[str, list[str]]]] = {
        "kisisel": [], "isletme": [], "yatirim": [],
    }
    gorulen: dict[str, set[str]] = {"kisisel": set(), "isletme": set(), "yatirim": set()}
    for k in kategoriler:
        if k.tip in gruplar and k.name not in gorulen[k.tip] and not digermi(k.name):
            gorulen[k.tip].add(k.name)
            gruplar[k.tip].append((k.name, list(getattr(k, "keywords", []) or [])))
    return _kategori_bolumu_kur(gruplar) or _varsayilan_bolum()


def _gecerli_kategori_adlari(kategoriler) -> set[str]:
    """Modelin seçebileceği geçerli kategori adları (küçük harf). Liste dışı isim reddedilir."""
    adlar = {g.lower() for g in GELIR_KATEGORILERI}
    if kategoriler:
        adlar |= {k.name.lower() for k in kategoriler if not digermi(k.name)}
    else:
        for ogeler in VARSAYILAN_KATEGORILER.values():
            adlar |= {o["name"].lower() for o in ogeler}
    return adlar


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
        gelir_kategorileri=", ".join(GELIR_KATEGORILERI),
    )

    try:
        ham = await _isle(
            _chat_json, sistem, metin,
            max_tokens=1500, reasoning_effort=settings.PARSE_REASONING,
        )
    except GroqBusy:
        raise
    except BadRequestError as e:
        # json_validate_failed: model geçerli JSON üretemedi (geçici) → aday yok say.
        logger.warning(f"parse_transactions geçersiz JSON üretimi: {e}")
        return []
    except Exception as e:
        logger.error(f"parse_transactions Groq çağrısı başarısız: {e}", exc_info=True)
        raise

    try:
        veri = json.loads(ham)
    except json.JSONDecodeError as e:
        logger.error(f"parse_transactions JSON değil: {e} | {ham[:400]}")
        return []

    gecerli_adlar = _gecerli_kategori_adlari(kategoriler)
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

        kategori = str(h.get("kategori", "")).strip()
        emin = bool(h.get("emin", True))
        if kategori and kategori.lower() not in gecerli_adlar:
            # Model listede olmayan bir kategori uydurdu → boşalt, kullanıcı seçsin.
            logger.info("parse: liste dışı kategori %r → boşaltıldı", kategori)
            kategori = ""
            emin = False

        adaylar.append(Candidate(
            aciklama=str(h.get("aciklama", "")).strip() or "—",
            tutar=tutar,
            kategori=kategori,
            neden=str(h.get("neden", "")).strip(),
            tip=tip_normalize(h.get("tip", "kisisel")),
            direction="gelir" if str(h.get("yon", "gider")).lower().startswith("gel") else "gider",
            tarih=tarih_parse(h.get("tarih", "")) if h.get("tarih") else bugun,
            emin=emin,
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
        ham = await _isle(_chat_json, sistem, soru, max_tokens=400)
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
        ham = await _isle(
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
        ham = await _isle(
            _chat_json, _DUZELTME_SISTEM, metin, max_tokens=120, temperature=0.0
        )
        veri = json.loads(ham)
        return veri if isinstance(veri, dict) else {}
    except Exception as e:
        logger.warning(f"parse_correction hatası: {e}")
        return {}
