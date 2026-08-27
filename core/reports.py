"""Rapor üretimi: Supabase'den veri çek, filtrele, matplotlib PNG üret.

Render kodu eski `rapor.py`'den taşındı; veri kaynağı artık `core.repo`.
"""
from __future__ import annotations

import calendar
import logging
import tempfile
from datetime import date

import matplotlib

matplotlib.use("Agg")
import matplotlib.patches as mpatches
import matplotlib.pyplot as plt
from matplotlib.gridspec import GridSpec

from core import repo
from core.dates import AYLAR_TR, ay_coz, today, turkce_tutar
from core.llm import analyze_query
from core.models import TIP_EMOJI, Transaction

logger = logging.getLogger(__name__)

TIP_RENK = {"kisisel": "#2563EB", "isletme": "#16A34A", "yatirim": "#9333EA"}
_RENKLER = ["#2563EB", "#7C3AED", "#DB2777", "#EA580C", "#D97706",
            "#16A34A", "#0891B2", "#64748B", "#DC2626", "#9333EA"]


def _filtre_anahtar(txs: list[Transaction], kelimeler: list[str]) -> list[Transaction]:
    if not kelimeler:
        return txs
    kelimeler = [k.lower() for k in kelimeler]
    return [
        t for t in txs
        if any(k in (t.aciklama + " " + t.kategori).lower() for k in kelimeler)
    ]


async def _veri_al(user_id: str, analiz: dict) -> tuple[list[Transaction], str]:
    bugun = today()
    mod = analiz.get("mod", "ay")
    tip = analiz.get("tip_filtre", "hepsi")
    yon = analiz.get("yon_filtre", "hepsi")

    if mod == "yil":
        yil = int(analiz.get("yil", bugun.year))
        txs = await repo.list_period(
            user_id, date(yil, 1, 1), date(yil, 12, 31), direction=yon, tip=tip
        )
        baslik = f"{yil} Yılı"
    else:
        ay_no, yil = ay_coz(analiz.get("ay", "bu ay"), bugun)
        son_gun = calendar.monthrange(yil, ay_no)[1]
        txs = await repo.list_period(
            user_id, date(yil, ay_no, 1), date(yil, ay_no, son_gun),
            direction=yon, tip=tip,
        )
        baslik = f"{AYLAR_TR[ay_no]} {yil}"

    txs = _filtre_anahtar(txs, analiz.get("kategori_anahtar_kelimeler", []))
    return txs, baslik


async def rapor_olustur(soru: str, user_id: str) -> tuple[str | None, str]:
    analiz = await analyze_query(soru)
    if not analiz:
        return None, "Soru anlaşılamadı, lütfen tekrar deneyin."

    txs, baslik = await _veri_al(user_id, analiz)
    if not txs:
        return None, f"{baslik} için kriterlere uyan kayıt bulunamadı."

    try:
        png = _png_olustur(txs, analiz, baslik)
    except Exception as e:
        logger.error(f"rapor PNG hatası: {e}", exc_info=True)
        return None, f"Rapor oluşturulamadı: {e}"

    toplam = sum(t.tutar for t in txs)
    tip_filtre = analiz.get("tip_filtre", "hepsi")
    emoji = TIP_EMOJI.get(tip_filtre, "📊")
    ozet = analiz.get("soru_ozet", "")
    mesaj = (
        f"{emoji} <b>{baslik} — {ozet}</b>\n"
        f"🔢 {len(txs)} kayıt\n"
        f"💰 Toplam: <b>{turkce_tutar(toplam)} ₺</b>"
    )
    return png, mesaj


def _png_olustur(txs: list[Transaction], analiz: dict, baslik_str: str) -> str:
    kategori_toplam: dict[str, float] = {}
    gun_toplam: dict[date, float] = {}
    tip_toplam = {"kisisel": 0.0, "isletme": 0.0, "yatirim": 0.0}

    for t in txs:
        kat = t.kategori or "Diğer"
        kategori_toplam[kat] = kategori_toplam.get(kat, 0) + t.tutar
        gun_toplam[t.tarih] = gun_toplam.get(t.tarih, 0) + t.tutar
        tip_toplam[t.tip] = tip_toplam.get(t.tip, 0) + t.tutar

    genel_toplam = sum(t.tutar for t in txs)

    fig = plt.figure(figsize=(12, 15), facecolor="#F8FAFC")
    gs = GridSpec(4, 2, figure=fig, hspace=0.5, wspace=0.35,
                  top=0.93, bottom=0.05, left=0.08, right=0.95)
    fig.suptitle(
        f"HARCAMA & YATIRIM RAPORU\n{baslik_str}  -  {analiz.get('soru_ozet', '')}",
        fontsize=15, fontweight="bold", color="#1E293B", y=0.97, linespacing=1.6,
    )

    # Özet kutuları
    ax0 = fig.add_subplot(gs[0, :])
    ax0.axis("off")
    for idx, (etiket, key, renk) in enumerate([
        ("Kisisel", "kisisel", "#2563EB"),
        ("Isletme", "isletme", "#16A34A"),
        ("Yatirim", "yatirim", "#9333EA"),
    ]):
        x = 0.04 + idx * 0.33
        ax0.add_patch(mpatches.FancyBboxPatch(
            (x, 0.1), 0.28, 0.75, boxstyle="round,pad=0.02",
            facecolor=renk, transform=ax0.transAxes, zorder=1, alpha=0.9))
        ax0.text(x + 0.14, 0.65, etiket, ha="center", va="center",
                 fontsize=11, color="white", fontweight="bold", transform=ax0.transAxes)
        ax0.text(x + 0.14, 0.28, f"{tip_toplam[key]:,.0f} TL", ha="center", va="center",
                 fontsize=13, color="white", fontweight="bold", transform=ax0.transAxes)

    # Yatay çubuk — kategori
    ax1 = fig.add_subplot(gs[1, :])
    ax1.set_facecolor("#F1F5F9")
    kategoriler = sorted(kategori_toplam, key=kategori_toplam.get, reverse=True)
    tutarlar = [kategori_toplam[k] for k in kategoriler]
    bar_renkler = [_RENKLER[i % len(_RENKLER)] for i in range(len(kategoriler))]
    bars = ax1.barh(kategoriler, tutarlar, color=bar_renkler, height=0.6,
                    edgecolor="white", linewidth=1.5)
    for bar, tutar in zip(bars, tutarlar, strict=False):
        ax1.text(bar.get_width() + max(tutarlar) * 0.01, bar.get_y() + bar.get_height() / 2,
                 f"{tutar:,.0f} TL", va="center", ha="left", fontsize=10,
                 color="#1E293B", fontweight="bold")
    ax1.set_title("Kategoriye Gore", fontsize=12, fontweight="bold", color="#1E293B", pad=10)
    ax1.tick_params(colors="#374151", labelsize=10)
    ax1.spines[["top", "right", "left"]].set_visible(False)
    ax1.set_xlim(0, max(tutarlar) * 1.18)
    ax1.grid(axis="x", alpha=0.3, color="#CBD5E1")

    # Pasta
    ax2 = fig.add_subplot(gs[2, 0])
    wedges, _, autotexts = ax2.pie(
        tutarlar, labels=None, colors=bar_renkler,
        autopct=lambda pct: f"%{pct:.1f}" if pct > 4 else "",
        startangle=90, wedgeprops={"edgecolor": "white", "linewidth": 2})
    for at in autotexts:
        at.set_fontsize(8)
        at.set_color("white")
        at.set_fontweight("bold")
    ax2.legend(wedges, [f"{k} ({kategori_toplam[k]:,.0f} TL)" for k in kategoriler],
               loc="lower center", bbox_to_anchor=(0.5, -0.25), fontsize=7.5,
               ncol=2, frameon=False)
    ax2.set_title("Kategori Dagilimi", fontsize=12, fontweight="bold", color="#1E293B", pad=10)

    # Zaman
    ax3 = fig.add_subplot(gs[2, 1])
    ax3.set_facecolor("#F1F5F9")
    if gun_toplam:
        gunler = sorted(gun_toplam)
        ax3.bar(range(len(gunler)), [gun_toplam[g] for g in gunler],
                color="#7C3AED", alpha=0.85, edgecolor="white")
        ax3.set_xticks(range(len(gunler)))
        ax3.set_xticklabels([g.strftime("%d.%m") for g in gunler],
                            rotation=60, ha="right", fontsize=7)
        ax3.set_title("Tarihe Gore", fontsize=12, fontweight="bold", color="#1E293B", pad=10)
        ax3.spines[["top", "right"]].set_visible(False)
        ax3.grid(axis="y", alpha=0.3)

    # Detay liste
    ax4 = fig.add_subplot(gs[3, :])
    ax4.axis("off")
    ax4.text(0.0, 1.02, "Detay Listesi", fontsize=12, fontweight="bold",
             color="#1E293B", transform=ax4.transAxes)
    sutun_x = [0.0, 0.15, 0.52, 0.70, 0.84]
    for sx, b in zip(sutun_x, ["Tarih", "Aciklama", "Kategori", "Tip", "Tutar (TL)"], strict=False):
        ax4.text(sx, 0.95, b, fontsize=9, fontweight="bold", color="#64748B",
                 transform=ax4.transAxes)
    ax4.plot([0, 1], [0.93, 0.93], color="#CBD5E1", linewidth=1,
             transform=ax4.transAxes, clip_on=False)

    satir_y = 0.88
    for i, t in enumerate(txs[:18]):
        ax4.add_patch(mpatches.FancyBboxPatch(
            (0, satir_y - 0.025), 1, 0.05, boxstyle="round,pad=0",
            facecolor="#F1F5F9" if i % 2 == 0 else "#FFFFFF",
            transform=ax4.transAxes, zorder=0))
        renk = TIP_RENK.get(t.tip, "#1E293B")
        ac = t.aciklama[:28] + "..." if len(t.aciklama) > 28 else t.aciklama
        kk = t.kategori[:18] + "..." if len(t.kategori) > 18 else t.kategori
        degerler = [t.tarih.strftime("%d.%m.%Y"), ac, kk, t.tip, f"{t.tutar:,.2f} TL"]
        renkler = ["#1E293B", "#1E293B", "#1E293B", renk, "#1E293B"]
        for sx, deger, yr in zip(sutun_x, degerler, renkler, strict=False):
            ax4.text(sx, satir_y, deger, fontsize=8.5, color=yr,
                     transform=ax4.transAxes, va="center")
        satir_y -= 0.052
        if satir_y < 0.02:
            break

    if len(txs) > 18:
        ax4.text(0.0, max(satir_y - 0.02, 0.01), f"... ve {len(txs) - 18} kayit daha",
                 fontsize=8, color="#94A3B8", transform=ax4.transAxes)

    fig.text(0.95, 0.02,
             f"TOPLAM: {genel_toplam:,.2f} TL  |  {len(txs)} islem",
             ha="right", fontsize=12, fontweight="bold", color="white",
             bbox=dict(boxstyle="round,pad=0.5", facecolor="#1E293B", edgecolor="none"))

    tmp = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
    plt.savefig(tmp.name, dpi=150, bbox_inches="tight", facecolor=fig.get_facecolor())
    plt.close(fig)
    return tmp.name
