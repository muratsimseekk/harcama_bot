"""Logodan uygulama ikonlarını ve Play mağaza görsellerini üretir.

Logo değişince yalnız bunu çalıştır (düz renk zemin + üstünde motif olan kare PNG):

    .venv/Scripts/python.exe scripts/ikon_olustur.py "C:/yol/logo.png"

Motif, zemin renginden farkına göre ayıklanır, ortalanır ve düz zemine yeniden basılır
(üretilmiş görsellerdeki zemin dokusu/kayması gider).

Çıktılar:
  mobile/assets/icon.png              1024  iOS + genel ikon (opak)
  mobile/assets/adaptive-icon.png     1024  Android adaptive ön plan (şeffaf, güvenli alanda)
  mobile/assets/splash-icon.png       1024  açılış ekranı motifi (şeffaf)
  mobile/assets/notification-icon.png  96   Android bildirim ikonu (beyaz, şeffaf)
  docs/magaza-gorselleri/icon-512.png        Play mağaza ikonu
  docs/magaza-gorselleri/feature-graphic.png Play öne çıkan görsel 1024×500
Zemin rengi ekrana yazdırılır → app.json'daki backgroundColor'larla eşitle.
"""

import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageStat

KOK = Path(__file__).resolve().parent.parent
ASSETS = KOK / "mobile" / "assets"
MAGAZA = KOK / "docs" / "magaza-gorselleri"

# Motifin en uzak noktası ikonun yarı genişliğinin bu oranında kalır.
# Android adaptive güvenli alanı: 108dp tuvalde 66dp çaplı daire → yarıçap %30,5.
ADAPTIF_YARICAP = 0.29
IKON_YARICAP = 0.40


def zemin_rengi(im: Image.Image) -> tuple[int, int, int]:
    """Kenar şeritlerinin medyanı = zemin."""
    w, h = im.size
    s = max(4, w // 40)
    seritler = [im.crop((0, 0, w, s)), im.crop((0, h - s, w, h)),
                im.crop((0, 0, s, h)), im.crop((w - s, 0, w, h))]
    toplam = [0, 0, 0]
    for sr in seritler:
        for i, v in enumerate(ImageStat.Stat(sr).median[:3]):
            toplam[i] += v
    return tuple(round(t / 4) for t in toplam)


def motif_ayikla(im: Image.Image, zemin) -> Image.Image:
    """Zeminden uzaklığa göre alfa: zemine yakın → şeffaf, uzak → opak (kenarlar yumuşak)."""
    rgb = im.convert("RGB")
    alt, ust = 40, 110  # renk uzaklığı eşikleri (doku/gürültü alt eşiğin altında kalır)
    piks = rgb.load()
    w, h = rgb.size
    alfa = Image.new("L", (w, h))
    ap = alfa.load()
    for y in range(h):
        for x in range(w):
            r, g, b = piks[x, y]
            d = ((r - zemin[0]) ** 2 + (g - zemin[1]) ** 2 + (b - zemin[2]) ** 2) ** 0.5
            ap[x, y] = 0 if d <= alt else 255 if d >= ust else round((d - alt) / (ust - alt) * 255)
    motif = rgb.convert("RGBA")
    motif.putalpha(alfa)
    return motif.crop(alfa.getbbox())


def yerlestir(motif: Image.Image, boyut: int, yaricap_orani: float, zemin=None) -> Image.Image:
    """Motifi, köşegen yarıçapı boyut*oran olacak şekilde ölçekleyip ortalar."""
    mw, mh = motif.size
    kosegen_yari = (mw ** 2 + mh ** 2) ** 0.5 / 2
    olcek = boyut * yaricap_orani / kosegen_yari
    m = motif.resize((round(mw * olcek), round(mh * olcek)), Image.LANCZOS)
    tuval = Image.new("RGBA", (boyut, boyut), (*zemin, 255) if zemin else (0, 0, 0, 0))
    tuval.alpha_composite(m, ((boyut - m.width) // 2, (boyut - m.height) // 2))
    return tuval


def font(boyut: int, kalin: bool):
    adaylar = (["segoeuib.ttf", "arialbd.ttf", "DejaVuSans-Bold.ttf"] if kalin
               else ["segoeui.ttf", "arial.ttf", "DejaVuSans.ttf"])
    for ad in adaylar:
        for yol in (Path("C:/Windows/Fonts") / ad, Path(ad)):
            try:
                return ImageFont.truetype(str(yol), boyut)
            except OSError:
                continue
    return ImageFont.load_default()


def ozellik_grafigi(motif: Image.Image, zemin) -> Image.Image:
    w, h = 1024, 500
    g = Image.new("RGBA", (w, h), (*zemin, 255))
    m = yerlestir(motif, 360, 0.42)
    g.alpha_composite(m, (70, (h - 360) // 2))
    d = ImageDraw.Draw(g)
    krem = (250, 247, 240)
    d.text((430, 150), "Paraİzi", font=font(96, True), fill=krem)
    d.text((434, 280), "Yaz ya da söyle, harcaman kaydolsun.", font=font(30, False), fill=krem)
    d.text((434, 325), "Bütçe, hedef ve analiz tek yerde.", font=font(30, False), fill=krem)
    return g.convert("RGB")


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    im = Image.open(sys.argv[1]).convert("RGB")
    zemin = zemin_rengi(im)
    motif = motif_ayikla(im, zemin)
    ASSETS.mkdir(parents=True, exist_ok=True)
    MAGAZA.mkdir(parents=True, exist_ok=True)

    ikon = yerlestir(motif, 1024, IKON_YARICAP, zemin).convert("RGB")
    ikon.save(ASSETS / "icon.png")
    ikon.resize((512, 512), Image.LANCZOS).save(MAGAZA / "icon-512.png")
    yerlestir(motif, 1024, ADAPTIF_YARICAP).save(ASSETS / "adaptive-icon.png")
    yerlestir(motif, 1024, 0.45).save(ASSETS / "splash-icon.png")

    # Bildirim ikonu: Android yalnız alfa kanalını kullanır → beyaz siluet
    sil = yerlestir(motif, 96, 0.42)
    beyaz = Image.new("RGBA", sil.size, (255, 255, 255, 0))
    beyaz.putalpha(sil.getchannel("A"))
    beyaz.save(ASSETS / "notification-icon.png")

    ozellik_grafigi(motif, zemin).save(MAGAZA / "feature-graphic.png")
    print("zemin rengi: #%02X%02X%02X" % zemin)


if __name__ == "__main__":
    main()
