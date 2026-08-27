"""Telegram mesaj biçimleme yardımcıları (HTML parse mode)."""
from __future__ import annotations

from html import escape

from telegram import InlineKeyboardButton, InlineKeyboardMarkup

from core.dates import tarih_str, turkce_tutar
from core.models import TIP_EMOJI, TIP_ETIKETI, Candidate, Transaction

YON_EMOJI = {"gider": "🔴", "gelir": "🟢"}


def h(s: str) -> str:
    return escape(str(s), quote=False)


def aday_satiri(a: Candidate) -> str:
    emoji = TIP_EMOJI.get(a.tip, "👤")
    yon = "" if a.direction == "gider" else "🟢 GELİR "
    s = (
        f"{yon}{emoji} <b>{h(a.aciklama)}</b> — {turkce_tutar(a.tutar)} ₺\n"
        f"   {h(a.kategori)} · {TIP_ETIKETI.get(a.tip, 'Kişisel')} · {tarih_str(a.tarih)}"
    )
    if a.inceleme_sebepleri:
        s += "\n   ⚠️ " + h("; ".join(a.inceleme_sebepleri))
    return s


def tx_satiri(t: Transaction) -> str:
    emoji = TIP_EMOJI.get(t.tip, "👤")
    yon = "" if t.direction == "gider" else "🟢 "
    return (
        f"{yon}{emoji} <b>{h(t.aciklama)}</b> — {turkce_tutar(t.tutar)} ₺\n"
        f"   {h(t.kategori)} · {TIP_ETIKETI.get(t.tip, 'Kişisel')} · {tarih_str(t.tarih)}"
    )


def kaydedildi_mesaji(txs: list[Transaction]) -> str:
    if len(txs) == 1:
        return "✅ <b>Kaydedildi</b>\n\n" + tx_satiri(txs[0])
    toplam = turkce_tutar(sum(t.tutar for t in txs))
    govde = "\n".join(tx_satiri(t) for t in txs)
    return f"✅ <b>{len(txs)} kayıt eklendi</b> — toplam {toplam} ₺\n\n{govde}"


def onay_mesaji(adaylar: list[Candidate]) -> str:
    if len(adaylar) == 1:
        return "🤔 <b>Bunu kaydedeyim mi?</b>\n\n" + aday_satiri(adaylar[0])
    toplam = turkce_tutar(sum(a.tutar for a in adaylar))
    govde = "\n\n".join(aday_satiri(a) for a in adaylar)
    return f"🤔 <b>{len(adaylar)} kayıt — onaylıyor musun?</b> (toplam {toplam} ₺)\n\n{govde}"


# --------------------------------------------------------------------------- #
# Klavyeler
# --------------------------------------------------------------------------- #
def onay_klavyesi(pending_id: str, tekli: bool) -> InlineKeyboardMarkup:
    satir = [InlineKeyboardButton("✅ Onayla", callback_data=f"p:ok:{pending_id}")]
    if tekli:
        satir.append(InlineKeyboardButton("✏️ Düzelt", callback_data=f"p:ed:{pending_id}"))
    satir.append(InlineKeyboardButton("❌ İptal", callback_data=f"p:no:{pending_id}"))
    return InlineKeyboardMarkup([satir])


def tx_klavyesi(tx_id: str) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup([[
        InlineKeyboardButton("✏️ Düzelt", callback_data=f"t:ed:{tx_id}"),
        InlineKeyboardButton("🗑️ Sil", callback_data=f"t:del:{tx_id}"),
    ]])


def sil_onay_klavyesi(tx_id: str) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup([[
        InlineKeyboardButton("🗑️ Evet, sil", callback_data=f"t:delok:{tx_id}"),
        InlineKeyboardButton("Vazgeç", callback_data=f"t:delno:{tx_id}"),
    ]])
