"""Tarayıcıda açılan küçük Türkçe sayfalar (uygulama dışı).

`/dogrulandi`: kayıt e-postasındaki doğrulama bağlantısının dönüş adresi. Supabase
doğrulamayı kendi sunucusunda yapar, sonra kullanıcıyı buraya yönlendirir. Eskiden doğrudan
`paraizi:///`'ya gidiyordu — bilgisayarda (veya uygulama kurulu değilken) tarayıcı boş
sayfada kalıyordu. Bu sayfa her durumda "doğrulandı" der; telefonda "Uygulamayı aç"
düğmesi PKCE kodunu uygulamaya geçirir (aynı cihazdaysa otomatik giriş yapılır).
"""
from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import HTMLResponse

router = APIRouter(tags=["sayfalar"])

_DOGRULANDI = """<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>E-posta doğrulandı · Paraİzi</title>
<style>
  :root { color-scheme: light dark; --bg:#FAF8F5; --kart:#FFFFFF; --yazi:#1F1E1D; --soluk:#6B675F; --aksan:#D97757; --yesil:#5E8C6A; }
  @media (prefers-color-scheme: dark) { :root { --bg:#1F1E1D; --kart:#2A2826; --yazi:#F0EEE6; --soluk:#A8A398; } }
  * { box-sizing: border-box; }
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
         background:var(--bg); color:var(--yazi); padding:16px;
         font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  .kart { background:var(--kart); border-radius:24px; padding:40px 28px; max-width:420px; width:100%;
          text-align:center; box-shadow:0 8px 30px rgba(0,0,0,.08); }
  .isaret { width:72px; height:72px; border-radius:50%; background:var(--yesil); color:#fff;
            display:flex; align-items:center; justify-content:center; font-size:38px; margin:0 auto 20px; }
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
    <div class="isaret" aria-hidden="true">✓</div>
    <h1>E-postan doğrulandı</h1>
    <p>Hesabın hazır. Paraİzi uygulamasına dönüp e-posta ve şifrenle giriş yapabilirsin.</p>
    <a id="ac" class="buton gizli" href="paraizi:///">Uygulamayı aç</a>
    <p id="masaustu" class="not">Bu sayfayı kapatabilirsin.</p>
  </main>
<script>
  // Telefondaysa "Uygulamayı aç" göster; ?code=... varsa uygulamaya geçir (aynı cihazda
  // otomatik giriş). Kodu sayfada göstermiyoruz, yalnız bağlantıya ekliyoruz.
  (function () {
    var mobil = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (!mobil) return;
    var kod = new URLSearchParams(location.search).get("code");
    var a = document.getElementById("ac");
    if (kod && /^[A-Za-z0-9-]{8,128}$/.test(kod)) a.href = "paraizi:///?code=" + encodeURIComponent(kod);
    a.classList.remove("gizli");
    document.getElementById("masaustu").textContent = "Uygulama açılmazsa, uygulamayı kendin açıp giriş yap.";
  })();
</script>
</body>
</html>
"""


@router.get("/dogrulandi", response_class=HTMLResponse, include_in_schema=False)
async def dogrulandi() -> HTMLResponse:
    return HTMLResponse(_DOGRULANDI, headers={"Cache-Control": "no-store"})
