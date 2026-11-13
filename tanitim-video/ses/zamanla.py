"""Seslendirmeyi Whisper (Groq) ile yazıya döker, okunuşu doğrular ve kurguyu sese göre hesaplar → src/zaman.json

- Her cümlenin gerçek süresi (baş/son sessizlik kırpılmış) ölçülür.
- Sahne süreleri: cümleler sığacak ve bir sonraki sahnenin sesiyle çakışmayacak şekilde uzatılır.
- Kelime zamanlarından sahne içi işaretler çıkarılır (yazıların sesle aynı anda belirmesi için).
- Transkript yazdırılır: "pi-di-ef" gibi okunuşları kulakla değil metinle de kontrol et.

Çalıştır:  python tanitim-video/ses/zamanla.py     (GROQ_API_KEY .env'de; yoksa kelime işaretleri tahminle konur)
"""
from __future__ import annotations

import hashlib
import json
import math
import re
import urllib.request
import uuid
from pathlib import Path

from ortak import SR, kirp_ofsetli, oku
from seslendirme import METIN, PARCALAR, env

KOK = Path(__file__).resolve().parent.parent
FPS, GECIS = 30, 16

# Sahne başına en kısa süre (kare) — animasyonların bitmesi için
EN_AZ = [150, 80, 170, 120, 115, 105, 110, 115, 115, 100, 110, 100, 185]
ILK_GECIKME = [0.25] + [0.35] * (len(METIN) - 1)  # sahne başından ilk cümleye
ARA = {0: 0.42}  # sahne içi cümleler arası (kanca: dramatik duraklama); varsayılan 0.3
SONRAKINE_PAY = 0.25  # bir cümlenin bitişi ile sonraki sahnenin cümlesi arası en az boşluk
SON_KUYRUK = 1.4      # son cümleden sonra video kaç sn sürsün


def whisper(yol: Path) -> dict:
    """Groq Whisper, kelime zamanlı. Sonuç dosya özetine göre önbelleklenir."""
    veri = yol.read_bytes()
    onbellek = yol.with_suffix(".whisper.json")
    imza = hashlib.sha1(veri).hexdigest()
    if onbellek.exists():
        k = json.loads(onbellek.read_text(encoding="utf-8"))
        if k.get("imza") == imza:
            return k["sonuc"]
    anahtar = env("GROQ_API_KEY")
    if not anahtar:
        return {}
    sinir = uuid.uuid4().hex
    alanlar = {
        "model": "whisper-large-v3",
        "language": "tr",
        "response_format": "verbose_json",
        "timestamp_granularities[]": "word",
    }
    govde = b""
    for ad, deger in alanlar.items():
        govde += f'--{sinir}\r\nContent-Disposition: form-data; name="{ad}"\r\n\r\n{deger}\r\n'.encode()
    govde += (
        f'--{sinir}\r\nContent-Disposition: form-data; name="file"; filename="{yol.name}"\r\n'
        "Content-Type: audio/wav\r\n\r\n"
    ).encode() + veri + f"\r\n--{sinir}--\r\n".encode()
    istek = urllib.request.Request(
        "https://api.groq.com/openai/v1/audio/transcriptions",
        data=govde,
        headers={"Authorization": f"Bearer {anahtar}", "Content-Type": f"multipart/form-data; boundary={sinir}",
                 "User-Agent": "tanitim-video/1.0"},
    )
    with urllib.request.urlopen(istek, timeout=120) as r:
        sonuc = json.load(r)
    onbellek.write_text(json.dumps({"imza": imza, "sonuc": sonuc}, ensure_ascii=False, indent=1), encoding="utf-8")
    return sonuc


def sade(s: str) -> str:
    return re.sub(r"[^a-zçğıöşü0-9]", "", s.lower().replace("İ", "i").replace("I", "ı"))


def kelime_ani(kelimeler: list[dict], aranan: str, son: bool = False, sira: int = 0) -> float | None:
    """Kelimenin (kırpılmış klipteki) başlangıç ya da bitiş anı; bulunamazsa None."""
    bulunan = [w for w in kelimeler if sade(aranan) in sade(w["word"])]
    if len(bulunan) <= sira:
        return None
    w = bulunan[sira] if sira >= 0 else bulunan[sira]
    return float(w["end"] if son else w["start"])


if __name__ == "__main__":
    klipler = []  # (sahne, k, dosya, süre, kelimeler)
    print("Transkript (okunuşu kontrol et):")
    for s, satirlar in enumerate(METIN):
        for k, metin in enumerate(satirlar):
            yol = PARCALAR / f"{s:02d}_{k}.wav"
            kirpik, bas_ofset = kirp_ofsetli(oku(yol))
            w = whisper(yol)
            kelimeler = [{"word": x["word"], "start": x["start"] - bas_ofset, "end": x["end"] - bas_ofset}
                         for x in w.get("words", [])]
            print(f"  {s:02d}_{k}  {len(kirpik) / SR:4.2f} sn  {w.get('text', '(Whisper yok)').strip()}")
            klipler.append((s, k, yol.name, len(kirpik) / SR, kelimeler))

    # ---- sahne içi yerleşim ve süreler
    sesler, isaret, sureler = [], {}, []
    for s in range(len(METIN)):
        bu = [c for c in klipler if c[0] == s]
        t = ILK_GECIKME[s]
        for i, (_, _k, dosya, sure, kel) in enumerate(bu):
            if i:
                t += ARA.get(s, 0.3)
            sesler.append({"sahne": s, "dosya": dosya, "bas": round(t, 3), "kelimeler": kel})
            t += sure
        ses_bitis = t
        sonraki_gecikme = ILK_GECIKME[s + 1] if s + 1 < len(METIN) else 0
        if s + 1 < len(METIN):
            gerek = ses_bitis + SONRAKINE_PAY + GECIS / FPS - sonraki_gecikme
        else:
            gerek = ses_bitis + SON_KUYRUK
        sureler.append(max(EN_AZ[s], math.ceil(gerek * FPS)))

    def kare(sn: float) -> int:
        return round(sn * FPS)

    def ses_of(s: int, k: int = 0) -> dict:
        return next(x for x in sesler if x["sahne"] == s and x["dosya"] == f"{s:02d}_{k}.wav")

    # Kanca: her cümlenin başladığı kare
    isaret["kanca"] = [kare(ses_of(0, k)["bas"]) for k in range(len(METIN[0]))]
    # Ses sahnesi: "Market" başı, alıntının sonu ("Gerisini"den önceki kelimenin sonu), "Gerisini" başı
    ss = ses_of(2)
    kel = ss["kelimeler"]
    market = kelime_ani(kel, "market")
    gerisini = kelime_ani(kel, "gerisini")
    alinti_son = None
    if gerisini is not None:
        onceki = [w for w in kel if w["end"] <= gerisini + 0.01]
        alinti_son = onceki[-1]["end"] if onceki else None
    tum = sum(c[3] for c in klipler if c[0] == 2)
    isaret["ses_yazi_bas"] = kare(ss["bas"] + (market if market is not None else 0.24 * tum))
    isaret["ses_yazi_son"] = kare(ss["bas"] + (alinti_son if alinti_son is not None else 0.66 * tum))
    isaret["ses_kart"] = max(kare(ss["bas"] + (gerisini if gerisini is not None else 0.8 * tum)) - 6,
                             isaret["ses_yazi_son"] + 6)
    # Limit: "haber"
    ls = ses_of(6)
    haber = kelime_ani(ls["kelimeler"], "haber")
    isaret["limit_bildirim"] = kare(ls["bas"] + (haber if haber is not None else 1.6)) - 4
    # Kapanış: "Söyle", "Google"
    ks = ses_of(12)
    soyle = kelime_ani(ks["kelimeler"], "söyle")
    google = kelime_ani(ks["kelimeler"], "google")
    isaret["kapanis_soyle"] = kare(ks["bas"] + (soyle if soyle is not None else 1.4)) - 3
    isaret["kapanis_cta"] = kare(ks["bas"] + (google if google is not None else 3.6)) - 5
    # Marka: "Paraİzi" kelimesi
    ms = ses_of(1)
    pi = kelime_ani(ms["kelimeler"], "para")
    isaret["marka_ad"] = kare(ms["bas"] + (pi if pi is not None else 0.9)) - 4

    cikti = {
        "fps": FPS,
        "gecis": GECIS,
        "sureler": sureler,
        "isaret": isaret,
        "sesler": [{k: v for k, v in x.items() if k != "kelimeler"} for x in sesler],
    }
    (KOK / "src/zaman.json").write_text(json.dumps(cikti, ensure_ascii=False, indent=1), encoding="utf-8")
    toplam = (sum(sureler) - GECIS * (len(sureler) - 1)) / FPS
    print(f"\nsüreler (kare): {sureler}\nişaretler: {isaret}\ntoplam: {toplam:.2f} sn → src/zaman.json")
