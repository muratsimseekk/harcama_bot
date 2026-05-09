import os
import json
import tempfile
from datetime import datetime
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build
from groq import Groq
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.gridspec import GridSpec

SHEETS_ID = os.environ.get("GOOGLE_SHEETS_ID")
CREDENTIALS_JSON = os.environ.get("GOOGLE_CREDENTIALS_JSON")
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")

SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]

AYLAR_TR = {
    1: "Ocak", 2: "Şubat", 3: "Mart", 4: "Nisan",
    5: "Mayıs", 6: "Haziran", 7: "Temmuz", 8: "Ağustos",
    9: "Eylül", 10: "Ekim", 11: "Kasım", 12: "Aralık"
}
AYLAR_TR_TERS = {v.lower(): k for k, v in AYLAR_TR.items()}

TIP_RENK = {
    "kisisel": "#2563EB",
    "isletme": "#16A34A",
    "yatirim": "#9333EA",
}


def _sheets_baglantisi():
    credentials_bilgi = json.loads(CREDENTIALS_JSON)
    credentials = Credentials.from_service_account_info(credentials_bilgi, scopes=SCOPES)
    service = build("sheets", "v4", credentials=credentials)
    return service.spreadsheets()


def _ay_coz(ay_str: str, bugun: datetime) -> tuple:
    ay_str = ay_str.lower().strip()
    if ay_str in ("geçen ay", "gecen ay", "önceki ay", "onceki ay"):
        if bugun.month == 1:
            return 12, bugun.year - 1
        return bugun.month - 1, bugun.year
    if ay_str == "bu ay":
        return bugun.month, bugun.year
    for ad, no in AYLAR_TR_TERS.items():
        if ad in ay_str:
            return no, bugun.year
    return bugun.month, bugun.year


def _sayfa_verilerini_al(sheets, sayfa_adi: str) -> list:
    try:
        result = sheets.values().get(
            spreadsheetId=SHEETS_ID,
            range=f"'{sayfa_adi}'!A:H"
        ).execute()
        rows = result.get("values", [])
        if len(rows) < 2:
            return []
        harcamalar = []
        for row in rows[1:]:
            if len(row) >= 7:
                try:
                    tutar_str = str(row[6]).replace(",", ".").replace("₺", "").strip()
                    tutar = float(tutar_str)
                    harcamalar.append({
                        "tarih":    row[0] if len(row) > 0 else "",
                        "gun":      row[1] if len(row) > 1 else "",
                        "saat":     row[2] if len(row) > 2 else "",
                        "aciklama": row[3] if len(row) > 3 else "",
                        "kategori": row[4] if len(row) > 4 else "",
                        "tip":      row[5] if len(row) > 5 else "",
                        "tutar":    tutar,
                    })
                except (ValueError, IndexError):
                    continue
        return harcamalar
    except Exception as e:
        print(f"Sayfa okuma hatası ({sayfa_adi}): {e}")
        return []


def _tip_normalize(tip_str: str) -> str:
    t = tip_str.lower().strip()
    if "yat" in t:
        return "yatirim"
    if "let" in t:
        return "isletme"
    return "kisisel"


async def soruyu_analiz_et(soru: str):
    bugun = datetime.now()
    bugun_str = bugun.strftime("%d.%m.%Y")
    client = Groq(api_key=GROQ_API_KEY)

    sistem = f"""Sen bir harcama/yatirim analiz asistanisin. Bugun: {bugun_str}

Kullanicinin sorusunu analiz et ve SADECE su JSON formatinda yanit ver:
{{
  "mod": "ay veya yil",
  "ay": "ay adi veya gecen ay veya bu ay",
  "yil": {bugun.year},
  "tip_filtre": "kisisel veya isletme veya yatirim veya hepsi",
  "kategori_anahtar_kelimeler": [],
  "soru_ozet": "kisa ozet"
}}

MOD: "gecen yil", "bu yil", "2025 yili", "yillik" -> mod: "yil". Diger -> mod: "ay"
TIP: "yatirim","BES","hisse","kripto","altin","emeklilik","fon" -> "yatirim"
     "kisisel","sahsi" -> "kisisel"
     "isletme","dukkan","fabrika" -> "isletme"
     Belirtilmemisse -> "hepsi"
"""

    try:
        yanit = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": sistem},
                {"role": "user", "content": soru}
            ],
            temperature=0.1,
            max_tokens=400
        )
        yanit_metni = yanit.choices[0].message.content.strip()
        if "```" in yanit_metni:
            yanit_metni = yanit_metni.split("```")[1]
            if yanit_metni.startswith("json"):
                yanit_metni = yanit_metni[4:].strip()
        return json.loads(yanit_metni)
    except Exception as e:
        print(f"Soru analiz hatasi: {e}")
        return None


def _harcamalari_filtrele(harcamalar: list, analiz: dict) -> list:
    sonuc = []
    tip_filtre = analiz.get("tip_filtre", "hepsi").lower()
    anahtar_kelimeler = [k.lower() for k in analiz.get("kategori_anahtar_kelimeler", [])]

    for h in harcamalar:
        tip_norm = _tip_normalize(h["tip"])
        if tip_filtre != "hepsi" and tip_norm != tip_filtre:
            continue
        if anahtar_kelimeler:
            metin = (h["aciklama"] + " " + h["kategori"]).lower()
            if not any(k in metin for k in anahtar_kelimeler):
                continue
        sonuc.append(h)
    return sonuc


def _rapor_png_olustur(harcamalar: list, analiz: dict, baslik_str: str) -> str:
    kategori_toplam = {}
    gun_toplam = {}
    tip_toplam = {"kisisel": 0.0, "isletme": 0.0, "yatirim": 0.0}

    for h in harcamalar:
        kat = h["kategori"] if h["kategori"] else "Diger"
        kategori_toplam[kat] = kategori_toplam.get(kat, 0) + h["tutar"]
        gun_toplam[h["tarih"]] = gun_toplam.get(h["tarih"], 0) + h["tutar"]
        tip_norm = _tip_normalize(h["tip"])
        tip_toplam[tip_norm] = tip_toplam.get(tip_norm, 0) + h["tutar"]

    genel_toplam = sum(h["tutar"] for h in harcamalar)
    renkler = ["#2563EB","#7C3AED","#DB2777","#EA580C","#D97706","#16A34A","#0891B2","#64748B","#DC2626","#9333EA"]

    fig = plt.figure(figsize=(12, 15), facecolor="#F8FAFC")
    gs = GridSpec(4, 2, figure=fig, hspace=0.5, wspace=0.35, top=0.93, bottom=0.05, left=0.08, right=0.95)

    fig.suptitle(
        f"HARCAMA & YATIRIM RAPORU\n{baslik_str}  -  {analiz.get('soru_ozet', '')}",
        fontsize=15, fontweight="bold", color="#1E293B", y=0.97, linespacing=1.6
    )

    # Ozet kutular
    ax0 = fig.add_subplot(gs[0, :])
    ax0.axis("off")
    ax0.set_xlim(0, 1)
    ax0.set_ylim(0, 1)
    tip_bilgi = [
        ("Kisisel",  tip_toplam["kisisel"], "#2563EB"),
        ("Isletme",  tip_toplam["isletme"], "#16A34A"),
        ("Yatirim",  tip_toplam["yatirim"], "#9333EA"),
    ]
    for idx, (etiket, tutar, renk) in enumerate(tip_bilgi):
        x = 0.04 + idx * 0.33
        ax0.add_patch(mpatches.FancyBboxPatch(
            (x, 0.1), 0.28, 0.75, boxstyle="round,pad=0.02",
            facecolor=renk, transform=ax0.transAxes, zorder=1, alpha=0.9
        ))
        ax0.text(x + 0.14, 0.65, etiket, ha="center", va="center",
                 fontsize=11, color="white", fontweight="bold", transform=ax0.transAxes)
        ax0.text(x + 0.14, 0.28, f"{tutar:,.0f} TL", ha="center", va="center",
                 fontsize=13, color="white", fontweight="bold", transform=ax0.transAxes)

    # Cubuk grafik
    ax1 = fig.add_subplot(gs[1, :])
    ax1.set_facecolor("#F1F5F9")
    kategoriler = sorted(kategori_toplam.keys(), key=lambda x: kategori_toplam[x], reverse=True)
    tutarlar = [kategori_toplam[k] for k in kategoriler]
    bar_renkler = [renkler[i % len(renkler)] for i in range(len(kategoriler))]
    bars = ax1.barh(kategoriler, tutarlar, color=bar_renkler, height=0.6, edgecolor="white", linewidth=1.5)
    for bar, tutar in zip(bars, tutarlar):
        ax1.text(bar.get_width() + max(tutarlar) * 0.01, bar.get_y() + bar.get_height() / 2,
                 f"{tutar:,.0f} TL", va="center", ha="left", fontsize=10, color="#1E293B", fontweight="bold")
    ax1.set_title("Kategoriye Gore", fontsize=12, fontweight="bold", color="#1E293B", pad=10)
    ax1.tick_params(colors="#374151", labelsize=10)
    ax1.spines[["top", "right", "left"]].set_visible(False)
    ax1.set_xlim(0, max(tutarlar) * 1.18)
    ax1.grid(axis="x", alpha=0.3, color="#CBD5E1")

    # Pasta
    ax2 = fig.add_subplot(gs[2, 0])
    ax2.set_facecolor("#F8FAFC")
    wedges, texts, autotexts = ax2.pie(
        tutarlar, labels=None, colors=bar_renkler,
        autopct=lambda pct: f"%{pct:.1f}" if pct > 4 else "",
        startangle=90, wedgeprops={"edgecolor": "white", "linewidth": 2}
    )
    for at in autotexts:
        at.set_fontsize(8); at.set_color("white"); at.set_fontweight("bold")
    legend_labels = [f"{k} ({kategori_toplam[k]:,.0f} TL)" for k in kategoriler]
    ax2.legend(wedges, legend_labels, loc="lower center", bbox_to_anchor=(0.5, -0.25),
               fontsize=7.5, ncol=2, frameon=False)
    ax2.set_title("Kategori Dagilimi", fontsize=12, fontweight="bold", color="#1E293B", pad=10)

    # Zaman grafigi
    ax3 = fig.add_subplot(gs[2, 1])
    ax3.set_facecolor("#F1F5F9")
    if gun_toplam:
        def tarih_sirala(t):
            try: return datetime.strptime(t, "%d.%m.%Y")
            except: return datetime.min
        gunler_sirali = sorted(gun_toplam.keys(), key=tarih_sirala)
        gun_etiketleri = [g[:5] if len(g) >= 5 else g for g in gunler_sirali]
        gun_tutarlar = [gun_toplam[g] for g in gunler_sirali]
        ax3.bar(range(len(gun_etiketleri)), gun_tutarlar, color="#7C3AED", alpha=0.85, edgecolor="white")
        ax3.set_xticks(range(len(gun_etiketleri)))
        ax3.set_xticklabels(gun_etiketleri, rotation=60, ha="right", fontsize=7)
        ax3.set_title("Tarihe Gore", fontsize=12, fontweight="bold", color="#1E293B", pad=10)
        ax3.spines[["top", "right"]].set_visible(False)
        ax3.grid(axis="y", alpha=0.3)

    # Detay liste
    ax4 = fig.add_subplot(gs[3, :])
    ax4.axis("off")
    ax4.set_xlim(0, 1)
    ax4.set_ylim(0, 1)
    ax4.text(0.0, 1.02, "Detay Listesi", fontsize=12, fontweight="bold",
             color="#1E293B", transform=ax4.transAxes)
    sutunlar = ["Tarih", "Aciklama", "Kategori", "Tip", "Tutar (TL)"]
    sutun_x  = [0.0, 0.15, 0.52, 0.70, 0.84]
    for sx, baslik in zip(sutun_x, sutunlar):
        ax4.text(sx, 0.95, baslik, fontsize=9, fontweight="bold",
                 color="#64748B", transform=ax4.transAxes)
    ax4.plot([0, 1], [0.93, 0.93], color="#CBD5E1", linewidth=1,
             transform=ax4.transAxes, clip_on=False)

    satir_y = 0.88
    for i, h in enumerate(harcamalar[:18]):
        zemin = "#F1F5F9" if i % 2 == 0 else "#FFFFFF"
        ax4.add_patch(mpatches.FancyBboxPatch(
            (0, satir_y - 0.025), 1, 0.05, boxstyle="round,pad=0",
            facecolor=zemin, transform=ax4.transAxes, zorder=0
        ))
        tip_norm = _tip_normalize(h["tip"])
        tip_renk = TIP_RENK.get(tip_norm, "#1E293B")
        aciklama_k = h["aciklama"][:28] + "..." if len(h["aciklama"]) > 28 else h["aciklama"]
        kategori_k = h["kategori"][:18] + "..." if len(h["kategori"]) > 18 else h["kategori"]
        degerler = [h["tarih"], aciklama_k, kategori_k, h["tip"], f"{h['tutar']:,.2f} TL"]
        renk_listesi = ["#1E293B", "#1E293B", "#1E293B", tip_renk, "#1E293B"]
        for sx, deger, yazi_renk in zip(sutun_x, degerler, renk_listesi):
            ax4.text(sx, satir_y, deger, fontsize=8.5, color=yazi_renk,
                     transform=ax4.transAxes, va="center")
        satir_y -= 0.052
        if satir_y < 0.02:
            break

    if len(harcamalar) > 18:
        ax4.text(0.0, max(satir_y - 0.02, 0.01),
                 f"... ve {len(harcamalar) - 18} kayit daha",
                 fontsize=8, color="#94A3B8", transform=ax4.transAxes)

    fig.text(0.95, 0.02, f"TOPLAM: {genel_toplam:,.2f} TL  |  {len(harcamalar)} islem",
             ha="right", fontsize=12, fontweight="bold", color="white",
             bbox=dict(boxstyle="round,pad=0.5", facecolor="#1E293B", edgecolor="none"))

    tmp = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
    plt.savefig(tmp.name, dpi=150, bbox_inches="tight", facecolor=fig.get_facecolor())
    plt.close(fig)
    return tmp.name


async def rapor_olustur(soru: str):
    bugun = datetime.now()
    analiz = await soruyu_analiz_et(soru)
    if not analiz:
        return None, "Soru anlasilamadi. Lutfen tekrar deneyin."

    mod = analiz.get("mod", "ay")
    sheets = _sheets_baglantisi()

    if mod == "yil":
        yil = analiz.get("yil", bugun.year)
        tum_harcamalar = []
        for ay_no in range(1, 13):
            sayfa_adi = f"{AYLAR_TR[ay_no]} {yil}"
            tum_harcamalar.extend(_sayfa_verilerini_al(sheets, sayfa_adi))
        if not tum_harcamalar:
            return None, f"{yil} yilinda kayitli veri bulunamadi."
        filtrelenmis = _harcamalari_filtrele(tum_harcamalar, analiz)
        if not filtrelenmis:
            return None, f"{yil} yilinda kriter eslesmiyor."
        baslik_str = f"{yil} Yili"
    else:
        ay_no, yil = _ay_coz(analiz.get("ay", "bu ay"), bugun)
        ay_adi = f"{AYLAR_TR[ay_no]} {yil}"
        harcamalar = _sayfa_verilerini_al(sheets, ay_adi)
        if not harcamalar:
            return None, f"{ay_adi} ayinda kayitli harcama bulunamadi."
        filtrelenmis = _harcamalari_filtrele(harcamalar, analiz)
        if not filtrelenmis:
            return None, f"{ay_adi} ayinda kriter eslesmiyor. (Toplam {len(harcamalar)} kayit var)"
        baslik_str = ay_adi

    try:
        png_yolu = _rapor_png_olustur(filtrelenmis, analiz, baslik_str)
        toplam = sum(h["tutar"] for h in filtrelenmis)
        tip_filtre = analiz.get("tip_filtre", "hepsi")
        tip_emoji = {"yatirim": "💹", "isletme": "🏭", "kisisel": "👤"}.get(tip_filtre, "📊")
        mesaj = (
            f"{tip_emoji} *{baslik_str} - {analiz.get('soru_ozet', '')}*\n"
            f"🔢 {len(filtrelenmis)} kayit bulundu\n"
            f"💰 Toplam: *{toplam:,.2f} TL*"
        )
        return png_yolu, mesaj
    except Exception as e:
        return None, f"Rapor olusturulamadi: {e}"
