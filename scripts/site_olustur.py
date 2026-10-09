"""nimustudio.com statik sitesini üretir (GitHub Pages ile yayınlanır).

Kaynak: docs/gizlilik-politikasi.md + docs/kullanim-kosullari.md (tek kaynak — metni
orada değiştir, sonra bunu çalıştır). Çıktı: site/

    python scripts/site_olustur.py
    (sonra site/ içeriğini public "nimustudio-site" reposuna gönder — GitHub Pages)

Yalnız bu iki dosyanın kullandığı Markdown alt kümesini çevirir: başlık, paragraf,
liste, tablo, alıntı, **kalın**, [bağlantı](adres).
"""

import html
import re
from pathlib import Path

KOK = Path(__file__).resolve().parent.parent
DOCS = KOK / "docs"
SITE = KOK / "site"

ADMOB_PUB = "pub-8731282143908044"
EPOSTA = "info@nimustudio.com"

# docs/ içindeki göreli bağlantılar sitede şu adreslere gider
BAGLANTI = {
    "gizlilik-politikasi.md": "/paraizi/gizlilik",
    "kullanim-kosullari.md": "/paraizi/kosullar",
}


def satir_ici(metin: str) -> str:
    metin = html.escape(metin, quote=False)
    metin = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", metin)
    metin = re.sub(
        r"\[([^\]]+)\]\(([^)]+)\)",
        lambda m: f'<a href="{BAGLANTI.get(m.group(2), m.group(2))}">{m.group(1)}</a>',
        metin,
    )
    metin = re.sub(r"\b(nimustudio\.com/[\w/-]+)", r'<a href="https://\1">\1</a>', metin)
    return metin


def md_html(md: str) -> str:
    cikti: list[str] = []
    paragraf: list[str] = []
    liste: list[str] = []
    tablo: list[list[str]] = []

    def bosalt():
        if paragraf:
            # Kaynaktaki satır kaydırması boşluk olur; "**Alan:** değer" satırları alt alta kalır
            metin = satir_ici(paragraf[0]) + "".join(
                ("<br>" if s.startswith("**") else " ") + satir_ici(s) for s in paragraf[1:]
            )
            cikti.append(f"<p>{metin}</p>")
            paragraf.clear()
        if liste:
            cikti.append("<ul>" + "".join(f"<li>{satir_ici(s)}</li>" for s in liste) + "</ul>")
            liste.clear()
        if tablo:
            bas, *govde = [r for r in tablo if not re.fullmatch(r"[\s|:-]+", "|".join(r))]
            cikti.append(
                '<div class="tablo"><table><thead><tr>'
                + "".join(f"<th>{satir_ici(h)}</th>" for h in bas)
                + "</tr></thead><tbody>"
                + "".join(
                    "<tr>" + "".join(f"<td>{satir_ici(h)}</td>" for h in r) + "</tr>" for r in govde
                )
                + "</tbody></table></div>"
            )
            tablo.clear()

    for ham in md.splitlines():
        s = ham.rstrip()
        if not s.strip():
            bosalt()
        elif m := re.match(r"(#{1,3}) (.+)", s):
            bosalt()
            n = len(m.group(1))
            cikti.append(f"<h{n}>{satir_ici(m.group(2))}</h{n}>")
        elif s.startswith("|"):
            if paragraf or liste:
                bosalt()
            tablo.append([h.strip() for h in s.strip("|").split("|")])
        elif s.startswith("> "):
            bosalt()
            cikti.append(f"<blockquote>{satir_ici(s[2:])}</blockquote>")
        elif s.startswith("- "):
            if paragraf or tablo:
                bosalt()
            liste.append(s[2:])
        elif liste and s.startswith("  "):
            liste[-1] += " " + s.strip()
        else:
            if liste or tablo:
                bosalt()
            paragraf.append(s)
    bosalt()
    return "\n".join(cikti)


STIL = """
:root{--zemin:#FAF7F2;--yazi:#2B2622;--soluk:#6F665E;--vurgu:#D97757;--cizgi:#E7DFD5;--kart:#fff}
@media (prefers-color-scheme:dark){:root{--zemin:#1C1917;--yazi:#EDE7E0;--soluk:#A8A097;--cizgi:#3A342F;--kart:#26221F}}
*{box-sizing:border-box}
body{margin:0;background:var(--zemin);color:var(--yazi);font:16px/1.65 -apple-system,"Segoe UI",Roboto,sans-serif}
main{max-width:760px;margin:0 auto;padding:32px 16px 64px}
header{max-width:760px;margin:0 auto;padding:20px 16px 0;display:flex;gap:16px;align-items:baseline;flex-wrap:wrap}
header a{color:var(--soluk);text-decoration:none;font-size:14px}
header .marka{color:var(--yazi);font-weight:700;font-size:16px;margin-right:auto}
h1{font-size:28px;line-height:1.25;margin:8px 0 16px}
h2{font-size:20px;margin:32px 0 8px}
a{color:var(--vurgu)}
.tablo{overflow-x:auto;margin:12px 0}
table{border-collapse:collapse;width:100%;font-size:14px;background:var(--kart)}
th,td{border:1px solid var(--cizgi);padding:8px 10px;text-align:left;vertical-align:top}
blockquote{margin:12px 0;padding:8px 14px;border-left:3px solid var(--vurgu);color:var(--soluk)}
.kart{background:var(--kart);border:1px solid var(--cizgi);border-radius:12px;padding:16px 20px;margin:16px 0}
footer{color:var(--soluk);font-size:13px;margin-top:48px}
"""


def sayfa(baslik: str, govde: str) -> str:
    return f"""<!doctype html>
<html lang="tr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{html.escape(baslik)}</title><style>{STIL}</style></head>
<body><header><a class="marka" href="/">nimustudio</a>
<a href="/paraizi/gizlilik">Gizlilik</a><a href="/paraizi/kosullar">Koşullar</a>
<a href="/paraizi/hesap-silme">Hesap silme</a></header>
<main>{govde}
<footer>© nimustudio · Murat Şimşek · Şehitkamil / Gaziantep · <a href="mailto:{EPOSTA}">{EPOSTA}</a></footer>
</main></body></html>
"""


HESAP_SILME = f"""<h1>Paraİzi — Hesap ve veri silme</h1>
<p>Paraİzi hesabını ve tüm verilerini (işlemler, kategoriler, bütçeler, hedefler, hane
üyelikleri ve kimlik bilgileri) kalıcı olarak silebilirsin.</p>
<div class="kart"><h2>1. Uygulamadan (anında)</h2>
<p>Paraİzi'yi aç → <strong>Profil → Ayarlar → Hesabı Sil</strong> → onayla.
Hesabın ve tüm kayıtların hemen silinir.</p></div>
<div class="kart"><h2>2. Uygulamaya erişemiyorsan (e-posta ile)</h2>
<p><a href="mailto:{EPOSTA}?subject=Paraİzi%20hesap%20silme%20talebi">{EPOSTA}</a> adresine,
<strong>hesabına kayıtlı e-posta adresinden</strong> "Paraİzi hesap silme talebi" konulu bir
e-posta gönder. Kimliğini doğruladıktan sonra en geç <strong>30 gün</strong> içinde hesabını
ve tüm verilerini sileriz ve seni bilgilendiririz.</p></div>
<h2>Neler silinir, neler kalır?</h2>
<ul><li><strong>Silinir:</strong> e-posta, ad, tüm harcama/gelir kayıtları, kategoriler, bütçeler,
hedefler, bildirim jetonları, hane üyeliği. Yedeklerden de en geç 30 gün içinde silinir.</li>
<li><strong>Saklanmaz:</strong> ses kayıtları zaten işlendikten hemen sonra silinir.</li>
<li><strong>Kalabilir:</strong> Google Play üzerinden yapılan abonelik ödemelerinin kayıtları,
yasal zorunluluk gereği Google tarafından tutulur. Aboneliğini Google Play → Abonelikler'den
ayrıca iptal etmelisin; hesap silmek aboneliği otomatik iptal etmez.</li></ul>
"""

ANA = """<h1>nimustudio</h1>
<p>Bağımsız mobil uygulama stüdyosu.</p>
<div class="kart"><h2>Paraİzi</h2>
<p>Harcamalarını yazarak ya da sesle saniyeler içinde kaydet; bütçeni ve hedeflerini takip et.</p>
<p><a href="/paraizi/gizlilik">Gizlilik Politikası</a> ·
<a href="/paraizi/kosullar">Kullanım Koşulları</a> ·
<a href="/paraizi/hesap-silme">Hesap silme</a></p></div>
"""


def yaz(yol: str, icerik: str):
    hedef = SITE / yol
    hedef.parent.mkdir(parents=True, exist_ok=True)
    hedef.write_text(icerik, encoding="utf-8", newline="\n")


def main():
    gizlilik = (DOCS / "gizlilik-politikasi.md").read_text(encoding="utf-8")
    kosullar = (DOCS / "kullanim-kosullari.md").read_text(encoding="utf-8")
    yaz("index.html", sayfa("nimustudio", ANA))
    yaz("paraizi/gizlilik/index.html", sayfa("Paraİzi — Gizlilik Politikası", md_html(gizlilik)))
    yaz("paraizi/kosullar/index.html", sayfa("Paraİzi — Kullanım Koşulları", md_html(kosullar)))
    yaz("paraizi/hesap-silme/index.html", sayfa("Paraİzi — Hesap silme", HESAP_SILME))
    yaz("app-ads.txt", f"google.com, {ADMOB_PUB}, DIRECT, f08c47fec0942fa0\n")
    print("site/ üretildi:", sorted(str(p.relative_to(SITE)) for p in SITE.rglob("*") if p.is_file()))


if __name__ == "__main__":
    main()
