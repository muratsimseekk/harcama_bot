import os
import json
from datetime import datetime
from groq import Groq

GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
client = Groq(api_key=GROQ_API_KEY)


async def ses_to_metin(dosya_yolu: str) -> str:
    """OGG ses dosyasını Türkçe metne çevirir (Groq Whisper)"""
    try:
        with open(dosya_yolu, "rb") as dosya:
            transkripsiyon = client.audio.transcriptions.create(
                file=(os.path.basename(dosya_yolu), dosya.read()),
                model="whisper-large-v3",
                language="tr",
                response_format="text"
            )
        return str(transkripsiyon).strip()
    except Exception as e:
        print(f"Ses-metin hatası: {e}")
        return ""


async def metni_parse_et(metin: str) -> list[dict] | None:
    """
    Harcama/yatırım metnini parse eder.
    tip: 'kisisel', 'isletme' veya 'yatirim'
    """
    bugun = datetime.now().strftime("%d.%m.%Y")
    bugun_yil = datetime.now().year

    sistem_promptu = f"""Sen Rota Metal & Alüminyum şirketinin harcama takip asistanısın.
Bugünün tarihi: {bugun}

Kullanıcının mesajında bir veya birden fazla harcama/yatırım olabilir. Tümünü analiz et.
Mesaj virgülle ayrılmış, satır satır veya karma formatta olabilir.

MUTLAKA şu JSON array formatında yanıt ver (başka hiçbir şey yazma, sadece JSON):
[
  {{
    "aciklama": "kısa açıklama",
    "tutar": 123.45,
    "kategori": "kategori adı",
    "tip": "kisisel veya isletme veya yatirim",
    "tarih": "DD.MM.YYYY"
  }}
]

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

Eğer metin hiç kayıt içermiyorsa boş array döndür: []"""

    try:
        yanit = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": sistem_promptu},
                {"role": "user", "content": metin}
            ],
            temperature=0.1,
            max_tokens=2000
        )

        yanit_metni = yanit.choices[0].message.content.strip()

        if "```" in yanit_metni:
            parcalar = yanit_metni.split("```")
            for parca in parcalar:
                if parca.startswith("json"):
                    yanit_metni = parca[4:].strip()
                    break
                elif parca.strip().startswith("["):
                    yanit_metni = parca.strip()
                    break

        yanit_metni = yanit_metni.strip()

        if yanit_metni.startswith("["):
            liste = json.loads(yanit_metni)
            if isinstance(liste, list) and len(liste) > 0:
                for h in liste:
                    if not h.get("tarih"):
                        h["tarih"] = datetime.now().strftime("%d.%m.%Y")
                return liste
            return None

        if yanit_metni.startswith("{"):
            veri = json.loads(yanit_metni)
            if veri and "tutar" in veri:
                if not veri.get("tarih"):
                    veri["tarih"] = datetime.now().strftime("%d.%m.%Y")
                return [veri]

        return None

    except Exception as e:
        print(f"Parse hatası: {e}")
        return None
