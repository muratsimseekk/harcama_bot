"""Kayıtları Excel (xlsx) ve yazdırılabilir HTML'e (mobilde PDF'e çevrilir) döker. I/O yok."""
from __future__ import annotations

import html
import io
from datetime import date

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

from core.models import TIP_ETIKETI, Transaction

AYLAR = ["", "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
         "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"]
TL_BICIM = '#,##0.00 "₺"'


def tarih_yazi(d: date) -> str:
    return f"{d.day} {AYLAR[d.month]} {d.year}"


def _tl(x: float) -> str:
    s = f"{x:,.2f}"  # 1,234.56 → 1.234,56
    return s.replace(",", "_").replace(".", ",").replace("_", ".") + " ₺"


def ozet(txs: list[Transaction]) -> dict:
    gelir = round(sum(t.tutar for t in txs if t.direction == "gelir"), 2)
    gider = round(sum(t.tutar for t in txs if t.direction != "gelir"), 2)
    kat: dict[tuple[str, str], list[float]] = {}
    for t in txs:
        acc = kat.setdefault((t.direction, t.kategori or "Diğer"), [0.0, 0])
        acc[0] += t.tutar
        acc[1] += 1
    satirlar = sorted(
        ((yon, ad, round(tut, 2), int(adet)) for (yon, ad), (tut, adet) in kat.items()),
        key=lambda r: (r[0] != "gider", -r[2]),
    )
    return {"gelir": gelir, "gider": gider, "net": round(gelir - gider, 2), "kategoriler": satirlar}


def _sirali(txs: list[Transaction]) -> list[Transaction]:
    return sorted(txs, key=lambda t: (t.tarih, t.direction, t.kategori), reverse=True)


def xlsx(
    txs: list[Transaction], bas: date, bit: date, ekleyen: dict[str, str] | None = None, filtre: str = "",
) -> bytes:
    wb = Workbook()
    kalin = Font(bold=True)
    baslik_dolgu = PatternFill("solid", fgColor="E4EEE5")

    ws = wb.active
    ws.title = "Kayıtlar"
    hane = bool(ekleyen)
    kolonlar = ["Tarih", "Tür", "Bölüm", "Kategori", "Açıklama", "Tutar"] + (["Ekleyen"] if hane else [])
    ws.append(kolonlar)
    for h in ws[1]:
        h.font, h.fill = kalin, baslik_dolgu
    for t in _sirali(txs):
        satir = [
            t.tarih, "Gelir" if t.direction == "gelir" else "Gider",
            "Gelir" if t.direction == "gelir" else TIP_ETIKETI.get(t.tip, t.tip),
            t.kategori or "Diğer", t.aciklama,
            t.tutar if t.direction == "gelir" else -t.tutar,
        ]
        if hane:
            satir.append((ekleyen or {}).get(t.user_id, ""))
        ws.append(satir)
    for r in ws.iter_rows(min_row=2):
        r[0].number_format = "DD.MM.YYYY"
        r[5].number_format = TL_BICIM
    for i, gen in enumerate([12, 8, 10, 18, 34, 14, 14][: len(kolonlar)], start=1):
        ws.column_dimensions[get_column_letter(i)].width = gen
    ws.freeze_panes = "A2"
    ws.auto_filter.ref = ws.dimensions

    o = ozet(txs)
    oz = wb.create_sheet("Özet")
    oz.append([f"Paraİzi dökümü{' · ' + filtre if filtre else ''}", f"{tarih_yazi(bas)} – {tarih_yazi(bit)}"])
    oz["A1"].font = Font(bold=True, size=13)
    oz.append([])
    for ad, deger in (("Toplam gelir", o["gelir"]), ("Toplam gider", o["gider"]), ("Net", o["net"])):
        oz.append([ad, deger])
        oz.cell(oz.max_row, 1).font = kalin
        oz.cell(oz.max_row, 2).number_format = TL_BICIM
    oz.append([])
    oz.append(["Tür", "Kategori", "Tutar", "Kayıt"])
    for h in oz[oz.max_row]:
        h.font, h.fill = kalin, baslik_dolgu
    for yon, ad, tut, adet in o["kategoriler"]:
        oz.append(["Gelir" if yon == "gelir" else "Gider", ad, tut, adet])
        oz.cell(oz.max_row, 3).number_format = TL_BICIM
    for i, gen in enumerate([16, 24, 16, 8], start=1):
        oz.column_dimensions[get_column_letter(i)].width = gen
    oz["B1"].alignment = Alignment(horizontal="left")

    tampon = io.BytesIO()
    wb.save(tampon)
    return tampon.getvalue()


def yazdirilabilir_html(
    txs: list[Transaction], bas: date, bit: date, ekleyen: dict[str, str] | None = None, filtre: str = "",
) -> str:
    """expo-print ile PDF'e çevrilecek A4 HTML."""
    e = html.escape
    o = ozet(txs)
    hane = bool(ekleyen)
    kat_satir = "".join(
        f"<tr><td>{'Gelir' if yon == 'gelir' else 'Gider'}</td><td>{e(ad)}</td>"
        f"<td class='s'>{adet}</td><td class='s'>{_tl(tut)}</td></tr>"
        for yon, ad, tut, adet in o["kategoriler"]
    )
    kayit_satir = "".join(
        f"<tr><td>{t.tarih.strftime('%d.%m.%Y')}</td><td>{e(t.kategori or 'Diğer')}</td>"
        f"<td>{e(t.aciklama)}</td>"
        + (f"<td>{e((ekleyen or {}).get(t.user_id, ''))}</td>" if hane else "")
        + f"<td class='s {'g' if t.direction == 'gelir' else ''}'>"
        f"{'' if t.direction == 'gelir' else '−'}{_tl(t.tutar)}</td></tr>"
        for t in _sirali(txs)
    )
    return f"""<!doctype html><html lang="tr"><head><meta charset="utf-8">
<style>
  @page {{ size: A4; margin: 16mm 14mm; }}
  body {{ font-family: -apple-system, Roboto, 'Helvetica Neue', Arial, sans-serif; color: #1d2421; font-size: 11px; }}
  h1 {{ font-size: 20px; margin: 0 0 2px; }}
  .alt {{ color: #6b7470; margin-bottom: 14px; }}
  .kartlar {{ display: flex; gap: 10px; margin-bottom: 16px; }}
  .kart {{ flex: 1; background: #f3f6f4; border-radius: 10px; padding: 10px 12px; }}
  .kart b {{ display: block; font-size: 15px; margin-top: 2px; }}
  h2 {{ font-size: 13px; margin: 18px 0 6px; }}
  table {{ width: 100%; border-collapse: collapse; }}
  th {{ text-align: left; background: #e4eee5; padding: 6px; font-size: 10.5px; }}
  td {{ padding: 5px 6px; border-bottom: 1px solid #e6e9e7; vertical-align: top; }}
  .s {{ text-align: right; white-space: nowrap; }}
  .g {{ color: #2f7d4f; }}
  tr {{ page-break-inside: avoid; }}
</style></head><body>
<h1>Paraİzi dökümü{' · ' + e(filtre) if filtre else ''}</h1>
<div class="alt">{tarih_yazi(bas)} – {tarih_yazi(bit)} · {len(txs)} kayıt</div>
<div class="kartlar">
  <div class="kart">Toplam gelir<b class="g">{_tl(o['gelir'])}</b></div>
  <div class="kart">Toplam gider<b>{_tl(o['gider'])}</b></div>
  <div class="kart">Net<b>{_tl(o['net'])}</b></div>
</div>
<h2>Kategorilere göre</h2>
<table><tr><th>Tür</th><th>Kategori</th><th class="s">Kayıt</th><th class="s">Tutar</th></tr>{kat_satir}</table>
<h2>Tüm kayıtlar</h2>
<table><tr><th>Tarih</th><th>Kategori</th><th>Açıklama</th>{'<th>Ekleyen</th>' if hane else ''}<th class="s">Tutar</th></tr>{kayit_satir}</table>
</body></html>"""
