import os
import json
import logging
from datetime import datetime
from groq import Groq

logger = logging.getLogger(__name__)

GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
client = Groq(api_key=GROQ_API_KEY)

# LLM parse modeli — llama-3.3-70b-versatile Groq tarafından 16.08.2026'da kaldırıldı.
PARSE_MODEL = os.environ.get("GROQ_PARSE_MODEL", "openai/gpt-oss-120b")
TRANSCRIBE_MODEL = os.environ.get("GROQ_TRANSCRIBE_MODEL", "whisper-large-v3")


async def ses_to_metin(dosya_yolu: str) -> str:
    """OGG ses dosyasını Türkçe metne çevirir (Groq Whisper)"""
    try:
        with open(dosya_yolu, "rb") as dosya:
            transkripsiyon = client.audio.transcriptions.create(
                file=(os.path.basename(dosya_yolu), dosya.read()),
                model=TRANSCRIBE_MODEL,
                language="tr",
                response_format="text"
            )
        return str(transkripsiyon).strip()
    except Exception as e:
        logger.error(f"Ses-metin hatası: {e}", exc_info=True)
        return ""


async def metni_parse_et(metin: str) -> list[dict]:
    """
    Harcama/yatırım metnini parse eder.
    tip: 'kisisel', 'isletme' veya 'yatirim'

    Dönüş: harcama dict listesi (metin kayıt içermiyorsa boş liste).
    Groq API'ye ulaşılamazsa exception fırlatır (çağıran ayırt edebilsin diye).
    """
    bugun = datetime.now().strftime("%d.%m.%Y")
    bugun_yil = datetime.now().year

    sistem_promptu = f"""Sen Rota Metal & Alüminyum şirketinin harcama takip asistanısın.
Bugünün tarihi: {bugun}

Kullanıcının mesajında bir veya birden fazla harcama/yatırım olabilir. Tümünü analiz et.
Mesaj virgülle ayrılmış, satır satır veya karma formatta olabilir.

MUTLAKA şu JSON formatında yanıt ver (başka hiçbir şey yazma, sadece JSON):
{{
  "kayitlar": [
    {{
      "aciklama": "kısa açıklama",
      "tutar": 123.45,
      "kategori": "kategori adı",
      "tip": "kisisel veya isletme veya yatirim",
      "tarih": "DD.MM.YYYY"
    }}
  ]
}}

TİP KURALLARI — ÖNCELİK SIRASI:
1. YATIRIM: BES, bireysel emeklilik, hisse, borsa, kripto, altın, döviz alımı, fon, tahvil, bono, yatırım fonu, BIST, Midas, Robinhood, temettü → tip: "yatirim"
2. İŞLETME: ankraj, galvaniz, üretim, nakliye, malzeme, personel, fabrika, demir, alüminyum, hammadde, çelik, rota metal, işçi, sevkiyat, makine, ekipman, dükkan gideri → tip: "isletme"
3. KİŞİSEL: diğer her şey → tip: "kisisel"

KATEGORİ KURALLARI:
- KİŞİSEL: Market, Sigara/İçecek, Kafe/Restoran, Ulaşım, Sağlık, Giyim, Eğlence, Fatura, Telefon/İnternet, Diğer
- İŞLETME: Hammadde, Nakliye, Personel, Yakıt/Araç, Elektrik/Su, Kira, Makine/Ekipman, Galvaniz, Diğer İşletme
- YATIRIM: BES/Emeklilik, Hisse Senedi, Kripto Para, Altın/Döviz, Yatırım Fonu, Tahvil/Bono, Diğer Yatırım

TARİH KURALLARI:
- Tarih belirtildiyse o tarihi kullan (örn: "2 Mayıs" → 02.05.{bugun_yil})
- "dün" → dünün tarihi, "geçen hafta" → 7 gün önce
- Tarih belirtilmemişse → bugün: {bugun}
- Format: DD.MM.YYYY

TUTAR KURALLARI:
- Sayıya çevir: "iki yüz elli" → 250.00, "1.500" → 1500.00, "1,5" → 1.5
- Her zaman float döndür

SATIN ALMA KURALI:
- "dolar aldım 500 lira" → yatirim (Altın/Döviz), tutar=500
- "altın aldım 2000 TL" → yatirim (Altın/Döviz), tutar=2000

Eğer metin hiç kayıt içermiyorsa boş liste döndür: {{"kayitlar": []}}"""

    try:
        yanit = client.chat.completions.create(
            model=PARSE_MODEL,
            messages=[
                {"role": "system", "content": sistem_promptu},
                {"role": "user", "content": metin}
            ],
            temperature=0.1,
            max_tokens=2000,
            reasoning_effort="low",
            response_format={"type": "json_object"},
        )
        yanit_metni = yanit.choices[0].message.content.strip()
    except Exception as e:
        logger.error(f"Groq parse çağrısı başarısız: {e}", exc_info=True)
        raise

    try:
        veri = json.loads(yanit_metni)
    except json.JSONDecodeError as e:
        logger.error(f"Groq yanıtı JSON değil: {e} | yanıt: {yanit_metni[:500]}")
        return []

    kayitlar = veri.get("kayitlar", []) if isinstance(veri, dict) else []
    if not isinstance(kayitlar, list):
        return []

    temiz = []
    for h in kayitlar:
        if not isinstance(h, dict) or "tutar" not in h:
            continue
        if not h.get("tarih"):
            h["tarih"] = datetime.now().strftime("%d.%m.%Y")
        temiz.append(h)
    return temiz
