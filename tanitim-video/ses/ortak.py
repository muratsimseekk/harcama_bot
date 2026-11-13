"""Ses yardımcıları: mp3 → numpy, sessizlik kırpma, wav yazma."""
from __future__ import annotations

import subprocess
from pathlib import Path

import imageio_ffmpeg
import numpy as np
from scipy.io import wavfile

SR = 48000
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()


def oku(yol: Path, kanal: int = 1) -> np.ndarray:
    """Herhangi bir ses dosyası → float32, SR örnekleme, (n,) ya da (n, kanal)."""
    r = subprocess.run(
        [FFMPEG, "-v", "error", "-i", str(yol), "-f", "f32le", "-ac", str(kanal), "-ar", str(SR), "-"],
        capture_output=True, check=True,
    )
    x = np.frombuffer(r.stdout, dtype=np.float32).copy()
    return x if kanal == 1 else x.reshape(-1, kanal)


def kirp(x: np.ndarray, esik_db: float = -42.0, pay: float = 0.03) -> np.ndarray:
    """Baştaki ve sondaki sessizliği atar (pay sn kadar nefes bırakır)."""
    return kirp_ofsetli(x, esik_db, pay)[0]


def kirp_ofsetli(x: np.ndarray, esik_db: float = -42.0, pay: float = 0.03) -> tuple[np.ndarray, float]:
    """kirp() + kırpılan baş kısmın süresi (sn)."""
    pencere = int(0.01 * SR)
    n = len(x) // pencere
    rms = np.sqrt(np.mean(x[: n * pencere].reshape(n, pencere) ** 2, axis=1) + 1e-12)
    db = 20 * np.log10(rms)
    dolu = np.where(db > esik_db)[0]
    if len(dolu) == 0:
        return x, 0.0
    bas = max(0, dolu[0] * pencere - int(pay * SR))
    son = min(len(x), (dolu[-1] + 1) * pencere + int(pay * SR))
    return x[bas:son], bas / SR


def yaz(yol: Path, x: np.ndarray) -> None:
    wavfile.write(str(yol), SR, np.clip(x, -1, 1).astype(np.float32))
