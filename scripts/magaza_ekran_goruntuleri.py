"""Play Store telefon ekran görüntüleri (1080×1920, 9:16) — ham emülatör görüntülerinden.

Girdi:  docs/magaza-gorselleri/ham/*.png  (Pixel 6 emülatörü, 1080×2400, test-ekran@ hesabı,
        sysui demo modu: saat 9:41, bildirim yok). Build 11 ile eklenenler (analiz1/2, hedef1/2,
        tekrar) Expo Go'da siyah durum çubuğuyla çekildi → `ham()` eski temiz çubuğu üstüne koyar.
Çıktı:  docs/magaza-gorselleri/ekran-1..8.png  (plan: docs/BUYUME-ANALIZI.md §1.6)

Örnek cümle bilerek 2 kayıt: Free planda günde 3 hak var; mağazadaki örnek tek denemede
hakkın hepsini bitirmesin.

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


STATU_YUKSEKLIK = 128
# Temiz durum çubuğu (9:41, wifi, pil) — eski ham görüntüden; arka planı ekrana göre boyanır
_STATU_KAYNAK = "home"


def _statu_seridi(zemin_renk) -> Image.Image:
    serit = Image.open(HAM / f"{_STATU_KAYNAK}.png").convert("RGB").crop((0, 0, W, STATU_YUKSEKLIK))
    # KREM'den belirgin farklı pikseller = ikon/yazı; geri kalanı ekranın kendi rengi
    fark = Image.eval(
        Image.merge("RGB", [c.point(lambda v, k=k: abs(v - k)) for c, k in zip(serit.split(), KREM, strict=True)]).convert("L"),
        lambda v: 255 if v > 24 else round(v * 255 / 24),
    )
    return Image.composite(serit, Image.new("RGB", serit.size, zemin_renk), fark)


def ham(ad: str) -> Image.Image:
    im = Image.open(HAM / f"{ad}.png").convert("RGB")
    if im.getpixel((540, 60)) == (0, 0, 0):  # Expo Go'nun siyah durum çubuğu
        im.paste(_statu_seridi(im.getpixel((540, STATU_YUKSEKLIK + 6))), (0, 0))
    return im


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
    d.text((120, 74), "“Market 850, dün benzin 1200”",
           font=font("sans", "700Bold", 30), fill=YAZI)
    # Balon, ham görüntüdeki eski Pro hesabın "Sınırsız kayıt hakkı" şeridini de örter
    golge_yapistir(t, b, (40, 748), 34)

    # Bulunan kayıtlar (2 — bkz modül notu)
    satirlar = [("cart", (232, 93, 140), "Market", "Market · bugün", "850 ₺"),
                ("car", (80, 110, 170), "Benzin", "Ulaşım · dün", "1.200 ₺")]
    k, d = kart(760, 120 + 104 * len(satirlar))
    d.text((40, 36), f"{len(satirlar)} kayıt bulundu", font=font("sans", "700Bold", 30), fill=YAZI)
    ikon(d, "checkmark-circle", (712, 54), 40, (46, 160, 90))
    for i, (ik, rk, ad, kat, tutar) in enumerate(satirlar):
        y = 108 + i * 104
        d.rounded_rectangle([40, y, 116, y + 76], 20, fill=tuple(round(c * 0.16 + 255 * 0.84) for c in rk))
        ikon(d, ik, (78, y + 38), 38, rk)
        d.text((140, y + 6), ad, font=font("sans", "700Bold", 32), fill=YAZI)
        d.text((140, y + 46), kat, font=font("sans", "500Medium", 25), fill=SOLUK)
        d.text((720, y + 22), tutar, font=font("sans", "700Bold", 32), fill=YAZI, anchor="ra")
    golge_yapistir(t, k, (280, 1530), 36)
    return t


def kare_analiz() -> Image.Image:
    t = zemin(KREM, SEFTALI)
    baslik(t, ["Paran nereye gidiyor?", "Tek bakışta."],
           "Her kategoride geçen aya göre\nyüzde kaç arttı ya da azaldı.", vurgu="Tek")
    cihaz(t, ham("analiz2"), 175, 640, 686)
    satir = kirp("analiz2", (42, 885, 1038, 1100))
    satir = satir.resize((900, round(satir.height * 900 / satir.width)), Image.LANCZOS)
    golge_yapistir(t, satir, (90, 1240), 34)
    return t


def kare_limit_hedef() -> Image.Image:
    t = zemin(KREM, SEFTALI)
    baslik(t, ["Limit mi, hedef mi?", "Sen seç."],
           "Harcamaya üst sınır, birikime hedef.\nHer kategori için ayrı.", vurgu="seç")
    cihaz(t, ham("hedef2"), 175, 640, 686)
    limit = kirp("hedef2", (42, 415, 1038, 617))
    limit = limit.resize((900, round(limit.height * 900 / limit.width)), Image.LANCZOS)
    golge_yapistir(t, limit, (90, 1130), 34)
    hedef = kirp("hedef1", (84, 1618, 996, 1820)).resize((900, 199), Image.LANCZOS)
    d = ImageDraw.Draw(hedef)
    # Yatırım satırında rozet yok — mağaza görselinde iki türü yan yana göstermek için "HEDEF" rozeti
    d.rounded_rectangle([390, 34, 512, 82], 24, fill=BEYAZ)
    d.text((451, 58), "HEDEF", font=font("sans", "700Bold", 24), fill=TURUNCU, anchor="mm")
    golge_yapistir(t, hedef, (90, 1400), 34)
    return t


def kare_onay() -> Image.Image:
    t = zemin(KREM, SEFTALI)
    baslik(t, ["Kontrol", "her zaman sende."],
           "Bulunan tutarı, kategoriyi ve tarihi\ntek dokunuşla düzelt, onayla.", vurgu="sende")
    cihaz(t, ham("onay1"), 175, 640, 686)
    return t


def kare_tekrar() -> Image.Image:
    t = zemin(KREM, SEFTALI)
    baslik(t, ["Kira, fatura, maaş", "kendiliğinden."],
           "Her ay aynı gün otomatik eklenir;\nbir daha elle girmezsin.", vurgu="kendiliğinden.")
    cihaz(t, ham("tekrar"), 175, 640, 686)
    satirlar = kirp("tekrar", (42, 938, 1038, 1518))
    satirlar = satirlar.resize((880, round(satirlar.height * 880 / satirlar.width)), Image.LANCZOS)
    golge_yapistir(t, satirlar, (100, 1250), 40)
    return t


def kare_bildirim() -> Image.Image:
    t = zemin(KREM, SEFTALI)
    baslik(t, ["Sınıra yaklaşınca", "haber verir."],
           "Limit uyarıları, günlük ve haftalık\nözetler bildirim olarak gelir.", vurgu="haber")
    cihaz(t, ham("bildirim"), 175, 640, 686)
    uyari = kirp("bildirim", (24, 380, 1056, 585))
    uyari = uyari.resize((900, round(uyari.height * 900 / uyari.width)), Image.LANCZOS)
    golge_yapistir(t, uyari, (90, 1180), 34)
    return t


def kare_disa_aktar() -> Image.Image:
    t = zemin(KREM, SEFTALI)
    baslik(t, ["Excel ve PDF", "dökümün hazır."],
           "İstediğin tarih aralığı, tüm kayıtlar\nya da tek kategori. (Pro)", vurgu="hazır.")
    cihaz(t, ham("analiz1"), 175, 640, 686)
    buton = kirp("analiz1", (42, 717, 1038, 892))
    buton = buton.resize((900, round(buton.height * 900 / buton.width)), Image.LANCZOS)
    golge_yapistir(t, buton, (90, 1080), 34)
    # Biçim seçimi penceresi — uygulamadaki "Dışa aktar" uyarısının sade çizimi
    k, d = kart(760, 420)
    d.text((48, 40), "Dışa aktar", font=font("serif", "700Bold", 44), fill=YAZI)
    d.text((48, 104), "Tüm kayıtlar · 1 – 30 Kasım", font=font("sans", "500Medium", 28), fill=SOLUK)
    for i, (ik, ad, alt) in enumerate([("grid-outline", "Excel (.xlsx)", "Tabloda düzenle"),
                                       ("document-text-outline", "PDF", "Yazdır, paylaş")]):
        y = 170 + i * 118
        d.rounded_rectangle([40, y, 720, y + 100], 26, fill=(250, 240, 234))
        ikon(d, ik, (100, y + 50), 40, TURUNCU)
        d.text((150, y + 18), ad, font=font("sans", "700Bold", 32), fill=YAZI)
        d.text((150, y + 58), alt, font=font("sans", "500Medium", 24), fill=SOLUK)
    golge_yapistir(t, k, (260, 1420), 36)
    return t


def kare_gizlilik() -> Image.Image:
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


# Sıra: ilk 3 kare en önemlisi (çoğu kullanıcı 3.'den sonra kaydırmaz) — ses → analiz → limit/hedef
KARELER = [kare1, kare_analiz, kare_limit_hedef, kare_onay, kare_tekrar, kare_bildirim, kare_disa_aktar,
           kare_gizlilik]


if __name__ == "__main__":
    for eski in CIKTI.glob("ekran-*.png"):
        eski.unlink()
    for i, fn in enumerate(KARELER, 1):
        yol = CIKTI / f"ekran-{i}.png"
        fn().save(yol, optimize=True)
        print(yol.relative_to(KOK))
