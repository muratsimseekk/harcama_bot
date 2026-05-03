import os
import json
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


async def metni_parse_et(metin: str) -> dict | None:
    """
    Harcama metnini parse eder.
    Döndürür: {aciklama, tutar, kategori, tip}
    tip: 'kisisel' veya 'isletme'
    """
    sistem_promptu = """Sen Rota Metal & Alüminyum şirketinin harcama takip asistanısın.
Kullanıcının söylediği harcamayı analiz et.

Şu JSON formatında yanıt ver (başka hiçbir şey yazma, sadece JSON):
{
  "aciklama": "harcamanın kısa açıklaması",
  "tutar": 123.45,
  "kategori": "kategori adı",
  "tip": "kisisel veya isletme"
}

Kategori ve tip kuralları:
- KİŞİSEL kategoriler: Market, Sigara/İçecek, Kafe/Restoran, Ulaşım, Sağlık, Giyim, Eğlence, Fatura, Diğer
- İŞLETME kategorileri: Hammadde, Nakliye, Personel, Yakıt/Araç, Elektrik/Su, Kira, Makine/Ekipman, Galvaniz, Diğer İşletme

İşletme ile ilgili anahtar kelimeler:
ankraj, galvaniz, üretim, nakliye, müşteri, malzeme, personel, fabrika, demir, alüminyum,
hammadde, çelik, tel, vida, somun, rota metal, işçi, sevkiyat, taşıma, makine, ekipman

Tutar her zaman sayı olmalı (nokta ile ondalık, örn: 110.00).
Yazıyla yazılmış sayıları rakama çevir (örn: "iki yüz elli" → 250.00).
Eğer metin bir harcama değilse veya tutar anlaşılamıyorsa null döndür."""

    try:
        yanit = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": sistem_promptu},
                {"role": "user", "content": metin}
            ],
            temperature=0.1,
            max_tokens=200
        )

        yanit_metni = yanit.choices[0].message.content.strip()

        # Bazen model ```json ... ``` ile sarar, temizle
        if "```" in yanit_metni:
            yanit_metni = yanit_metni.split("```")[1]
            if yanit_metni.startswith("json"):
                yanit_metni = yanit_metni[4:]
            yanit_metni = yanit_metni.strip()

        if yanit_metni.startswith("{"):
            veri = json.loads(yanit_metni)
            if veri and "tutar" in veri and veri["tutar"] is not None:
                return veri

        return None

    except Exception as e:
        print(f"Parse hatası: {e}")
        return None
