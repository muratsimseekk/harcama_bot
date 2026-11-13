"""Tanıtım videosunun ses bandı: özgün müzik (sentez) + seslendirme + efektler → public/ses.wav

Müzik tamamen burada üretilir (örnek/telifli parça yok): 120 BPM, F–C–G–Am, kick/clap/hat, bas, pluck arpej, pad.
Zamanlama src/zaman.json'dan (Remotion ile aynı; zamanla.py yazar) okunur; seslendirme ses/parcalar/*.wav.

Çalıştır:  python tanitim-video/ses/seslendirme.py && python tanitim-video/ses/zamanla.py && python tanitim-video/ses/karistir.py
Çıktı:     public/ses.wav (karışım, -14 LUFS), ses/muzik.wav (yalnız müzik)
"""
from __future__ import annotations

import json
import subprocess
from pathlib import Path

import numpy as np
from ortak import FFMPEG, SR, kirp, oku, yaz
from scipy.signal import butter, fftconvolve, sosfilt

KOK = Path(__file__).resolve().parent.parent
ZAMAN = json.loads((KOK / "src/zaman.json").read_text(encoding="utf-8"))
FPS, GECIS, SURELER = ZAMAN["fps"], ZAMAN["gecis"], ZAMAN["sureler"]

BASLAR = [sum(d - GECIS for d in SURELER[:i]) / FPS for i in range(len(SURELER))]
TOPLAM = (sum(SURELER) - GECIS * (len(SURELER) - 1)) / FPS
N = int(TOPLAM * SR)
rng = np.random.default_rng(7)

# Sahne içi olay anları (kare, sahneye göre) — zamanla.py kelime zamanlarından hesaplar; sahneler.tsx de kullanır
ISARET = ZAMAN["isaret"]


# ------------------------------------------------------------------ temel araçlar
def t_dizi(sure: float) -> np.ndarray:
    return np.arange(int(sure * SR)) / SR


def filtre(x: np.ndarray, tur: str, f) -> np.ndarray:
    return sosfilt(butter(2, f, btype=tur, fs=SR, output="sos"), x, axis=0)


def ekle(hedef: np.ndarray, x: np.ndarray, zaman: float, kazanc: float = 1.0, pan: float = 0.0) -> None:
    """Mono ya da stereo sinyali hedefe (stereo) ekler; pan -1 sol … +1 sağ."""
    i = int(zaman * SR)
    if i >= len(hedef):
        return
    if x.ndim == 1:
        sol, sag = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        x = np.stack([x * sol * 1.414, x * sag * 1.414], axis=1)
    n = min(len(x), len(hedef) - i)
    hedef[i : i + n] += x[:n] * kazanc


def midi(n: float) -> float:
    return 440.0 * 2 ** ((n - 69) / 12)


def zarf(n: int, atak: float, birak: float, tepe_sure: float | None = None) -> np.ndarray:
    t = np.arange(n) / SR
    a = np.minimum(1, t / max(atak, 1e-4))
    if tepe_sure is None:
        return a * np.exp(-t / birak)
    return a * np.where(t < tepe_sure, 1.0, np.exp(-(t - tepe_sure) / birak))


# ------------------------------------------------------------------ enstrümanlar
def kick(kuvvet=1.0) -> np.ndarray:
    t = t_dizi(0.45)
    frek = 48 + 95 * np.exp(-t / 0.045)
    faz = 2 * np.pi * np.cumsum(frek) / SR
    x = np.sin(faz) * np.exp(-t / 0.16)
    x[: int(0.004 * SR)] += rng.normal(0, 0.35, int(0.004 * SR))  # tık
    return x * kuvvet


def clap() -> np.ndarray:
    t = t_dizi(0.3)
    g = rng.normal(0, 1, len(t))
    z = np.zeros_like(t)
    for d in (0.0, 0.011, 0.022):
        z += (t >= d) * np.exp(-np.maximum(0, t - d) / (0.012 if d < 0.02 else 0.09))
    return filtre(g * z, "band", [900, 3200]) * 0.9


def hat(acik=False) -> np.ndarray:
    t = t_dizi(0.25 if acik else 0.06)
    return filtre(rng.normal(0, 1, len(t)), "high", 7500) * np.exp(-t / (0.08 if acik else 0.018)) * 0.5


def testere(f: float, t: np.ndarray, harmonik=12) -> np.ndarray:
    return sum(np.sin(2 * np.pi * f * k * t) / k for k in range(1, harmonik + 1) if f * k < SR / 2.2)


def bas_nota(n: int, sure: float) -> np.ndarray:
    t = t_dizi(sure)
    x = testere(midi(n), t, 8) * 0.6 + np.sin(2 * np.pi * midi(n) * t) * 0.6
    return filtre(x, "low", 420) * zarf(len(t), 0.005, 0.18, sure * 0.55)


def pluck(n: int) -> np.ndarray:
    t = t_dizi(0.6)
    f = midi(n)
    x = np.sin(2 * np.pi * f * t) + 0.45 * np.sin(2 * np.pi * 2 * f * t) + 0.18 * np.sin(2 * np.pi * 3 * f * t)
    return x * zarf(len(t), 0.002, 0.13)


def pad(notalar: list[int], sure: float) -> np.ndarray:
    t = t_dizi(sure)
    sol = np.zeros_like(t)
    sag = np.zeros_like(t)
    for n in notalar:
        for d, hedef in ((-0.09, sol), (0.09, sag)):
            hedef += testere(midi(n + d), t, 6)
    x = np.stack([sol, sag], axis=1)
    x = filtre(x, "low", 1600) / (len(notalar) * 2)
    e = zarf(len(t), 0.35, 0.5, sure - 0.4)[:, None]
    return x * e


def zil(notalar: list[int], sure=1.6) -> np.ndarray:
    """Parlak 'ding' (bildirim / başarı)."""
    t = t_dizi(sure)
    x = sum(np.sin(2 * np.pi * midi(n) * t) + 0.3 * np.sin(2 * np.pi * midi(n) * 2.01 * t) for n in notalar)
    return x * zarf(len(t), 0.002, 0.35) / len(notalar)


def vuus(sure=0.45, yukari=True) -> np.ndarray:
    """Geçiş 'whoosh': süpürülen gürültü."""
    t = t_dizi(sure)
    g = rng.normal(0, 1, len(t))
    p = t / sure
    out = np.zeros_like(g)
    parca = 32
    for i in range(parca):
        a, b = i * len(t) // parca, (i + 1) * len(t) // parca
        q = (i + 0.5) / parca
        merkez = 400 * (12 ** (q if yukari else 1 - q))
        out[a:b] = filtre(g[a:b], "band", [merkez * 0.7, min(merkez * 1.4, SR / 2.2)])
    return out * np.sin(np.pi * p) ** 2 * 0.8


def tik_sesi(yuksek: bool) -> np.ndarray:
    t = t_dizi(0.05)
    f = 2400 if yuksek else 1900
    return (np.sin(2 * np.pi * f * t) * 0.6 + filtre(rng.normal(0, 1, len(t)), "high", 4000) * 0.4) * np.exp(-t / 0.008)


def balon_sesi() -> np.ndarray:
    """Mesaj 'pop'u: hızla yükselen kısa ton."""
    t = t_dizi(0.12)
    frek = 520 + 900 * (t / 0.12)
    return np.sin(2 * np.pi * np.cumsum(frek) / SR) * zarf(len(t), 0.003, 0.035)


def yukselen(sure: float) -> np.ndarray:
    t = t_dizi(sure)
    g = filtre(rng.normal(0, 1, len(t)), "band", [1500, 9000])
    return g * (t / sure) ** 2.5 * 0.5


def carpma() -> np.ndarray:
    t = t_dizi(2.2)
    gurultu = filtre(rng.normal(0, 1, len(t)), "high", 3000) * np.exp(-t / 0.5) * 0.35
    bum = np.sin(2 * np.pi * np.cumsum(38 + 60 * np.exp(-t / 0.08)) / SR) * np.exp(-t / 0.6)
    return gurultu + bum * 0.9


def reverb_ir(sure=1.6) -> np.ndarray:
    t = t_dizi(sure)
    ir = rng.normal(0, 1, (len(t), 2)) * np.exp(-t / 0.45)[:, None]
    ir = filtre(ir, "low", 6000)
    return ir / np.sqrt(np.sum(ir**2))


# ------------------------------------------------------------------ müzik
BPM = 120
VURUS = 60 / BPM
OLCU = 4 * VURUS
AKOR = [  # (bas, pad/arpej notaları)
    (41, [65, 69, 72]),  # F
    (36, [64, 67, 72]),  # C
    (43, [62, 67, 71]),  # G
    (45, [64, 69, 72]),  # Am
]


def muzik() -> np.ndarray:
    davul = np.zeros((N, 2))
    bas = np.zeros((N, 2))
    melodi = np.zeros((N, 2))
    zemin = np.zeros((N, 2))
    efekt = np.zeros((N, 2))

    giris = BASLAR[1]           # logo: grup başlar
    kapanis = BASLAR[-1]
    bitis = TOPLAM - 2.6        # son akor

    # Giriş (kanca): kısık, gergin pad + saat tiki (zaman/para akıp gidiyor) + logoya yükselen gürültü
    ekle(zemin, pad([57, 60, 64], giris + 0.3), 0.0, 0.45)
    ekle(zemin, pad([45, 52], giris + 0.3), 0.0, 0.35)
    tik = 0.0
    while tik < giris - 0.3:
        ekle(efekt, tik_sesi(yuksek=int(tik / 0.5) % 2 == 0), tik, 0.22)
        tik += 0.5
    yuk = min(2.6, giris - 0.2)
    ekle(efekt, yukselen(yuk), giris - yuk, 0.38)
    ekle(efekt, carpma(), giris, 0.55)

    olcu = 0
    t = giris
    kick_anlari: list[float] = []
    while t < bitis - 1e-6:
        kok, notalar = AKOR[olcu % 4]
        yogun = olcu >= 1  # ilk ölçü biraz sade
        for v in range(4):
            tv = t + v * VURUS
            if tv >= bitis:
                break
            ekle(davul, kick(1.0 if v in (0, 2) else 0.8), tv, 0.9)
            kick_anlari.append(tv)
            if v in (1, 3):
                ekle(davul, clap(), tv, 0.55)
            ekle(davul, hat(), tv, 0.25, pan=-0.3)
            ekle(davul, hat(acik=yogun), tv + VURUS / 2, 0.22 if yogun else 0.15, pan=0.3)
            # bas: vuruş arası (offbeat) sekizlikler
            ekle(bas, bas_nota(kok, VURUS / 2 * 0.9), tv + VURUS / 2, 0.55)
            if yogun and v == 3:
                ekle(bas, bas_nota(kok + 12, VURUS / 4), tv + VURUS * 0.75, 0.3)
            # pluck arpej: on altılıklar
            dizi = notalar + [notalar[0] + 12]
            desen = [0, 2, 1, 3] if v % 2 == 0 else [2, 1, 3, 2]
            for k, d in enumerate(desen):
                ekle(melodi, pluck(dizi[d]), tv + k * VURUS / 4, 0.16 if yogun else 0.1, pan=(-0.4 if k % 2 else 0.4))
        ekle(zemin, pad(notalar, OLCU + 0.4), t, 0.55)
        olcu += 1
        t += OLCU

    # Kapanış vurgusu ve son akor
    ekle(efekt, carpma(), kapanis, 0.5)
    son = bitis
    ekle(davul, kick(1.2), son, 1.0)
    ekle(efekt, carpma(), son, 0.6)
    ekle(zemin, pad([53, 60, 65, 69, 72], TOPLAM - son), son, 0.9)
    for k, n in enumerate([65, 69, 72, 77]):
        ekle(melodi, pluck(n), son + k * 0.06, 0.22)

    # Sidechain: kick'te bas ve pad'i bastır (pompalama)
    pompa = np.ones(N)
    tt = np.arange(int(0.3 * SR)) / SR
    egri = 1 - 0.55 * np.exp(-tt / 0.09)
    for k in kick_anlari:
        i = int(k * SR)
        n = min(len(egri), N - i)
        pompa[i : i + n] = np.minimum(pompa[i : i + n], egri[:n])
    bas *= pompa[:, None]
    zemin *= pompa[:, None]

    # Gecikme (ping-pong) + reverb: melodi ve clap'e
    gec = int(VURUS * 0.75 * SR)
    yanki = np.zeros_like(melodi)
    yanki[gec:, 1] += melodi[:-gec, 0] * 0.35
    yanki[gec:, 0] += melodi[:-gec, 1] * 0.35
    melodi = melodi + yanki
    ir = reverb_ir()
    gonder = melodi * 0.35 + zemin * 0.25 + davul * 0.08
    rev = np.stack([fftconvolve(gonder[:, c], ir[:, c])[:N] for c in range(2)], axis=1)

    karisim = davul + bas + melodi + zemin + efekt + rev * 0.9
    # sonda yumuşak kısılma
    son_n = int(1.2 * SR)
    karisim[-son_n:] *= np.linspace(1, 0, son_n)[:, None] ** 1.5
    return karisim / (np.max(np.abs(karisim)) + 1e-9) * 0.9


# ------------------------------------------------------------------ seslendirme + efekt
def seslendirme() -> tuple[np.ndarray, list[tuple[float, float]]]:
    v = np.zeros(N)
    araliklar = []
    for ses in ZAMAN["sesler"]:
        x = kirp(oku(KOK / "ses/parcalar" / ses["dosya"]))
        x = filtre(x, "high", 85)
        b = BASLAR[ses["sahne"]] + ses["bas"]
        ib = int(b * SR)
        n = min(len(x), N - ib)
        v[ib : ib + n] += x[:n]
        araliklar.append((b, b + n / SR))
    for (a1, b1), (a2, _) in zip(araliklar, araliklar[1:], strict=False):
        if b1 > a2:
            print(f"  UYARI: {a1:.2f}-{b1:.2f} sn cümlesi sonrakiyle çakışıyor ({a2:.2f})")
    return v / (np.max(np.abs(v)) + 1e-9) * 0.9, araliklar


def efektler() -> np.ndarray:
    e = np.zeros((N, 2))
    for i in range(2, len(BASLAR)):  # sahne geçişleri (logo girişinde çarpma zaten var)
        ekle(e, vuus(0.5, yukari=i % 2 == 0), BASLAR[i] - 0.12, 0.22, pan=(0.35 if i % 2 else -0.35))
    for k in ISARET["kanca"][:-1]:  # mesaj balonları
        ekle(e, balon_sesi(), k / FPS - 0.05, 0.3)
    ekle(e, zil([84, 88]), BASLAR[2] + ISARET["ses_kart"] / FPS, 0.28)               # kayıt bulundu
    ekle(e, zil([88, 91, 96], 1.2), BASLAR[6] + ISARET["limit_bildirim"] / FPS, 0.3)  # bildirim
    ekle(e, zil([79, 84, 88, 91], 2.0), BASLAR[-1] + ISARET["kapanis_cta"] / FPS, 0.3)  # CTA
    return e


def sustur_zarfi(araliklar: list[tuple[float, float]]) -> np.ndarray:
    """Seslendirme sırasında müziği kıs (yumuşak geçişli)."""
    m = np.zeros(N)
    for a, b in araliklar:
        m[int(max(0, a - 0.08) * SR) : int(min(TOPLAM, b + 0.15) * SR)] = 1
    k = int(0.18 * SR)
    m = np.convolve(m, np.ones(k) / k, mode="same")
    return 1 - 0.62 * m  # konuşurken ~ -8.4 dB


if __name__ == "__main__":
    print(f"süre {TOPLAM:.2f} sn, sahne başları: {', '.join(f'{b:.2f}' for b in BASLAR)}")
    m = muzik()
    yaz(KOK / "ses/muzik.wav", m)
    v, araliklar = seslendirme()
    duk = sustur_zarfi(araliklar)
    karisim = m * 0.42 * duk[:, None] + v[:, None] * 0.85 + efektler()
    karisim = np.tanh(karisim * 1.1) / np.tanh(1.1)  # yumuşak sınırlama
    gecici = KOK / "ses/_karisim.wav"
    yaz(gecici, karisim)
    cikti = KOK / "public/ses.wav"
    subprocess.run([FFMPEG, "-y", "-v", "error", "-i", str(gecici), "-af", "loudnorm=I=-14:TP=-1.5:LRA=11",
                    "-ar", "48000", "-c:a", "pcm_s16le", str(cikti)], check=True)
    gecici.unlink()
    print("public/ses.wav, ses/muzik.wav")
