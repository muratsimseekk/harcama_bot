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
    Harcama metnini parse eder.
    Tek veya çoklu harcama döndürür: [{aciklama, tutar, kategori, tip, tarih}, ...]
    tarih formatı: DD.MM.YYYY — belirtilmemişse bugünün tarihi kullanılır.
    """
    bugun = datetime.now().strftime("%d.%m.%Y")
    bugun_yil = datetime.now().year

    sistem_promptu = f"""Sen Rota Metal & Alüminyum şirketinin harcama takip asistanısın.
Bugünün tarihi: {bugun}

Kullanıcının mesajında bir veya birden fazla harcama olabilir. Tümünü analiz et.

MUTLAKA şu JSON array formatında yanıt ver (başka hiçbir şey yazma, sadece JSON):
[
  {{
    "aciklama": "harcamanın kısa açıklaması",
    "tutar": 123.45,
    "kategori": "kategori adı",
    "tip": "kisisel veya isletme",
    "tarih": "DD.MM.YYYY"
  }}
]

TARİH KURALLARI:
- Kullanıcı tarih belirttiyse (örn: "2 Mayıs", "3 Nisan", "dün", "5 mayıs 2026") → o tarihi kullan
- "dün" → dünün tarihini hesapla
- "geçen hafta" → 7 gün öncesini kullan  
- Sadece gün belirtildiyse (örn: "2'sinde", "15'inde") → bu ayın o günü
- Ay belirtilmiş yıl belirtilmemişse → {bugun_yil} yılını kullan
- Tarih belirtilmemişse → bugünün tarihi: {bugun}
- Tarih her zaman DD.MM.YYYY formatında olsun (örn: 02.05.2026)

KATEGORİ VE TİP KURALLARI:
- KİŞİSEL kategoriler: Market, Sigara/İçecek, Kafe/Restoran, Ulaşım, Sağlık, Giyim, Eğlence, Fatura, Diğer
- İŞLETME kategoriler: Hammadde, Nakliye, Personel, Yakıt/Araç, Elektrik/Su, Kira, Makine/Ekipman, Galvaniz, Diğer İşletme
- İşletme kelimeleri: ankraj, galvaniz, üretim, nakliye, müşteri, malzeme, personel, fabrika, demir, alüminyum, hammadde, çelik, tel, vida, somun, rota metal, işçi, sevkiyat, taşıma, makine, ekipman

TUTAR KURALLARI:
- Tutar her zaman sayı olmalı (örn: 110.00)
- Yazıyla yazılmış sayıları rakama çevir (örn: "iki yüz elli" → 250.00)

Eğer metin hiç harcama içermiyorsa boş array döndür: []"""

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

        # ```json ... ``` temizle
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
                # Her harcamada tarih yoksa bugünü ekle
                for h in liste:
                    if not h.get("tarih"):
                        h["tarih"] = datetime.now().strftime("%d.%m.%Y")
                return liste
            return None

        # Geriye dönük uyumluluk: tekli dict geldiyse listeye çevir
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
