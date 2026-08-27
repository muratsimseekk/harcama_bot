"""Düzeltme / silme / /son akışı."""
import logging

from telegram import Update
from telegram.ext import ContextTypes

from bot.format import sil_onay_klavyesi, tx_klavyesi, tx_satiri
from core import repo
from core.dates import tarih_parse
from core.llm import parse_correction
from core.models import tip_normalize

logger = logging.getLogger(__name__)

# context.user_data anahtarı: {"tip": "tx"|"pending", "id": ...}
BEKLEYEN = "bekleyen_duzeltme"

_ALAN_MAP = {  # Candidate/JSON alanı -> transactions kolonu
    "tutar": "amount",
    "kategori": "category",
    "aciklama": "description",
    "tip": "type",
    "yon": "direction",
    "tarih": "occurred_on",
}


def _duzeltmeyi_kolonlara_cevir(d: dict) -> dict:
    kolonlar = {}
    for k, v in d.items():
        if k not in _ALAN_MAP or v in (None, "", 0):
            continue
        if k == "tutar":
            try:
                kolonlar["amount"] = round(abs(float(v)), 2)
            except (TypeError, ValueError):
                pass
        elif k == "tip":
            kolonlar["type"] = tip_normalize(str(v))
        elif k == "yon":
            kolonlar["direction"] = "gelir" if str(v).lower().startswith("gel") else "gider"
        elif k == "tarih":
            kolonlar["occurred_on"] = tarih_parse(str(v)).isoformat()
        else:
            kolonlar[_ALAN_MAP[k]] = str(v)
    return kolonlar


async def son_komut(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    parcalar = (update.effective_message.text or "").split()
    n = 5
    if len(parcalar) > 1 and parcalar[1].isdigit():
        n = max(1, min(20, int(parcalar[1])))

    txs = await repo.list_recent(str(update.effective_user.id), n)
    if not txs:
        await update.effective_message.reply_text("Henüz kayıt yok.")
        return

    await update.effective_message.reply_text(f"🧾 <b>Son {len(txs)} kayıt</b>", parse_mode="HTML")
    for t in txs:
        await update.effective_message.reply_text(
            tx_satiri(t), parse_mode="HTML", reply_markup=tx_klavyesi(t.id)
        )


async def duzeltme_metni_uygula(update: Update, context: ContextTypes.DEFAULT_TYPE) -> bool:
    """context.user_data'da bekleyen düzeltme varsa metni uygular. İşlendiyse True."""
    bekleyen = context.user_data.get(BEKLEYEN)
    if not bekleyen:
        return False
    context.user_data.pop(BEKLEYEN, None)

    metin = update.effective_message.text or ""
    d = await parse_correction(metin)
    kolonlar = _duzeltmeyi_kolonlara_cevir(d)
    if not kolonlar:
        await update.effective_message.reply_text(
            "Neyi değiştireceğimi anlayamadım. Örn: <code>tutar 95</code>, "
            "<code>kategori Market</code>, <code>tarih dün</code>.",
            parse_mode="HTML",
        )
        return True

    tx = await repo.update(bekleyen["id"], kolonlar)
    if not tx:
        await update.effective_message.reply_text("Kayıt bulunamadı.")
        return True
    await update.effective_message.reply_text(
        "✏️ <b>Güncellendi</b>\n\n" + tx_satiri(tx),
        parse_mode="HTML", reply_markup=tx_klavyesi(tx.id),
    )
    return True


async def tx_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    q = update.callback_query
    await q.answer()
    _, aksiyon, tx_id = q.data.split(":", 2)

    if aksiyon == "ed":
        context.user_data[BEKLEYEN] = {"tip": "tx", "id": tx_id}
        await q.message.reply_text(
            "✏️ Ne düzeltmek istiyorsun? Örn: <code>tutar 95</code>, "
            "<code>kategori Ulaşım</code>, <code>tip işletme</code>, <code>tarih dün</code>.",
            parse_mode="HTML",
        )
    elif aksiyon == "del":
        await q.message.reply_text(
            "Bu kaydı silmek istediğine emin misin?",
            reply_markup=sil_onay_klavyesi(tx_id),
        )
    elif aksiyon == "delok":
        ok = await repo.soft_delete(tx_id)
        await q.edit_message_text("🗑️ Silindi." if ok else "Kayıt bulunamadı.")
    elif aksiyon == "delno":
        await q.edit_message_text("Vazgeçildi, kayıt duruyor.")
