"""Toplu seslendirme: her ton grubunu TEK istekte okutur, Whisper kelime zamanlarıyla cümlelere böler.

Neden: Gemini ücretsiz kotası model başına ~10 istek/gün; 16 cümle yerine 2 istek yeter. Ayrıca metin tek
seferde okunduğu için tonlama cümleler arasında daha doğal akar.

Çalıştır:  python tanitim-video/ses/toplu.py [--ses Kore] [--model gemini-3.1-flash-tts-preview]
Çıktı:     ses/parcalar/SS_K.wav (seslendirme.py ile aynı adlar) → sonra zamanla.py ve karistir.py
"""
from __future__ import annotations

import difflib
import hashlib
import json
import os
import sys
from pathlib import Path

import numpy as np
from scipy.io import wavfile

BURASI = Path(__file__).resolve().parent
sys.path.insert(0, str(BURASI))
import seslendirme as S  # noqa: E402
from zamanla import sade, whisper  # noqa: E402

ARA_NOTU = (
    "\nPacing: leave a clear pause of about one second between the lines below (each line is a separate shot "
    "in the video). Inside a line keep a natural, fluent flow.\n"
)
GRUPLAR = [  # (ton, [(sahne, k)])
    ("kanca", [(0, k) for k in range(len(S.METIN[0]))]),
    ("genel", [(s, 0) for s in range(1, len(S.METIN))]),
]


def bol(ses_yolu: Path, satirlar: list[str]) -> list[tuple[float, float]]:
    """Toplu kaydı satırlara böler → her satır için (başlangıç, bitiş) sn."""
    oran, pcm = wavfile.read(str(ses_yolu))
    x = pcm.astype(np.float32) / 32768
    kel = whisper(ses_yolu).get("words", [])
    if not kel:
        sys.exit("Whisper kelime zamanı vermedi (GROQ_API_KEY?) — toplu kayıt bölünemiyor.")
    # karakter düzeyinde hizalama: bizim metin ↔ Whisper metni (rakam/okunuş farklarına dayanıklı)
    bizim, sinirlar = "", []
    for st in satirlar:
        bizim += sade(st.replace("pi-di-ef", "pidief"))
        sinirlar.append(len(bizim))
    onlar, kar_kelime = "", []
    for i, w in enumerate(kel):
        t = sade(w["word"])
        onlar += t
        kar_kelime += [i] * len(t)
    bloklar = difflib.SequenceMatcher(None, bizim, onlar, autojunk=False).get_matching_blocks()

    def esle(i: int) -> int:
        """bizim metindeki i. karakterin Whisper metnindeki karşılığı (bloklar arası doğrusal)."""
        onceki = (0, 0)
        for a, b, n in bloklar:
            if a <= i < a + n:
                return b + (i - a)
            if a > i:
                pa, pb = onceki
                return pb + round((i - pa) * (b - pb) / max(1, a - pa))
            onceki = (a + n, b + n)
        return len(onlar) - 1

    pencere = int(0.01 * oran)
    n = len(x) // pencere
    enerji = np.sqrt(np.mean(x[: n * pencere].reshape(n, pencere) ** 2, axis=1) + 1e-12)
    kesimler = [0.0]
    for son in sinirlar[:-1]:
        w = kar_kelime[min(len(kar_kelime) - 1, esle(son - 1))]
        a, b = kel[w]["end"], kel[min(w + 1, len(kel) - 1)]["start"]
        if b <= a:
            b = a + 0.25
        # aradaki en sessiz noktadan kes
        ia, ib = int(a * 100), max(int(a * 100) + 1, int(b * 100))
        dilim = enerji[ia:ib]
        kesimler.append((ia + int(np.argmin(dilim))) / 100 if len(dilim) else (a + b) / 2)
    kesimler.append(len(x) / oran)
    return list(zip(kesimler[:-1], kesimler[1:], strict=True))


if __name__ == "__main__":
    arg = sys.argv
    ses = arg[arg.index("--ses") + 1] if "--ses" in arg else "Kore"
    if "--model" in arg:
        os.environ["GEMINI_TTS_MODEL"] = arg[arg.index("--model") + 1]
    S.PARCALAR.mkdir(exist_ok=True)
    onbellek_yolu = S.PARCALAR / "onbellek.json"
    onbellek = json.loads(onbellek_yolu.read_text(encoding="utf-8")) if onbellek_yolu.exists() else {}
    for grup, uyeler in GRUPLAR:
        satirlar = [S.METIN[s][k] for s, k in uyeler]
        ton = (S.TON_KANCA if grup == "kanca" else S.TON_GENEL).replace("#### TRANSCRIPT", ARA_NOTU + "#### TRANSCRIPT")
        metin = "\n\n".join(satirlar)
        imza = hashlib.sha1(f"toplu|{os.environ.get('GEMINI_TTS_MODEL', '')}|{ses}|{ton}|{metin}".encode()).hexdigest()
        toplu_yol = S.PARCALAR / f"_toplu_{grup}.wav"
        if onbellek.get(toplu_yol.name) != imza or not toplu_yol.exists():
            print(f"  {grup}: {len(satirlar)} satır tek istekte okutuluyor…", flush=True)
            S.gemini_oku(metin, ses, ton, toplu_yol)
            onbellek[toplu_yol.name] = imza
            onbellek_yolu.write_text(json.dumps(onbellek, indent=1), encoding="utf-8")
        oran, pcm = wavfile.read(str(toplu_yol))
        for (s, k), (a, b), st in zip(uyeler, bol(toplu_yol, satirlar), satirlar, strict=True):
            ad = f"{s:02d}_{k}.wav"
            wavfile.write(str(S.PARCALAR / ad), oran, pcm[int(a * oran) : int(b * oran)])
            onbellek[ad] = f"toplu:{imza}"
            print(f"    {ad}  {a:6.2f}–{b:6.2f} sn  {st}", flush=True)
        onbellek_yolu.write_text(json.dumps(onbellek, indent=1), encoding="utf-8")
    print("tamam → şimdi: python tanitim-video/ses/zamanla.py")
