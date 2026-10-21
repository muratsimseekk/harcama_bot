"""Play Store telefon ekran görüntüleri (1080×1920, 9:16) — ham emülatör görüntülerinden.

Girdi:  docs/magaza-gorselleri/ham/*.png  (Pixel 6 emülatörü, 1080×2400, demo hesap,
        sysui demo modu: saat 9:41, bildirim yok)
Çıktı:  docs/magaza-gorselleri/ekran-1..6.png

Düzen (2026 mağaza kalıbı): üstte kısa sonuç odaklı başlık + tek satır alt metin, altta
cihaz çerçevesi (alttan taşar), bazı karelerde arayüzden kesilip büyütülmüş "yüzen" kart.
Fontlar uygulamanın kendisi: başlık Newsreader, metin Inter; ikonlar Ionicons.

Çalıştır:  python scripts/magaza_ekran_goruntuleri.py
"""
from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

KOK = Path(__file__).resolve().parent.parent
HAM = KOK / "docs/magaza-gorselleri/ham"
CIKTI = KOK / "docs/magaza-gorselleri"
NM = KOK / "mobile/node_modules"

W, H = 1080, 1920
TURUNCU = (224, 106, 74)
TURUNCU_KOYU = (196, 84, 56)
KREM = (250, 249, 245)
SEFTALI = (246, 230, 220)
YAZI = (31, 30, 29)
SOLUK = (107, 103, 95)
BEYAZ = (255, 255, 255)


def font(aile: str, agirlik: str, boyut: int) -> ImageFont.FreeTypeFont:
    ad = {"serif": "newsreader", "sans": "inter"}[aile]
    dosya = f"{'Newsreader' if aile == 'serif' else 'Inter'}_{agirlik}.ttf"
    return ImageFont.truetype(str(NM / f"@expo-google-fonts/{ad}/{agirlik}/{dosya}"), boyut)


_IKON_FONT = str(NM / "@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf")
_IKON_HARITA = json.loads(
    (NM / "@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json").read_text()
)


def ikon(d: ImageDraw.ImageDraw, ad: str, merkez: tuple[int, int], boyut: int, renk) -> None:
    f = ImageFont.truetype(_IKON_FONT, boyut)
    d.text(merkez, chr(_IKON_HARITA[ad]), font=f, fill=renk, anchor="mm")


def zemin(ust, alt) -> Image.Image:
    """Dikey yumuşak degrade."""
    im = Image.new("RGB", (W, H), ust)
    d = ImageDraw.Draw(im)
    for y in range(H):
        t = y / (H - 1)
        d.line([(0, y), (W, y)], fill=tuple(round(ust[i] + (alt[i] - ust[i]) * t) for i in range(3)))
    return im


def golge_yapistir(tuval: Image.Image, parca: Image.Image, xy, yaricap: int, bulanik=40, koyuluk=70, dy=24):
    """Parçayı yuvarlatılmış köşe + yumuşak gölgeyle yapıştırır."""
    w, h = parca.size
    maske = Image.new("L", (w, h), 0)
    ImageDraw.Draw(maske).rounded_rectangle([0, 0, w - 1, h - 1], yaricap, fill=255)
    pay = bulanik * 3
    g = Image.new("L", (w + 2 * pay, h + 2 * pay), 0)
    ImageDraw.Draw(g).rounded_rectangle([pay, pay, pay + w, pay + h], yaricap, fill=koyuluk)
    g = g.filter(ImageFilter.GaussianBlur(bulanik))
    siyah = Image.new("RGB", g.size, (40, 20, 10))
    tuval.paste(siyah, (xy[0] - pay, xy[1] - pay + dy), g)
    tuval.paste(parca, xy, maske)


def cihaz(tuval: Image.Image, ekran: Image.Image, x: int, y: int, genislik: int) -> None:
    """Çerçeveli telefon; alt kenar tuvalin dışına taşabilir."""
    cer = 22
    ek = ekran.resize((genislik, round(ekran.height * genislik / ekran.width)), Image.LANCZOS)
    govde = Image.new("RGB", (genislik + 2 * cer, ek.height + 2 * cer), (24, 24, 26))
    m = Image.new("L", ek.size, 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, ek.width - 1, ek.height - 1], 62, fill=255)
    govde.paste(ek, (cer, cer), m)
    # ön kamera deliği
    ImageDraw.Draw(govde).ellipse(
        [govde.width // 2 - 13, cer + 22, govde.width // 2 + 13, cer + 48], fill=(14, 14, 16)
    )
    golge_yapistir(tuval, govde, (x, y), 84, bulanik=50, koyuluk=90, dy=30)


def ham(ad: str) -> Image.Image:
    return Image.open(HAM / f"{ad}.png").convert("RGB")


def kirp(ad: str, kutu) -> Image.Image:
    return ham(ad).crop(kutu)


def baslik(tuval: Image.Image, satirlar: list[str], alt: str, renk=YAZI, alt_renk=SOLUK,
           vurgu: str | None = None, vurgu_renk=TURUNCU, y0: int = 150) -> None:
    """Ortalanmış serif başlık (vurgulanan kelime renkli) + Inter alt metin."""
    d = ImageDraw.Draw(tuval)
    fb = font("serif", "700Bold", 92)
    y = y0
    for satir in satirlar:
        # satırı kelime kelime çiz — vurgu kelimesi farklı renkte
        kelimeler = satir.split(" ")
        bosluk = d.textlength(" ", font=fb)
        toplam = sum(d.textlength(k, font=fb) for k in kelimeler) + bosluk * (len(kelimeler) - 1)
        x = (W - toplam) / 2
        for k in kelimeler:
            r = vurgu_renk if vurgu and k.strip(",.?") == vurgu else renk
            d.text((x, y), k, font=fb, fill=r)
            x += d.textlength(k, font=fb) + bosluk
        y += 104
    fa = font("sans", "500Medium", 38)
    d.multiline_text((W / 2, y + 30), alt, font=fa, fill=alt_renk, anchor="ma", align="center", spacing=14)


def kart(w: int, h: int, renk=BEYAZ) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    k = Image.new("RGB", (w, h), renk)
    return k, ImageDraw.Draw(k)


def statu_temizle(ekran: Image.Image) -> Image.Image:
    """Kayıt sırasında durum çubuğundaki yeşil mikrofon göstergesini sil."""
    e = ekran.copy()
    ImageDraw.Draw(e).rectangle([820, 20, 1060, 110], fill=KREM)
    return e


# ---------------------------------------------------------------- kareler

def kare1() -> Image.Image:
    """Ana kare: sesli kayıt."""
    t = zemin(TURUNCU, TURUNCU_KOYU)
    baslik(t, ["Söyle,", "yapay zeka kaydetsin."],
           "Harcamanı sesli anlat; tutar, kategori\nve tarih saniyeler içinde hazır.",
           renk=BEYAZ, alt_renk=(255, 228, 216))
    cihaz(t, statu_temizle(ham("kayit")), 175, 585, 686)

    # Konuşma balonu — söylenen cümle
    b, d = kart(700, 150)
    ikon(d, "mic", (70, 75), 46, TURUNCU)
    d.text((120, 40), "Söylediğin", font=font("sans", "600SemiBold", 26), fill=SOLUK)
    d.text((120, 74), "“Market 850, benzin 1200, kahve 95”",
           font=font("sans", "700Bold", 30), fill=YAZI)
    golge_yapistir(t, b, (40, 860), 34)

    # Bulunan kayıtlar
    satirlar = [("cart", (232, 93, 140), "Market", "Market", "850 ₺"),
                ("car", (80, 110, 170), "Benzin", "Ulaşım", "1.200 ₺"),
                ("cafe", (110, 90, 200), "Kahve", "Kafe/Restoran", "95 ₺")]
    k, d = kart(760, 120 + 104 * len(satirlar))
    d.text((40, 36), "3 kayıt bulundu", font=font("sans", "700Bold", 30), fill=YAZI)
    ikon(d, "checkmark-circle", (712, 54), 40, (46, 160, 90))
    for i, (ik, rk, ad, kat, tutar) in enumerate(satirlar):
        y = 108 + i * 104
        d.rounded_rectangle([40, y, 116, y + 76], 20, fill=tuple(round(c * 0.16 + 255 * 0.84) for c in rk))
        ikon(d, ik, (78, y + 38), 38, rk)
        d.text((140, y + 6), ad, font=font("sans", "700Bold", 32), fill=YAZI)
        d.text((140, y + 46), kat, font=font("sans", "500Medium", 25), fill=SOLUK)
        d.text((720, y + 22), tutar, font=font("sans", "700Bold", 32), fill=YAZI, anchor="ra")
    golge_yapistir(t, k, (280, 1486), 36)
    return t


def kare2() -> Image.Image:
    t = zemin(KREM, SEFTALI)
    baslik(t, ["Kontrol", "her zaman sende."],
           "Bulunan tutarı, kategoriyi ve tarihi\ntek dokunuşla düzelt, onayla.", vurgu="sende")
    cihaz(t, ham("onay1"), 175, 640, 686)
    return t


def kare3() -> Image.Image:
    t = zemin(KREM, SEFTALI)
    baslik(t, ["Paran nereye gidiyor?", "Tek bakışta."],
           "Aylık toplamın ve kategori dağılımın\nana ekranında seni bekliyor.", vurgu="Tek")
    cihaz(t, ham("home"), 175, 640, 686)
    # Toplam kartı — yüzen
    ust = kirp("home", (40, 462, 1040, 892))
    ust = ust.resize((800, round(ust.height * 800 / ust.width)), Image.LANCZOS)
    golge_yapistir(t, ust, (140, 1020), 40)
    return t


def kare4() -> Image.Image:
    t = zemin(KREM, SEFTALI)
    baslik(t, ["Bütçeni koy,", "sınırda kal."],
           "Aylık sınır ve kategori limitleriyle\nharcamanı kontrol altında tut.", vurgu="sınırda")
    cihaz(t, ham("hedef"), 175, 640, 686)
    satir = kirp("hedef", (40, 1248, 1040, 1448))
    satir = satir.resize((860, round(satir.height * 860 / satir.width)), Image.LANCZOS)
    golge_yapistir(t, satir, (110, 1420), 34)
    return t


def kare5() -> Image.Image:
    t = zemin(KREM, SEFTALI)
    baslik(t, ["Sınıra yaklaşınca", "haber verir."],
           "Limit uyarıları, günlük ve haftalık\nözetler bildirim olarak gelir.", vurgu="haber")
    cihaz(t, ham("bildirim"), 175, 640, 686)
    uyari = kirp("bildirim", (24, 380, 1056, 585))
    uyari = uyari.resize((900, round(uyari.height * 900 / uyari.width)), Image.LANCZOS)
    golge_yapistir(t, uyari, (90, 1180), 34)
    return t


def kare6() -> Image.Image:
    """Güven karesi — cihaz yok, büyük tipografi + üç madde."""
    t = zemin(TURUNCU, TURUNCU_KOYU)
    d = ImageDraw.Draw(t)
    d.ellipse([W / 2 - 110, 400, W / 2 + 110, 620], fill=(255, 236, 228))
    ikon(d, "shield-checkmark", (W // 2, 510), 120, TURUNCU)
    baslik(t, ["Bankana bağlanmaz.", "Verin sende kalır."], "", renk=BEYAZ, y0=720)
    maddeler = [("card-outline", "Kart ya da hesap bilgisi istemez"),
                ("mic-off-outline", "Sesli kayıtların saklanmaz"),
                ("trash-outline", "Hesabını tek dokunuşla silebilirsin")]
    for i, (ik, yazi) in enumerate(maddeler):
        k, kd = kart(880, 130, (255, 241, 235))
        kd.rounded_rectangle([32, 27, 108, 103], 22, fill=BEYAZ)
        ikon(kd, ik, (70, 65), 40, TURUNCU)
        kd.text((136, 65), yazi, font=font("sans", "600SemiBold", 34), fill=YAZI, anchor="lm")
        golge_yapistir(t, k, (100, 1110 + i * 170), 32, koyuluk=45)
    return t


if __name__ == "__main__":
    for i, fn in enumerate([kare1, kare2, kare3, kare4, kare5, kare6], 1):
        yol = CIKTI / f"ekran-{i}.png"
        fn().save(yol, optimize=True)
        print(yol.relative_to(KOK))
