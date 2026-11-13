"""Seslendirme: sahne cümlelerini ayrı ses dosyaları olarak üretir.

Sağlayıcı:
  gemini (varsayılan) — Google Gemini TTS, doğal "seslendirmen" tonu. .env'de GEMINI_API_KEY gerekir.
  edge               — Microsoft Edge nöral TTS (anahtarsız, daha yapay; yedek).

Çalıştır:  python tanitim-video/ses/seslendirme.py [--saglayici gemini|edge] [--ses Sulafat] [--ornek]
  --ornek: yalnız birkaç kadın sesiyle aynı cümleyi okutur → ses/ornekler/*.wav (ses seçmek için)
Çıktı:     tanitim-video/ses/parcalar/SS_K.wav  (SS = sahne no, K = sahnedeki cümle no)
Önbellek:  metin + ses + sağlayıcı aynıysa yeniden üretmez (parcalar/onbellek.json).
Sonraki adım: python tanitim-video/ses/zamanla.py  (Whisper ile doğrular, sahne sürelerini yazar)

Not: Metinler (yalnız bu reklam metni) seçilen sağlayıcının çevrimiçi servisine gider.
"""
from __future__ import annotations

import asyncio
import base64
import hashlib
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

import numpy as np
from scipy.io import wavfile

BURASI = Path(__file__).resolve().parent
KOK = BURASI.parent.parent  # repo kökü
PARCALAR = BURASI / "parcalar"

# Sahne sırası src/Tanitim.tsx SIRA ile aynı. Okunuş için yazım: "PDF" → "pi-di-ef" (İngilizce okunsun).
METIN: list[list[str]] = [
    [  # 0 Kanca
        "Param nereye gidiyor?",
        "Ay sonunu yine getiremedim…",
        "Ne harcadım da bu para bitti?",
        "Bunları sen de diyorsan…",
    ],
    ["O zaman tanış: Para İzi. Harcamalarını takip etmenin en kolay yolu."],  # 1 Marka
    ["Harcamanı söylemen yeter: “Market sekiz yüz elli, dün benzin bin iki yüz.” Gerisini o halleder."],  # 2 Ses
    ["Kategoriyi yapay zekâ bulur; sen sadece onayla."],  # 3 Yapay zeka
    ["Gelir, gider, kalan… hepsi tek yerde."],  # 4 Gelir/gider
    ["Paranın nereye gittiğini tek bakışta gör."],  # 5 Kategoriler
    ["Limit koy; sınıra yaklaşınca haber versin."],  # 6 Limit
    ["Her yatırımına bir hedef koy, ilerlemeni izle."],  # 7 Hedef
    ["Kira, fatura, maaş… her ay kendiliğinden eklensin."],  # 8 Sabit
    ["Excel ya da pi-di-ef dökümün, tek dokunuşla hazır."],  # 9 Dışa aktar
    ["Haneni kur, evin bütçesini birlikte yönet."],  # 10 Hane
    ["Bankana bağlanmaz. Verin sende kalır."],  # 11 Güven
    ["Para İzi. Söyle, kaydet, gör. Google Play'de ücretsiz."],  # 12 Kapanış
]

# Gemini TTS "yönetmen notu" biçimi: model yalnız TRANSCRIPT bölümünü okur.
_ORTAK = """# AUDIO PROFILE: Native Turkish female voice-over artist, late twenties, warm and natural.
## THE SCENE: A professional studio recording for a modern smartphone app commercial (Instagram / WhatsApp story).
### DIRECTOR'S NOTES
{stil}
Pronunciation: "pi-di-ef" is the English letters P-D-F. "Google Play" in English. "Para İzi" is the brand name, said as two clear words.
Language: Turkish, Istanbul accent.
#### TRANSCRIPT
"""
TON_KANCA = _ORTAK.format(
    stil="Style: a relatable inner thought — a little tired and frustrated, with a soft sigh; very natural and "
    "conversational, like a real person talking to herself at the end of the month. Not an announcer."
)
TON_GENEL = _ORTAK.format(
    stil="Style: warm, friendly and confident with a subtle smile; fluent, natural rhythm and intonation, like a "
    "real voice-over artist talking to a friend. Never robotic, never over-the-top."
)

ORNEK_SESLER = ["Sulafat", "Aoede", "Kore", "Achernar", "Despina"]
ORNEK_METIN = "Param nereye gidiyor? O zaman tanış: Para İzi. Harcamalarını takip etmenin en kolay yolu."


def env(ad: str) -> str:
    if os.environ.get(ad):
        return os.environ[ad]
    for satir in (KOK / ".env").read_text(encoding="utf-8").splitlines():
        if satir.strip().startswith(f"{ad}="):
            return satir.split("=", 1)[1].strip().strip('"').strip("'")
    return ""


# ------------------------------------------------------------------ Gemini
_MODEL: str | None = None


def gemini_model(anahtar: str) -> str:
    global _MODEL
    if _MODEL:
        return _MODEL
    if os.environ.get("GEMINI_TTS_MODEL"):
        _MODEL = os.environ["GEMINI_TTS_MODEL"]
        return _MODEL
    istek = urllib.request.Request("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200",
                                   headers={"x-goog-api-key": anahtar})
    with urllib.request.urlopen(istek, timeout=30) as r:
        adlar = [m["name"].split("/", 1)[1] for m in json.load(r)["models"] if "tts" in m["name"]]
    if not adlar:
        sys.exit("Gemini hesabında TTS modeli bulunamadı.")

    # en yeni sürüm önce; "lite" ve önizleme sonra
    def surum(a: str) -> float:
        m = re.search(r"gemini-(\d+(?:\.\d+)?)", a)
        return float(m.group(1)) if m else 0.0

    adlar.sort(key=lambda a: ("lite" in a, "preview" in a, -surum(a), a))
    _MODEL = adlar[0]
    print(f"  Gemini TTS modeli: {_MODEL}  (diğerleri: {', '.join(adlar[1:]) or '-'})")
    return _MODEL


def gemini_oku(metin: str, ses: str, ton: str, hedef: Path, _deneme: int = 0) -> None:
    anahtar = env("GEMINI_API_KEY")
    if not anahtar:
        sys.exit("GEMINI_API_KEY yok: aistudio.google.com → Get API key → .env'ye GEMINI_API_KEY=... ekle.")
    model = gemini_model(anahtar)
    govde = {
        "contents": [{"parts": [{"text": f"{ton}{metin}"}]}],
        "generationConfig": {
            "responseModalities": ["AUDIO"],
            "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": ses}}},
        },
    }
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    for deneme in range(8):
        istek = urllib.request.Request(url, data=json.dumps(govde).encode(),
                                       headers={"Content-Type": "application/json", "x-goog-api-key": anahtar})
        try:
            with urllib.request.urlopen(istek, timeout=120) as r:
                yanit = json.load(r)
            break
        except urllib.error.HTTPError as e:
            ayrinti = e.read().decode(errors="replace")
            if "PerDay" in ayrinti:
                sys.exit("Gemini günlük ücretsiz kota doldu (model başına ~10 istek/gün). Üretilenler önbellekte; "
                         "kota yenilenince (Türkiye saatiyle ~10:00-11:00) ya da AI Studio'da faturalandırma "
                         "açılınca aynı komutu tekrar çalıştır, kaldığı yerden devam eder.")
            if e.code in (429, 500, 503) and deneme < 7:
                bekle = 20 * (deneme + 1)
                print(f"    {e.code} — {bekle} sn bekleyip yeniden denenecek")
                time.sleep(bekle)
                continue
            sys.exit(f"Gemini hatası {e.code}: {ayrinti[:500]}")
    parca = yanit["candidates"][0]["content"]["parts"][0]["inlineData"]
    oran = 24000
    if "rate=" in parca.get("mimeType", ""):
        oran = int(parca["mimeType"].split("rate=")[1].split(";")[0])
    pcm = np.frombuffer(base64.b64decode(parca["data"]), dtype="<i2")
    # Talimat metnini de okuduysa ses beklenenden çok uzun olur → yeniden üret
    beklenen = 0.5 + 0.5 * len(metin.split())
    if len(pcm) / oran > 2.2 * beklenen + 2:
        if _deneme < 4:
            print(f"    ses çok uzun ({len(pcm) / oran:.1f} sn, beklenen ~{beklenen:.1f}) — yeniden üretiliyor")
            return gemini_oku(metin, ses, ton, hedef, _deneme + 1)
        sys.exit(f"Gemini cümleyi düzgün okumadı: {metin}")
    wavfile.write(str(hedef), oran, pcm)


# ------------------------------------------------------------------ Edge (yedek)
def edge_oku(metin: str, ses: str, hedef: Path) -> None:
    import edge_tts  # noqa: PLC0415

    gecici = hedef.with_suffix(".mp3")
    asyncio.run(edge_tts.Communicate(metin, ses).save(str(gecici)))
    from ortak import SR, oku  # noqa: PLC0415

    wavfile.write(str(hedef), SR, (oku(gecici) * 32767).astype("<i2"))
    gecici.unlink()


def uret(saglayici: str, ses: str) -> None:
    PARCALAR.mkdir(exist_ok=True)
    onbellek_yolu = PARCALAR / "onbellek.json"
    onbellek = json.loads(onbellek_yolu.read_text(encoding="utf-8")) if onbellek_yolu.exists() else {}
    gecerli = set()
    for s, satirlar in enumerate(METIN):
        for k, metin in enumerate(satirlar):
            ad = f"{s:02d}_{k}.wav"
            gecerli.add(ad)
            ton = TON_KANCA if s == 0 else TON_GENEL
            imza = hashlib.sha1(f"{saglayici}|{ses}|{ton}|{metin}".encode()).hexdigest()
            if onbellek.get(ad) == imza and (PARCALAR / ad).exists():
                continue
            print(f"  {ad}: {metin}")
            if saglayici == "gemini":
                gemini_oku(metin, ses, ton, PARCALAR / ad)
            else:
                edge_oku(metin, ses, PARCALAR / ad)
            onbellek[ad] = imza
            onbellek_yolu.write_text(json.dumps(onbellek, indent=1), encoding="utf-8")
    for eski in PARCALAR.glob("*"):
        if eski.name != "onbellek.json" and eski.name not in gecerli and not eski.name.endswith(".json"):
            eski.unlink()


def ornekler() -> None:
    klasor = BURASI / "ornekler"
    klasor.mkdir(exist_ok=True)
    for ses in ORNEK_SESLER:
        print(f"  örnek: {ses}")
        gemini_oku(ORNEK_METIN, ses, TON_GENEL, klasor / f"{ses}.wav")


if __name__ == "__main__":
    arg = sys.argv
    saglayici = arg[arg.index("--saglayici") + 1] if "--saglayici" in arg else "gemini"
    ses = arg[arg.index("--ses") + 1] if "--ses" in arg else ("Kore" if saglayici == "gemini" else "tr-TR-EmelNeural")
    if "--ornek" in arg:
        ornekler()
    else:
        uret(saglayici, ses)
        print("tamam → şimdi: python tanitim-video/ses/zamanla.py")
