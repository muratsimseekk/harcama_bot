"""Seslendirme: her sahnenin cümlesini ayrı ses dosyası olarak üretir (Microsoft Edge nöral TTS, edge-tts).

Çalıştır:  python tanitim-video/ses/seslendirme.py [--ses tr-TR-EmelNeural|tr-TR-AhmetNeural]
Çıktı:     tanitim-video/ses/parcalar/NN.mp3  (+ sureler yazdırılır)
Not: Metin Microsoft'un çevrimiçi TTS servisine gider (yalnız bu reklam metni).
"""
from __future__ import annotations

import asyncio
import subprocess
import sys
from pathlib import Path

import edge_tts
import imageio_ffmpeg

KLASOR = Path(__file__).resolve().parent / "parcalar"

# (sahne başlangıcı sn, metin, hız) — sahne başları src/Tanitim.tsx SAHNELER'den (kare/30, geçişler düşülmüş)
SATIRLAR: list[tuple[float, str, str]] = [
    (0.00, "Maaş yattı… ve yine bitti? Peki, nereye gitti?", "+6%"),
    (2.47, "Tanış: Paraİzi.", "+0%"),
    (4.33, "Harcamanı söylemen yeter: “Market sekiz yüz elli, dün benzin bin iki yüz.” Gerisini o halleder.", "+10%"),
    (9.30, "Kategoriyi yapay zekâ bulur; sen sadece onayla.", "+4%"),
    (13.43, "Gelir, gider, kalan… hepsi tek yerde.", "+4%"),
    (17.07, "Paranın nereye gittiğini tek bakışta gör.", "+4%"),
    (20.53, "Limit koy; sınıra yaklaşınca haber versin.", "+4%"),
    (24.17, "Her yatırımına bir hedef koy, ilerlemeni izle.", "+4%"),
    (27.97, "Kira, fatura, maaş… her ay kendiliğinden eklensin.", "+4%"),
    (31.60, "Excel ya da PDF dökümün tek dokunuşla hazır.", "+4%"),
    (34.90, "Haneni kur, evin bütçesini birlikte yönet.", "+4%"),
    (38.53, "Bankana bağlanmaz. Verin sende kalır.", "+0%"),
    (41.50, "Paraİzi. Söyle, kaydet, gör. Google Play'de ücretsiz.", "+0%"),
]


def sure(yol: Path) -> float:
    r = subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), "-i", str(yol)], capture_output=True, text=True)
    s = next(x for x in r.stderr.splitlines() if "Duration" in x).split("Duration:")[1].split(",")[0].strip()
    h, m, sn = s.split(":")
    return int(h) * 3600 + int(m) * 60 + float(sn)


async def uret(ses: str) -> None:
    KLASOR.mkdir(exist_ok=True)
    for i, (_, metin, hiz) in enumerate(SATIRLAR):
        await edge_tts.Communicate(metin, ses, rate=hiz).save(str(KLASOR / f"{i:02d}.mp3"))


if __name__ == "__main__":
    ses = sys.argv[sys.argv.index("--ses") + 1] if "--ses" in sys.argv else "tr-TR-EmelNeural"
    asyncio.run(uret(ses))
    for i, (bas, metin, _) in enumerate(SATIRLAR):
        pencere = (SATIRLAR[i + 1][0] if i + 1 < len(SATIRLAR) else 46.5) - bas
        print(f"{i:02d}  {sure(KLASOR / f'{i:02d}.mp3'):5.2f} sn / pencere {pencere:4.2f}  {metin}")
