"""Hikâye (WhatsApp durum / Instagram / Facebook story) tanıtım görseli + 14 sn video, 1080×1920.

Çıktı:  docs/tanitim/hikaye.png, docs/tanitim/hikaye-video.mp4
Kaynak: mağaza görsellerinin ham ekranları ve yardımcıları (scripts/magaza_ekran_goruntuleri.py).

Yalnız YAYINDAKİ sürümde olan özellikler gösterilir (sesli kayıt, ana ekran, limit bildirimi);
build 11'in kategori kıyası / kategori hedefi burada yok.
Hikâye güvenli alanı: üst ~250 px ve alt ~250 px'e yazı konmaz (profil adı, yanıt çubuğu).
Videoda ses yok — müziği paylaşırken Instagram/WhatsApp'ın kendi kütüphanesinden ekle (telif).

Gereken: pip install imageio-ffmpeg  (ffmpeg ikili dosyasını getirir)
Çalıştır:  python scripts/hikaye_tanitim.py
"""
from __future__ import annotations

import math
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, str(Path(__file__).resolve().parent))
from magaza_ekran_goruntuleri import (  # noqa: E402
    BEYAZ, H, KOK, KREM, SEFTALI, SOLUK, TURUNCU, TURUNCU_KOYU, W, YAZI, font, ham, ikon, kart,
    statu_temizle, zemin,
)

CIKTI = KOK / "docs/tanitim"
SEFTALI_ACIK = (255, 228, 216)
FPS = 30
SURE = 14.0


# ------------------------------------------------------------------ katman yardımcıları
def golgeli(parca: Image.Image, yaricap: int, bulanik=40, koyuluk=70, dy=24) -> Image.Image:
    """Yuvarlatılmış köşeli parça + yumuşak gölge → RGBA katman (kenar payı = bulanik*3)."""
    w, h = parca.size
    pay = bulanik * 3
    out = Image.new("RGBA", (w + 2 * pay, h + 2 * pay + dy), (0, 0, 0, 0))
    g = Image.new("L", out.size, 0)
    ImageDraw.Draw(g).rounded_rectangle([pay, pay + dy, pay + w, pay + h + dy], yaricap, fill=koyuluk)
    g = g.filter(ImageFilter.GaussianBlur(bulanik))
    out.paste(Image.new("RGBA", out.size, (40, 20, 10, 255)), (0, 0), g)
    m = Image.new("L", (w, h), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, w - 1, h - 1], yaricap, fill=255)
    if parca.mode == "RGBA":
        m = Image.composite(parca.getchannel("A"), Image.new("L", (w, h), 0), m)
    out.paste(parca.convert("RGB"), (pay, pay), m)
    out.info["pay"] = pay
    return out


def telefon(ekran: Image.Image, genislik: int) -> Image.Image:
    cer = 22
    ek = ekran.resize((genislik, round(ekran.height * genislik / ekran.width)), Image.LANCZOS)
    govde = Image.new("RGB", (genislik + 2 * cer, ek.height + 2 * cer), (24, 24, 26))
    m = Image.new("L", ek.size, 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, ek.width - 1, ek.height - 1], 62, fill=255)
    govde.paste(ek, (cer, cer), m)
    ImageDraw.Draw(govde).ellipse(
        [govde.width // 2 - 13, cer + 22, govde.width // 2 + 13, cer + 48], fill=(14, 14, 16)
    )
    return golgeli(govde, 84, bulanik=50, koyuluk=90, dy=30)


def koy(tuval: Image.Image, katman: Image.Image, x: float, y: float, olcek=1.0, opak=1.0) -> None:
    """Katmanı (x, y) = parçanın sol üstü olacak şekilde koyar; ölçek merkezden, opaklık 0..1."""
    if opak <= 0.001:
        return
    pay = katman.info.get("pay", 0)
    k = katman
    if abs(olcek - 1) > 0.002:
        k = katman.resize((max(1, round(katman.width * olcek)), max(1, round(katman.height * olcek))),
                          Image.BILINEAR)
    cx = x - pay + katman.width / 2
    cy = y - pay + katman.height / 2
    a = k.getchannel("A")
    if opak < 0.999:
        a = a.point(lambda v: round(v * opak))
    tuval.paste(k, (round(cx - k.width / 2), round(cy - k.height / 2)), a)


def metin(satir: str, boyut: int, renk, aile="serif", agirlik="700Bold", vurgu: str | None = None,
          vurgu_renk=TURUNCU) -> Image.Image:
    """Tuval genişliğinde, yatay ortalı tek satır RGBA (vurgu kelimesi renkli)."""
    f = font(aile, agirlik, boyut)
    im = Image.new("RGBA", (W, round(boyut * 1.35)), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    kel = satir.split(" ")
    bosluk = d.textlength(" ", font=f)
    toplam = sum(d.textlength(k, font=f) for k in kel) + bosluk * (len(kel) - 1)
    x = (W - toplam) / 2
    for k in kel:
        d.text((x, 0), k, font=f, fill=vurgu_renk if vurgu and k.strip(",.?!…") == vurgu else renk)
        x += d.textlength(k, font=f) + bosluk
    return im


# ------------------------------------------------------------------ zamanlama
def ara(t: float, a: float, b: float) -> float:
    return 0.0 if t <= a else 1.0 if t >= b else (t - a) / (b - a)


def yavas(p: float) -> float:  # easeOutCubic
    return 1 - (1 - p) ** 3


def zipla(p: float) -> float:  # easeOutBack
    c1 = 1.70158
    return 1 + (c1 + 1) * (p - 1) ** 3 + c1 * (p - 1) ** 2


def belir(tuval, katman, x, y, t, bas, sure=0.45, kay=40, olcek0=0.9) -> None:
    """Alttan kayarak + büyüyerek beliren katman."""
    p = ara(t, bas, bas + sure)
    if p <= 0:
        return
    koy(tuval, katman, x, y + (1 - yavas(p)) * kay, olcek0 + (1 - olcek0) * zipla(p), yavas(p))


# ------------------------------------------------------------------ parçalar
def kayit_ekrani() -> Image.Image:
    """Ekle ekranı: mikrofon göstergesi ve eski Pro hesabın 'Sınırsız kayıt hakkı' şeridi silinmiş."""
    e = statu_temizle(ham("kayit"))
    ImageDraw.Draw(e).rectangle([0, 250, W, 400], fill=e.getpixel((540, 470)))
    return e


def balon(yazi: str, imlec: bool) -> Image.Image:
    b, d = kart(780, 150)
    d.ellipse([28, 33, 112, 117], fill=(253, 236, 229))
    ikon(d, "mic", (70, 75), 44, TURUNCU)
    d.text((136, 38), "Söylediğin", font=font("sans", "600SemiBold", 26), fill=SOLUK)
    f = font("sans", "700Bold", 32)
    d.text((136, 72), yazi, font=f, fill=YAZI)
    if imlec:
        x = 136 + d.textlength(yazi, font=f) + 4
        d.rectangle([x, 76, x + 3, 112], fill=TURUNCU)
    return b


def bulunan_kart() -> Image.Image:
    satirlar = [("cart", (232, 93, 140), "Market", "Market · bugün", "850 ₺"),
                ("car", (80, 110, 170), "Benzin", "Ulaşım · dün", "1.200 ₺")]
    k, d = kart(780, 120 + 104 * len(satirlar))
    d.text((40, 36), "2 kayıt bulundu", font=font("sans", "700Bold", 30), fill=YAZI)
    ikon(d, "checkmark-circle", (732, 54), 40, (46, 160, 90))
    for i, (ik, rk, ad, kat, tutar) in enumerate(satirlar):
        y = 108 + i * 104
        d.rounded_rectangle([40, y, 116, y + 76], 20, fill=tuple(round(c * 0.16 + 255 * 0.84) for c in rk))
        ikon(d, ik, (78, y + 38), 38, rk)
        d.text((140, y + 6), ad, font=font("sans", "700Bold", 32), fill=YAZI)
        d.text((140, y + 46), kat, font=font("sans", "500Medium", 25), fill=SOLUK)
        d.text((740, y + 22), tutar, font=font("sans", "700Bold", 32), fill=YAZI, anchor="ra")
    return k


def cta(genislik=760, yukseklik=128) -> Image.Image:
    k, d = kart(genislik, yukseklik)
    f = font("sans", "700Bold", 40)
    yazi = "Google Play'de ücretsiz"
    tw = d.textlength(yazi, font=f) + 70
    x0 = (genislik - tw) / 2
    ikon(d, "logo-google-playstore", (round(x0 + 24), yukseklik // 2), 46, TURUNCU)
    d.text((x0 + 70, yukseklik / 2), yazi, font=f, fill=YAZI, anchor="lm")
    return k


def cip(ik: str, yazi: str, genislik=820) -> Image.Image:
    k, d = kart(genislik, 112, (255, 241, 235))
    d.rounded_rectangle([24, 18, 100, 94], 22, fill=BEYAZ)
    ikon(d, ik, (62, 56), 40, TURUNCU)
    d.text((126, 56), yazi, font=font("sans", "600SemiBold", 34), fill=YAZI, anchor="lm")
    return k


def simge(boyut: int) -> Image.Image:
    im = Image.open(KOK / "docs/magaza-gorselleri/icon-512.png").convert("RGB").resize((boyut, boyut), Image.LANCZOS)
    return im


class Parca:
    """Video ve görselde ortak, bir kez üretilen katmanlar."""

    def __init__(self) -> None:
        self.zemin_turuncu = zemin(TURUNCU, TURUNCU_KOYU)
        self.zemin_krem = zemin(KREM, SEFTALI)
        self.tel_kayit = telefon(kayit_ekrani(), 640)
        self.tel_ana = telefon(ham("home"), 640)
        self.bulunan = golgeli(bulunan_kart(), 36)
        self.cta = golgeli(cta(), 64, bulanik=30, koyuluk=60, dy=16)
        uyari = ham("bildirim").crop((24, 380, 1056, 585))
        uyari = uyari.resize((900, round(uyari.height * 900 / uyari.width)), Image.LANCZOS)
        self.uyari = golgeli(uyari, 34)
        self.simge = golgeli(simge(240), 56, bulanik=30, koyuluk=80)


# ------------------------------------------------------------------ video sahneleri
CUMLE = "“Market 850, dün benzin 1200”"
TEL_X = (W - 684) // 2  # 640 + 2*22 çerçeve


def sahne_kanca(p: Parca, t: float) -> Image.Image:
    """0–2.8 sn: soru."""
    im = p.zemin_krem.copy()
    belir(im, metin("Maaş yattı…", 104, YAZI), 0, 640, t, 0.15, kay=50)
    belir(im, metin("ve yine bitti?", 104, YAZI, vurgu="bitti?"), 0, 770, t, 0.75, kay=50)
    belir(im, metin("Nereye gittiğini bilmek 3 saniye.", 42, SOLUK, "sans", "500Medium"), 0, 960, t, 1.4)
    # küçük mikrofon ipucu
    if t > 1.9:
        q = yavas(ara(t, 1.9, 2.3))
        d = ImageDraw.Draw(im)
        r = 64 * (0.6 + 0.4 * zipla(ara(t, 1.9, 2.3)))
        d.ellipse([W / 2 - r, 1200 - r, W / 2 + r, 1200 + r], fill=tuple(round(SEFTALI[i] + (TURUNCU[i] - SEFTALI[i]) * q) for i in range(3)))
        ikon(d, "mic", (W // 2, 1200), round(r * 1.05), BEYAZ)
    return im


def sahne_ses(p: Parca, t: float) -> Image.Image:
    """2.6–8.2 sn: sesle söyle → 2 kayıt bulundu."""
    im = p.zemin_turuncu.copy()
    belir(im, metin("Söyle,", 96, BEYAZ), 0, 250, t, 2.6)
    belir(im, metin("Paraİzi kaydetsin.", 96, BEYAZ), 0, 358, t, 2.8)
    belir(im, metin("Tutar, kategori ve tarih saniyeler içinde hazır.", 36, SEFTALI_ACIK, "sans", "500Medium"),
          0, 490, t, 3.05)
    py = 640 + (1 - yavas(ara(t, 2.45, 3.2))) * 1300
    koy(im, p.tel_kayit, TEL_X, py)
    # mikrofon düğmesinin çevresinde dinleme halkaları
    if 3.4 < t < 5.6:
        mx, my = TEL_X + 22 + 540 * 640 / 1080, py + 22 + 990 * 640 / 1080
        halka = Image.new("RGBA", (520, 520), (0, 0, 0, 0))
        hd = ImageDraw.Draw(halka)
        for k in range(2):
            f = ((t - 3.4) * 1.2 + k * 0.5) % 1.0
            r = 70 + 170 * f
            hd.ellipse([260 - r, 260 - r, 260 + r, 260 + r], outline=(224, 106, 74, round(170 * (1 - f))), width=8)
        im.paste(halka, (round(mx - 260), round(my - 260)), halka)
    # konuşma balonu — yazı daktiloyla
    if t > 3.6:
        n = round(len(CUMLE) * ara(t, 3.9, 5.3))
        b = golgeli(balon(CUMLE[:n], imlec=(t < 5.6 and int(t * 3) % 2 == 0) or n < len(CUMLE)), 34)
        belir(im, b, 150, 800, t, 3.6)
    belir(im, p.bulunan, 150, 1290, t, 5.7, sure=0.5, kay=60, olcek0=0.8)
    return im


def sahne_ozet(p: Parca, t: float) -> Image.Image:
    """8.0–11.4 sn: ana ekran + limit uyarısı."""
    im = p.zemin_krem.copy()
    belir(im, metin("Paran nereye gidiyor?", 88, YAZI), 0, 250, t, 8.25)
    belir(im, metin("Tek bakışta.", 88, YAZI, vurgu="Tek"), 0, 350, t, 8.45)
    belir(im, metin("Sınıra yaklaşınca da haber verir.", 36, SOLUK, "sans", "500Medium"), 0, 480, t, 8.7)
    koy(im, p.tel_ana, TEL_X, 640 - 30 * ara(t, 8.0, 11.4))
    belir(im, p.uyari, 90, 1250, t, 9.4, sure=0.5, kay=60, olcek0=0.8)
    return im


SON_CIPLER = [("mic-outline", "Konuşarak ya da yazarak kaydet"),
              ("shield-checkmark-outline", "Bankana bağlanmaz, kart istemez"),
              ("gift-outline", "Ücretsiz başla: günde 3 kayıt")]


def sahne_son(p: Parca, t: float) -> Image.Image:
    """11.2–14 sn: kapanış + çağrı."""
    im = p.zemin_turuncu.copy()
    belir(im, p.simge, W // 2 - 120, 300, t, 11.2, sure=0.5, olcek0=0.6)
    belir(im, metin("Paraİzi", 120, BEYAZ), 0, 580, t, 11.4)
    belir(im, metin("Sesli harcama takibi", 42, SEFTALI_ACIK, "sans", "600SemiBold"), 0, 740, t, 11.55)
    for i, (ik, yazi) in enumerate(SON_CIPLER):
        belir(im, golgeli(cip(ik, yazi), 30, bulanik=24, koyuluk=40, dy=12), (W - 820) // 2, 870 + i * 140, t,
              11.75 + i * 0.15)
    nabiz = 1 + 0.025 * math.sin(max(0.0, t - 13.0) * 2 * math.pi * 1.4) if t > 13.0 else 1.0
    p_cta = ara(t, 12.3, 12.8)
    if p_cta > 0:
        koy(im, p.cta, (W - 760) // 2, 1340 + (1 - yavas(p_cta)) * 40, (0.85 + 0.15 * zipla(p_cta)) * nabiz,
            yavas(p_cta))
    belir(im, metin("Play Store'da “Paraİzi” diye ara", 32, SEFTALI_ACIK, "sans", "500Medium"), 0, 1500, t, 12.6)
    return im


def daire_maske(merkez, r) -> Image.Image:
    m = Image.new("L", (W, H), 0)
    ImageDraw.Draw(m).ellipse([merkez[0] - r, merkez[1] - r, merkez[0] + r, merkez[1] + r], fill=255)
    return m


def kare(p: Parca, t: float) -> Image.Image:
    if t < 2.5:
        return sahne_kanca(p, t)
    if t < 2.95:  # turuncu daire, mikrofon ipucundan açılır
        r = yavas(ara(t, 2.5, 2.95)) * 2300
        return Image.composite(sahne_ses(p, t), sahne_kanca(p, t), daire_maske((W // 2, 1200), r))
    if t < 8.0:
        return sahne_ses(p, t)
    if t < 8.4:  # sola itme
        o = round(yavas(ara(t, 8.0, 8.4)) * W)
        im = Image.new("RGB", (W, H))
        im.paste(sahne_ses(p, t), (-o, 0))
        im.paste(sahne_ozet(p, t), (W - o, 0))
        return im
    if t < 11.1:
        return sahne_ozet(p, t)
    if t < 11.5:
        r = yavas(ara(t, 11.1, 11.5)) * 2300
        return Image.composite(sahne_son(p, t), sahne_ozet(p, t), daire_maske((W // 2, H), r))
    return sahne_son(p, t)


# ------------------------------------------------------------------ durağan hikâye görseli
def hikaye_gorseli(p: Parca) -> Image.Image:
    im = p.zemin_turuncu.copy()
    # üst: simge + ad
    s = simge(84)
    m = Image.new("L", s.size, 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, 83, 83], 20, fill=255)
    d = ImageDraw.Draw(im)
    f = font("serif", "700Bold", 52)
    tw = 84 + 20 + d.textlength("Paraİzi", font=f)
    x0 = round((W - tw) / 2)
    im.paste(s, (x0, 250), m)
    d.text((x0 + 104, 292), "Paraİzi", font=f, fill=BEYAZ, anchor="lm")
    koy(im, metin("Harcamanı söyle,", 88, BEYAZ), 0, 380)
    koy(im, metin("gerisini o halletsin.", 88, BEYAZ), 0, 480)
    koy(im, metin("Tutar, kategori ve tarih saniyeler içinde hazır.", 34, SEFTALI_ACIK, "sans", "500Medium"), 0, 605)
    koy(im, p.tel_kayit, TEL_X, 720)
    koy(im, golgeli(balon(CUMLE, False), 34), 150, 880)
    koy(im, p.bulunan, 150, 1180)
    koy(im, p.cta, (W - 760) // 2, 1545)
    return im


if __name__ == "__main__":
    import imageio_ffmpeg

    CIKTI.mkdir(parents=True, exist_ok=True)
    p = Parca()
    hikaye_gorseli(p).save(CIKTI / "hikaye.png", optimize=True)
    print("docs/tanitim/hikaye.png")

    if "--yalniz-gorsel" in sys.argv:
        sys.exit(0)
    if "--kareler" in sys.argv:  # hızlı önizleme: birkaç an
        for t in (1.5, 2.7, 4.6, 6.6, 8.2, 10.2, 11.3, 13.5):
            kare(p, t).save(CIKTI / f"_kare_{t:04.1f}.png")
        sys.exit(0)

    yol = CIKTI / "hikaye-video.mp4"
    cmd = [imageio_ffmpeg.get_ffmpeg_exe(), "-y", "-loglevel", "error",
           "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
           "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo",
           "-shortest", "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p",
           "-profile:v", "high", "-c:a", "aac", "-b:a", "64k", "-movflags", "+faststart", str(yol)]
    ff = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    n = round(SURE * FPS)
    for i in range(n):
        ff.stdin.write(kare(p, i / FPS).tobytes())
        if i % 60 == 0:
            print(f"  {i}/{n}", flush=True)
    ff.stdin.close()
    ff.wait()
    print("docs/tanitim/hikaye-video.mp4")
