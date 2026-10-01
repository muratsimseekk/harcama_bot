"""Tarayıcıda açılan küçük Türkçe sayfalar (uygulama dışı).

Supabase e-posta bağlantılarının dönüş adresleri. Supabase doğrulamayı kendi sunucusunda
yapar, sonra kullanıcıyı buraya yönlendirir. Eskiden doğrudan `paraizi:///…`'ya gidiyordu —
bilgisayarda (veya uygulama kurulu değilken) tarayıcı boş sayfada kalıyordu.

- `/dogrulandi`: kayıt doğrulaması — her durumda "doğrulandı" der.
- `/sifre-yenile`: şifre sıfırlama — PKCE gereği yeni şifre YALNIZ isteğin yapıldığı
  telefondaki uygulamada belirlenebilir; bilgisayarda "telefonundan aç" der.

Telefonda sayfa uygulamayı otomatik açmayı dener (`?code=` uygulamaya geçer, aynı cihazda
oturum/şifre ekranı açılır); açılmazsa düğme kalır.
"""
from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import HTMLResponse

router = APIRouter(tags=["sayfalar"])

_SABLON = """<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>__BASLIK__ · Paraİzi</title>
<style>
  :root { color-scheme: light dark; --bg:#FAF8F5; --kart:#FFFFFF; --yazi:#1F1E1D; --soluk:#6B675F; --aksan:#D97757; --isaret:__ISARET_RENK__; }
  @media (prefers-color-scheme: dark) { :root { --bg:#1F1E1D; --kart:#2A2826; --yazi:#F0EEE6; --soluk:#A8A398; } }
  * { box-sizing: border-box; }
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
         background:var(--bg); color:var(--yazi); padding:16px;
         font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  .kart { background:var(--kart); border-radius:24px; padding:40px 28px; max-width:420px; width:100%;
          text-align:center; box-shadow:0 8px 30px rgba(0,0,0,.08); }
  .isaret { width:72px; height:72px; border-radius:50%; background:var(--isaret); color:#fff;
            display:flex; align-items:center; justify-content:center; font-size:36px; margin:0 auto 20px; }
  h1 { font-size:24px; margin:0 0 10px; }
  p { color:var(--soluk); line-height:1.5; margin:0 0 24px; font-size:16px; }
  a.buton { display:inline-block; background:var(--aksan); color:#fff; text-decoration:none;
            font-weight:700; padding:14px 28px; border-radius:999px; font-size:16px; }
  .not { font-size:13px; margin:18px 0 0; }
  .gizli { display:none; }
</style>
</head>
<body>
  <main class="kart">
    <div class="isaret" aria-hidden="true">__ISARET__</div>
    <h1 id="baslik">__BASLIK__</h1>
    <p id="metin">__MASAUSTU_METIN__</p>
    <a id="ac" class="buton gizli" href="paraizi:///__YOL__">__BUTON__</a>
    <p id="not" class="not">__MASAUSTU_NOT__</p>
  </main>
<script>
  (function () {
    var mobil = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (!mobil) return;
    var kod = new URLSearchParams(location.search).get("code");
    var hedef = "paraizi:///__YOL__";
    if (kod && /^[A-Za-z0-9-]{8,128}$/.test(kod)) hedef += "?code=" + encodeURIComponent(kod);
    var a = document.getElementById("ac");
    a.href = hedef;
    a.classList.remove("gizli");
    document.getElementById("metin").textContent = "__MOBIL_METIN__";
    document.getElementById("not").textContent = "Uygulama açılmazsa düğmeye dokun.";
    // Uygulamayı kendiliğinden açmayı dene (aynı cihazdaysa oturum/şifre ekranı açılır).
    setTimeout(function () { location.href = hedef; }, 300);
  })();
</script>
</body>
</html>
"""


def _sayfa(*, baslik: str, isaret: str, isaret_renk: str, yol: str, buton: str,
           masaustu_metin: str, masaustu_not: str, mobil_metin: str) -> str:
    return (
        _SABLON.replace("__BASLIK__", baslik)
        .replace("__ISARET_RENK__", isaret_renk)
        .replace("__ISARET__", isaret)
        .replace("__YOL__", yol)
        .replace("__BUTON__", buton)
        .replace("__MASAUSTU_METIN__", masaustu_metin)
        .replace("__MASAUSTU_NOT__", masaustu_not)
        .replace("__MOBIL_METIN__", mobil_metin)
    )


_DOGRULANDI = _sayfa(
    baslik="E-postan doğrulandı",
    isaret="✓",
    isaret_renk="#5E8C6A",
    yol="",
    buton="Uygulamayı aç",
    masaustu_metin="Hesabın hazır. Paraİzi uygulamasına dönüp e-posta ve şifrenle giriş yapabilirsin.",
    masaustu_not="Bu sayfayı kapatabilirsin.",
    mobil_metin="Hesabın hazır. Paraİzi açılıyor…",
)

_SIFRE_YENILE = _sayfa(
    baslik="Şifreni yenile",
    isaret="🔑",
    isaret_renk="#D97757",
    yol="sifre-yenile",
    buton="Paraİzi'de aç",
    masaustu_metin=(
        "Güvenliğin için yeni şifreni yalnızca Paraİzi uygulamasında belirleyebilirsin. "
        "Bu e-postayı, şifre sıfırlamayı istediğin telefondaki e-posta uygulamasından aç "
        "ve bağlantıya oradan dokun."
    ),
    masaustu_not="Bu sayfayı kapatabilirsin.",
    mobil_metin="Paraİzi açılıyor — yeni şifreni orada belirleyeceksin.",
)

_BASLIKLAR = {"Cache-Control": "no-store"}


@router.get("/dogrulandi", response_class=HTMLResponse, include_in_schema=False)
async def dogrulandi() -> HTMLResponse:
    return HTMLResponse(_DOGRULANDI, headers=_BASLIKLAR)


@router.get("/sifre-yenile", response_class=HTMLResponse, include_in_schema=False)
async def sifre_yenile() -> HTMLResponse:
    return HTMLResponse(_SIFRE_YENILE, headers=_BASLIKLAR)
