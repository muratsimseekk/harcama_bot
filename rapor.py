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
import numpy as np

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


def _sheets_baglantisi():
    credentials_bilgi = json.loads(CREDENTIALS_JSON)
    credentials = Credentials.from_service_account_info(credentials_bilgi, scopes=SCOPES)
    service = build("sheets", "v4", credentials=credentials)
    return service.spreadsheets()


def _ay_coz(ay_str: str, bugun: datetime) -> tuple[int, int]:
    """
    'nisan', 'geçen ay', 'bu ay' gibi ifadeleri (ay, yıl) döndürür.
    """
    ay_str = ay_str.lower().strip()

    if ay_str in ("geçen ay", "gecen ay", "önceki ay", "onceki ay"):
        if bugun.month == 1:
            return 12, bugun.year - 1
        return bugun.month - 1, bugun.year

    if ay_str in ("bu ay", "bu ay"):
        return bugun.month, bugun.year

    for ad, no in AYLAR_TR_TERS.items():
        if ad in ay_str:
            return no, bugun.year

    return bugun.month, bugun.year


def _sayfa_verilerini_al(sheets, sayfa_adi: str) -> list[dict]:
    """Belirtilen ay sayfasından tüm harcama satırlarını çeker."""
    try:
        result = sheets.values().get(
            spreadsheetId=SHEETS_ID,
            range=f"'{sayfa_adi}'!A:H"
        ).execute()
        rows = result.get("values", [])
        if len(rows) < 2:
            return []

        harcamalar = []
        for row in rows[1:]:  # Başlık satırını atla
            if len(row) >= 7:
                try:
                    tutar_str = str(row[6]).replace(",", ".").replace("₺", "").strip()
                    tutar = float(tutar_str)
                    harcamalar.append({
                        "tarih": row[0] if len(row) > 0 else "",
                        "gun": row[1] if len(row) > 1 else "",
                        "saat": row[2] if len(row) > 2 else "",
                        "aciklama": row[3] if len(row) > 3 else "",
                        "kategori": row[4] if len(row) > 4 else "",
                        "tip": row[5] if len(row) > 5 else "",
                        "tutar": tutar,
                    })
                except (ValueError, IndexError):
                    continue
        return harcamalar
    except Exception as e:
        print(f"Sayfa okuma hatası: {e}")
        return []


async def soruyu_analiz_et(soru: str) -> dict | None:
    """
    Kullanıcının sorusunu analiz eder.
    Döndürür: {ay, yil, tip_filtre, kategori_filtreler, soru_ozet}
    """
    bugun = datetime.now()
    bugun_str = bugun.strftime("%d.%m.%Y")

    client = Groq(api_key=GROQ_API_KEY)
    sistem = f"""Sen bir harcama analiz asistanısın. Bugün: {bugun_str}

Kullanıcının sorusunu analiz et ve SADECE şu JSON formatında yanıt ver:
{{
  "ay": "ay adı veya 'geçen ay' veya 'bu ay'",
  "tip_filtre": "kisisel veya isletme veya hepsi",
  "kategori_anahtar_kelimeler": ["kelime1", "kelime2"],
  "soru_ozet": "sorunun kısa özeti"
}}

Örnekler:
- "nisan ayında kişisel yeme içme harcamalarım" → {{"ay": "nisan", "tip_filtre": "kisisel", "kategori_anahtar_kelimeler": ["yemek", "kafe", "restoran", "içecek", "market", "cafe"], "soru_ozet": "Nisan - Kişisel Yeme İçme"}}
- "geçen ay faturalar" → {{"ay": "geçen ay", "tip_filtre": "kisisel", "kategori_anahtar_kelimeler": ["fatura", "elektrik", "su", "internet", "telefon", "vodafone", "kablonet"], "soru_ozet": "Geçen Ay - Faturalar"}}
- "nisan dükkan nakliye forklift" → {{"ay": "nisan", "tip_filtre": "isletme", "kategori_anahtar_kelimeler": ["nakliye", "forklift", "taşıma", "araç", "yakıt"], "soru_ozet": "Nisan - İşletme Nakliye/Araç"}}
- "mayıs ayı tüm harcamalar" → {{"ay": "mayıs", "tip_filtre": "hepsi", "kategori_anahtar_kelimeler": [], "soru_ozet": "Mayıs - Tüm Harcamalar"}}"""

    try:
        yanit = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": sistem},
                {"role": "user", "content": soru}
            ],
            temperature=0.1,
            max_tokens=300
        )
        yanit_metni = yanit.choices[0].message.content.strip()
        if "```" in yanit_metni:
            yanit_metni = yanit_metni.split("```")[1]
            if yanit_metni.startswith("json"):
                yanit_metni = yanit_metni[4:].strip()
        return json.loads(yanit_metni)
    except Exception as e:
        print(f"Soru analiz hatası: {e}")
        return None


def _harcamalari_filtrele(harcamalar: list[dict], analiz: dict) -> list[dict]:
    """Tip ve kategori filtrelerine göre harcamaları filtreler."""
    sonuc = []
    tip_filtre = analiz.get("tip_filtre", "hepsi").lower()
    anahtar_kelimeler = [k.lower() for k in analiz.get("kategori_anahtar_kelimeler", [])]

    for h in harcamalar:
        # Tip filtresi
        if tip_filtre == "kisisel" and h["tip"].lower() != "kişisel":
            continue
        if tip_filtre == "isletme" and h["tip"].lower() != "i̇şletme" and h["tip"].lower() != "işletme":
            continue

        # Kategori filtresi (boşsa hepsini al)
        if anahtar_kelimeler:
            eslesme = False
            metin = (h["aciklama"] + " " + h["kategori"]).lower()
            for kelime in anahtar_kelimeler:
                if kelime in metin:
                    eslesme = True
                    break
            if not eslesme:
                continue

        sonuc.append(h)

    return sonuc


def _rapor_png_olustur(harcamalar: list[dict], analiz: dict, ay_adi: str) -> str:
    """Filtrelenmiş harcamalardan PNG rapor oluşturur ve dosya yolunu döndürür."""

    # Kategoriye göre grupla
    kategori_toplam = {}
    gun_toplam = {}

    for h in harcamalar:
        kat = h["kategori"] if h["kategori"] else "Diğer"
        kategori_toplam[kat] = kategori_toplam.get(kat, 0) + h["tutar"]

        gun = h["tarih"]
        gun_toplam[gun] = gun_toplam.get(gun, 0) + h["tutar"]

    genel_toplam = sum(h["tutar"] for h in harcamalar)

    # Renk paleti
    renkler = [
        "#2563EB", "#7C3AED", "#DB2777", "#EA580C",
        "#D97706", "#16A34A", "#0891B2", "#64748B",
        "#DC2626", "#9333EA"
    ]

    # --- Figür ---
    fig = plt.figure(figsize=(12, 14), facecolor="#F8FAFC")
    gs = GridSpec(3, 2, figure=fig, hspace=0.45, wspace=0.35,
                  top=0.92, bottom=0.06, left=0.08, right=0.95)

    # Başlık
    fig.suptitle(
        f"HARCAMA RAPORU\n{ay_adi}  ·  {analiz.get('soru_ozet', '')}",
        fontsize=16, fontweight="bold", color="#1E293B",
        y=0.97, linespacing=1.6
    )

    # ── 1. KATEGORİ ÇUBUK GRAFİĞİ ──
    ax1 = fig.add_subplot(gs[0, :])
    ax1.set_facecolor("#F1F5F9")
    kategoriler = sorted(kategori_toplam.keys(), key=lambda x: kategori_toplam[x], reverse=True)
    tutarlar = [kategori_toplam[k] for k in kategoriler]
    bar_renkler = [renkler[i % len(renkler)] for i in range(len(kategoriler))]

    bars = ax1.barh(kategoriler, tutarlar, color=bar_renkler, height=0.6, edgecolor="white", linewidth=1.5)
    for bar, tutar in zip(bars, tutarlar):
        ax1.text(bar.get_width() + max(tutarlar) * 0.01, bar.get_y() + bar.get_height() / 2,
                 f"₺{tutar:,.0f}", va="center", ha="left", fontsize=10, color="#1E293B", fontweight="bold")

    ax1.set_xlabel("Tutar (₺)", fontsize=10, color="#64748B")
    ax1.set_title("Kategoriye Göre Harcamalar", fontsize=12, fontweight="bold", color="#1E293B", pad=10)
    ax1.tick_params(colors="#374151", labelsize=10)
    ax1.spines[["top", "right", "left"]].set_visible(False)
    ax1.set_xlim(0, max(tutarlar) * 1.18)
    ax1.grid(axis="x", alpha=0.3, color="#CBD5E1")

    # ── 2. PASTA GRAFİĞİ ──
    ax2 = fig.add_subplot(gs[1, 0])
    ax2.set_facecolor("#F8FAFC")
    wedges, texts, autotexts = ax2.pie(
        tutarlar,
        labels=None,
        colors=bar_renkler,
        autopct=lambda pct: f"%{pct:.1f}" if pct > 4 else "",
        startangle=90,
        wedgeprops={"edgecolor": "white", "linewidth": 2}
    )
    for at in autotexts:
        at.set_fontsize(8)
        at.set_color("white")
        at.set_fontweight("bold")

    legend_labels = [f"{k} (₺{kategori_toplam[k]:,.0f})" for k in kategoriler]
    ax2.legend(wedges, legend_labels, loc="lower center", bbox_to_anchor=(0.5, -0.22),
               fontsize=7.5, ncol=2, frameon=False)
    ax2.set_title("Kategori Dağılımı", fontsize=12, fontweight="bold", color="#1E293B", pad=10)

    # ── 3. GÜNLÜK HARCAMA ──
    ax3 = fig.add_subplot(gs[1, 1])
    ax3.set_facecolor("#F1F5F9")
    if gun_toplam:
        gunler_sirali = sorted(gun_toplam.keys(),
                               key=lambda x: datetime.strptime(x, "%d.%m.%Y") if x != "—" else datetime.min)
        gun_etiketleri = [g.split(".")[0] + "." + g.split(".")[1] if "." in g else g for g in gunler_sirali]
        gun_tutarlar = [gun_toplam[g] for g in gunler_sirali]

        ax3.bar(range(len(gun_etiketleri)), gun_tutarlar, color="#2563EB", alpha=0.8, edgecolor="white")
        ax3.set_xticks(range(len(gun_etiketleri)))
        ax3.set_xticklabels(gun_etiketleri, rotation=45, ha="right", fontsize=8)
        ax3.set_title("Güne Göre Harcama", fontsize=12, fontweight="bold", color="#1E293B", pad=10)
        ax3.spines[["top", "right"]].set_visible(False)
        ax3.grid(axis="y", alpha=0.3)
        ax3.tick_params(colors="#374151", labelsize=8)

    # ── 4. DETAY LİSTESİ ──
    ax4 = fig.add_subplot(gs[2, :])
    ax4.axis("off")

    # Tablo başlığı
    ax4.text(0.0, 1.02, "Harcama Detayları", fontsize=12, fontweight="bold",
             color="#1E293B", transform=ax4.transAxes)

    # Sütun başlıkları
    sutunlar = ["Tarih", "Açıklama", "Kategori", "Tip", "Tutar (₺)"]
    sutun_x = [0.0, 0.15, 0.52, 0.70, 0.84]
    for sx, baslik in zip(sutun_x, sutunlar):
        ax4.text(sx, 0.95, baslik, fontsize=9, fontweight="bold",
                 color="#64748B", transform=ax4.transAxes)

    # Ayırıcı çizgi
    ax4.axhline(y=0.93, xmin=0, xmax=1, color="#CBD5E1", linewidth=1,
                transform=ax4.transAxes)

    # Satırlar (max 20 satır göster)
    gosterilecek = harcamalar[:20]
    satir_y = 0.88
    for i, h in enumerate(gosterilecek):
        renk = "#F8FAFC" if i % 2 == 0 else "white"
        ax4.add_patch(mpatches.FancyBboxPatch(
            (0, satir_y - 0.025), 1, 0.05,
            boxstyle="round,pad=0", facecolor=renk,
            transform=ax4.transAxes, zorder=0
        ))
        aciklama_kisalt = h["aciklama"][:28] + "…" if len(h["aciklama"]) > 28 else h["aciklama"]
        kategori_kisalt = h["kategori"][:18] + "…" if len(h["kategori"]) > 18 else h["kategori"]
        degerler = [h["tarih"], aciklama_kisalt, kategori_kisalt, h["tip"], f"₺{h['tutar']:,.2f}"]
        for sx, deger in zip(sutun_x, degerler):
            renk_yazi = "#DC2626" if "İşletme" in deger or "isletme" in deger else "#1E293B"
            ax4.text(sx, satir_y, deger, fontsize=8.5,
                     color=renk_yazi, transform=ax4.transAxes, va="center")
        satir_y -= 0.052
        if satir_y < 0.02:
            break

    if len(harcamalar) > 20:
        ax4.text(0.0, satir_y - 0.02,
                 f"... ve {len(harcamalar) - 20} harcama daha",
                 fontsize=8, color="#94A3B8", transform=ax4.transAxes)

    # Alt toplam kutusu
    fig.text(0.95, 0.03,
             f"TOPLAM: ₺{genel_toplam:,.2f}  |  {len(harcamalar)} işlem",
             ha="right", fontsize=13, fontweight="bold",
             color="white",
             bbox=dict(boxstyle="round,pad=0.5", facecolor="#2563EB", edgecolor="none"))

    # Kaydet
    tmp = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
    plt.savefig(tmp.name, dpi=150, bbox_inches="tight", facecolor=fig.get_facecolor())
    plt.close(fig)
    return tmp.name


async def rapor_olustur(soru: str) -> tuple[str | None, str]:
    """
    Ana fonksiyon. Soruyu analiz eder, Sheets'ten veri çeker, PNG rapor oluşturur.
    Döndürür: (png_dosya_yolu veya None, mesaj)
    """
    bugun = datetime.now()

    # 1. Soruyu analiz et
    analiz = await soruyu_analiz_et(soru)
    if not analiz:
        return None, "❌ Soru anlaşılamadı. Lütfen tekrar deneyin."

    # 2. Ayı belirle
    ay_no, yil = _ay_coz(analiz.get("ay", "bu ay"), bugun)
    ay_adi = f"{AYLAR_TR[ay_no]} {yil}"

    # 3. Sheets'ten veriyi çek
    try:
        sheets = _sheets_baglantisi()
        harcamalar = _sayfa_verilerini_al(sheets, ay_adi)
    except Exception as e:
        return None, f"❌ Google Sheets'e bağlanılamadı: {e}"

    if not harcamalar:
        return None, f"📭 {ay_adi} ayında kayıtlı harcama bulunamadı."

    # 4. Filtrele
    filtrelenmis = _harcamalari_filtrele(harcamalar, analiz)

    if not filtrelenmis:
        return None, (
            f"📭 {ay_adi} ayında '{analiz.get('soru_ozet', '')}' "
            f"kriterlerine uyan harcama bulunamadı.\n"
            f"(Toplam {len(harcamalar)} harcama var, filtre eşleşmedi.)"
        )

    # 5. PNG oluştur
    try:
        png_yolu = _rapor_png_olustur(filtrelenmis, analiz, ay_adi)
        toplam = sum(h["tutar"] for h in filtrelenmis)
        mesaj = (
            f"📊 *{ay_adi} — {analiz.get('soru_ozet', '')}*\n"
            f"🔢 {len(filtrelenmis)} harcama bulundu\n"
            f"💰 Toplam: *₺{toplam:,.2f}*"
        )
        return png_yolu, mesaj
    except Exception as e:
        return None, f"❌ Rapor oluşturulamadı: {e}"