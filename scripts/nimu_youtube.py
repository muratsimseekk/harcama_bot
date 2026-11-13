"""nimustudio YouTube kanal görselleri: kapak (banner), profil fotoğrafı, video filigranı.

Renkler nimustudio sitesi + Paraİzi ile aynı (krem #FAF7F2, vurgu #D97757, koyu #2B2622);
fontlar uygulamanınkiler (Newsreader başlık, Inter metin).

Çıktı:  docs/marka/youtube-kapak.png      2560×1440 (güvenli alan ortada 1546×423 — tüm yazılar orada)
        docs/marka/youtube-profil.png     800×800  (YouTube daire olarak kırpar)
        docs/marka/youtube-filigran.png   150×150  saydam PNG (videoların sağ altında)
Çalıştır:  python scripts/nimu_youtube.py
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

KOK = Path(__file__).resolve().parent.parent
NM = KOK / "mobile/node_modules/@expo-google-fonts"
CIKTI = KOK / "docs/marka"

KREM = (250, 247, 242)
KOYU = (43, 38, 34)
SOLUK = (111, 102, 94)
VURGU = (217, 119, 87)
TURUNCU = (224, 106, 74)
TURUNCU_KOYU = (190, 80, 52)
CIZGI = (231, 223, 213)


def font(aile: str, agirlik: str, boyut: int) -> ImageFont.FreeTypeFont:
    ad = "newsreader" if aile == "serif" else "inter"
    dosya = f"{'Newsreader' if aile == 'serif' else 'Inter'}_{agirlik}.ttf"
    return ImageFont.truetype(str(NM / f"{ad}/{agirlik}/{dosya}"), boyut)


def degrade(w: int, h: int, c1, c2, aci: float = 135) -> Image.Image:
    """Doğrusal degrade (aci derece; 135 = sol üstten sağ alta)."""
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    r = np.deg2rad(aci - 90)
    t = x / w * np.cos(r) + y / h * np.sin(r)
    t = (t - t.min()) / (t.max() - t.min() + 1e-9)
    a = np.array(c1, np.float32)
    b = np.array(c2, np.float32)
    return Image.fromarray((a + (b - a) * t[..., None]).astype(np.uint8), "RGB")


def parilti(w: int, h: int, merkez, yaricap: float, renk, guc: float) -> Image.Image:
    """Yumuşak dairesel parıltı → RGBA."""
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    d = np.sqrt((x - merkez[0]) ** 2 + (y - merkez[1]) ** 2) / yaricap
    a = np.clip(1 - d, 0, 1) ** 2.2 * 255 * guc
    im = np.zeros((h, w, 4), np.uint8)
    im[..., :3] = renk
    im[..., 3] = a.astype(np.uint8)
    return Image.fromarray(im, "RGBA")


def monogram(boyut: int, sekil: str = "kare") -> Image.Image:
    """Turuncu zemin + serif "n" + krem nokta. sekil: kare (yuvarlak köşe) | daire. RGBA."""
    s = boyut * 4  # süper örnekleme
    zemin = degrade(s, s, (236, 128, 92), TURUNCU_KOYU, 135).convert("RGBA")
    # üstte hafif ışık
    zemin.alpha_composite(parilti(s, s, (s * 0.3, s * 0.2), s * 0.9, (255, 255, 255), 0.22))
    maske = Image.new("L", (s, s), 0)
    md = ImageDraw.Draw(maske)
    if sekil == "daire":
        md.ellipse([0, 0, s - 1, s - 1], fill=255)
    else:
        md.rounded_rectangle([0, 0, s - 1, s - 1], radius=int(s * 0.24), fill=255)
    d = ImageDraw.Draw(zemin)
    f = font("serif", "700Bold", int(s * 0.78))
    # "n"yi görsel merkeze al (x-yüksekliği için biraz yukarıda değil, tam ortada)
    kutu = d.textbbox((0, 0), "n", font=f)
    gw, gh = kutu[2] - kutu[0], kutu[3] - kutu[1]
    nokta = s * 0.075
    x = (s - gw - nokta * 2.2) / 2 - kutu[0]
    y = (s - gh) / 2 - kutu[1] + s * 0.01
    d.text((x, y), "n", font=f, fill=(255, 255, 255))
    # nokta: "n."nin taban çizgisinde
    nx = x + kutu[2] + nokta * 0.9
    ny = y + kutu[3] - nokta * 2
    d.ellipse([nx, ny, nx + nokta * 2, ny + nokta * 2], fill=(255, 228, 214))
    zemin.putalpha(maske)
    return zemin.resize((boyut, boyut), Image.LANCZOS)


def golge(im: Image.Image, bulanik: int, kuvvet: float, dy: int) -> Image.Image:
    """RGBA katmanın altına yumuşak gölge ekler (aynı boyut + pay)."""
    pay = bulanik * 3
    out = Image.new("RGBA", (im.width + 2 * pay, im.height + 2 * pay + dy), (0, 0, 0, 0))
    a = Image.new("L", out.size, 0)
    a.paste(im.getchannel("A").point(lambda v: int(v * kuvvet)), (pay, pay + dy))
    a = a.filter(ImageFilter.GaussianBlur(bulanik))
    out.paste(Image.new("RGBA", out.size, (70, 30, 15, 255)), (0, 0), a)
    out.alpha_composite(im, (pay, pay))
    out.info["pay"] = pay
    return out


_IKON = KOK / "mobile/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons"
_GLIF = json.loads((_IKON / "glyphmaps/Ionicons.json").read_text())
ETIKETLER = [
    ("phone-portrait-outline", "Mobil uygulamalar"),
    ("sparkles-outline", "Yapay zekâ"),
]


def etiket(ik: str, yazi: str) -> Image.Image:
    """Beyaz hap: turuncu Ionicons simgesi + metin. RGBA."""
    f = font("sans", "600SemiBold", 31)
    fi = ImageFont.truetype(str(_IKON / "Fonts/Ionicons.ttf"), 38)
    olc = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
    w = int(28 + 40 + 14 + olc.textlength(yazi, font=f) + 30)
    im = Image.new("RGBA", (w, 88), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([0, 0, w - 1, 87], 44, fill=(255, 255, 255, 255), outline=CIZGI + (255,), width=2)
    d.text((28 + 20, 44), chr(_GLIF[ik]), font=fi, fill=VURGU, anchor="mm")
    d.text((28 + 40 + 14, 44), yazi, font=f, fill=KOYU, anchor="lm")
    return im


# ------------------------------------------------------------------ kapak
def kapak() -> Image.Image:
    W, H = 2560, 1440
    im = Image.new("RGBA", (W, H), KREM + (255,))
    # kenarlarda sıcak parıltılar (TV / geniş ekranda görünür; güvenli alanın dışında)
    im.alpha_composite(parilti(W, H, (180, 300), 900, VURGU, 0.30))
    im.alpha_composite(parilti(W, H, (2420, 1180), 1000, VURGU, 0.26))
    im.alpha_composite(parilti(W, H, (1280, 720), 900, (255, 255, 255), 0.55))
    # nokta ızgarası: kenarlarda belirgin, ortada kaybolur
    izgara = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(izgara)
    for yy in range(24, H, 48):
        for xx in range(24, W, 48):
            u = min(1.0, (abs(xx - W / 2) / (W / 2)) ** 1.6 * 1.6)
            if u > 0.05:
                gd.ellipse([xx - 2.4, yy - 2.4, xx + 2.4, yy + 2.4], fill=CIZGI + (int(255 * u),))
    im.alpha_composite(izgara)
    # ince kavisler (köşelerde, zarif dokunuş)
    kavis = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    kd = ImageDraw.Draw(kavis)
    for i, r in enumerate((520, 640, 760)):
        kd.arc([-r + 120, -r + 140, r + 120, r + 140], 0, 90, fill=VURGU + (70 - i * 18,), width=3)
        kd.arc([W - 120 - r, H - 140 - r, W - 120 + r, H - 140 + r], 180, 270, fill=VURGU + (70 - i * 18,), width=3)
    im.alpha_composite(kavis)

    # ---- güvenli alan içeriği (1546×423, merkez 1280×720)
    d = ImageDraw.Draw(im)
    f_nimu = font("serif", "700Bold", 168)
    f_studio = font("serif", "700Bold_Italic", 168)
    f_alt = font("sans", "500Medium", 40)

    mono = golge(monogram(250), 28, 0.35, 16)
    w_nimu = d.textlength("nimu", font=f_nimu)
    w_studio = d.textlength("studio", font=f_studio)
    w_kelime = w_nimu + 6 + w_studio
    bosluk = 64
    grup_w = 250 + bosluk + w_kelime
    x0 = round(1280 - grup_w / 2)
    # dikey: kelime + alt yazı + rozet bloğu ~ 330 px, ortada
    # blok: kelime üstü (taban-130) … etiket altı (taban+228) = 358 px → güvenli alanın (423) ortasında
    taban = 720 - 183 + 130
    im.alpha_composite(mono, (x0 - mono.info["pay"], 720 - 125 - mono.info["pay"]))
    tx = x0 + 250 + bosluk
    d.text((tx, taban), "nimu", font=f_nimu, fill=KOYU, anchor="ls")
    d.text((tx + w_nimu + 6, taban), "studio", font=f_studio, fill=VURGU, anchor="ls")
    # alt yazı
    d.text((tx + 4, taban + 34), "Bağımsız mobil uygulama stüdyosu", font=f_alt, fill=SOLUK, anchor="lt")
    # ince ayraç
    d.line([(tx + 4, taban + 108), (tx + 4 + 120, taban + 108)], fill=VURGU, width=4)
    # stüdyo etiketleri (tek uygulamaya bağlı değil)
    ry = taban + 140
    x = tx
    for ik, yazi in ETIKETLER:
        cip = etiket(ik, yazi)
        cg = golge(cip, 18, 0.10, 6)
        im.alpha_composite(cg, (int(x) - cg.info["pay"], int(ry) - cg.info["pay"]))
        x += cip.width + 18
    return im.convert("RGB")


# ------------------------------------------------------------------ profil ve filigran
def profil() -> Image.Image:
    S = 800
    im = Image.new("RGBA", (S, S), KREM + (255,))
    m = monogram(S, "daire")
    im.alpha_composite(m)
    # ince iç halka (daire kırpımında zarif kenar)
    halka = Image.new("RGBA", (S * 4, S * 4), (0, 0, 0, 0))
    ImageDraw.Draw(halka).ellipse([48, 48, S * 4 - 49, S * 4 - 49], outline=(255, 236, 226, 110), width=14)
    im.alpha_composite(halka.resize((S, S), Image.LANCZOS))
    return im.convert("RGB")


def filigran() -> Image.Image:
    return monogram(150, "daire")


if __name__ == "__main__":
    CIKTI.mkdir(parents=True, exist_ok=True)
    kapak().save(CIKTI / "youtube-kapak.png", optimize=True)
    profil().save(CIKTI / "youtube-profil.png", optimize=True)
    filigran().save(CIKTI / "youtube-filigran.png", optimize=True)
    for ad in ("youtube-kapak.png", "youtube-profil.png", "youtube-filigran.png"):
        print(f"docs/marka/{ad}  {(CIKTI / ad).stat().st_size // 1024} KB")
