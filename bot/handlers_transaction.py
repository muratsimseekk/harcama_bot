"""Metin / ses → işlem çıkarımı → akıllı onay → kayıt."""
import logging
import os
import tempfile

from telegram import Update
from telegram.ext import ContextTypes

from bot.format import (
    kaydedildi_mesaji,
    onay_klavyesi,
    onay_mesaji,
    tx_klavyesi,
)
from bot.handlers_correction import BEKLEYEN, duzeltme_metni_uygula, son_komut  # noqa: F401
from bot.handlers_report import rapor_isle
from core import repo
from core.config import settings
from core.llm import classify_intent, parse_correction, parse_transactions, transcribe
from core.models import Candidate
from core.review import inceleme_gerek

logger = logging.getLogger(__name__)

YARDIM = (
    "💾 <b>Kayıt:</b> \"market 250\", \"dün benzin 600 tl\", "
    "\"2 mayıs galvaniz 1500, sigara 170\"\n"
    "🟢 <b>Gelir:</b> \"maaş geldi 45000\"\n"
    "📊 <b>Rapor:</b> \"ağustos kişisel yeme içme ne kadar\", \"bu yıl yatırım raporu\"\n"
    "✏️ <b>Düzelt/sil:</b> kayıt altındaki butonlar veya /son\n"
    "🎙️ Sesli mesaj da gönderebilirsin."
)


def yetkili(update: Update) -> bool:
    uid = update.effective_user.id if update.effective_user else 0
    return settings.IZIN_VERILEN_KULLANICI_ID in (0, uid)


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.effective_message.reply_text(
        "👋 Merhaba! Harcama & gelir takip botun.\n\n" + YARDIM, parse_mode="HTML"
    )


async def handle_text(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not yetkili(update):
        await update.effective_message.reply_text("⛔ Yetkiniz yok.")
        return

    metin = (update.effective_message.text or "").strip()
    if not metin or metin.startswith("/"):
        return

    # Bekleyen düzeltme metni mi? (önce onay-öncesi aday düzeltme, sonra kayıtlı tx düzeltme)
    if await pending_edit_metni(update, context):
        return
    if await duzeltme_metni_uygula(update, context):
        return

    await _yonlendir(update, context, metin)


async def handle_voice(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not yetkili(update):
        await update.effective_message.reply_text("⛔ Yetkiniz yok.")
        return

    durum = await update.effective_message.reply_text("🎙️ Ses işleniyor...")
    tmp_path = None
    try:
        vf = await update.effective_message.voice.get_file()
        with tempfile.NamedTemporaryFile(suffix=".ogg", delete=False) as tmp:
            tmp_path = tmp.name
        await vf.download_to_drive(tmp_path)
        metin = await transcribe(tmp_path)
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)

    if not metin:
        await durum.edit_text("❌ Ses anlaşılamadı, tekrar dener misin?")
        return

    await durum.edit_text(f"📝 <i>{metin}</i>", parse_mode="HTML")

    if context.user_data.get(BEKLEYEN):
        update.effective_message.text = metin  # düzeltme metni olarak kullan
        if await duzeltme_metni_uygula(update, context):
            return
    await _yonlendir(update, context, metin, kaynak="telegram_voice")


async def _yonlendir(update, context, metin: str, kaynak: str = "telegram_text") -> None:
    niyet = await classify_intent(metin)
    if niyet == "yardim":
        await update.effective_message.reply_text(YARDIM, parse_mode="HTML")
    elif niyet == "rapor":
        await rapor_isle(update, context, metin)
    elif niyet == "duzeltme":
        await update.effective_message.reply_text(
            "Düzeltmek/silmek için ilgili kaydın altındaki butonları kullan ya da /son yaz."
        )
    else:
        await _isle_islem(update, context, metin, kaynak)


async def _isle_islem(update, context, metin: str, kaynak: str) -> None:
    durum = await update.effective_message.reply_text("🤖 Analiz ediliyor...")
    try:
        adaylar = await parse_transactions(metin, kaynak=kaynak)
    except Exception:
        await durum.edit_text("⚠️ Yapay zeka servisine ulaşılamıyor, birazdan tekrar dene.")
        return

    if not adaylar:
        await durum.edit_text(
            "❓ Kayıt anlaşılamadı.\n\n" + YARDIM, parse_mode="HTML"
        )
        return

    user_id = str(update.effective_user.id)

    if inceleme_gerek(adaylar):
        pending_id = await repo.pending_create(
            user_id, update.effective_chat.id, durum.message_id,
            {"adaylar": [a.to_dict() for a in adaylar], "kaynak": kaynak},
        )
        await durum.edit_text(
            onay_mesaji(adaylar), parse_mode="HTML",
            reply_markup=onay_klavyesi(pending_id, tekli=len(adaylar) == 1),
        )
        return

    txs = await repo.add_many(adaylar, user_id)
    await durum.edit_text(
        kaydedildi_mesaji(txs), parse_mode="HTML",
        reply_markup=tx_klavyesi(txs[0].id) if len(txs) == 1 else None,
    )


# --------------------------------------------------------------------------- #
# Onay (pending) callback'leri
# --------------------------------------------------------------------------- #
async def pending_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    q = update.callback_query
    _, aksiyon, pending_id = q.data.split(":", 2)

    kayit = await repo.pending_get(pending_id)
    if not kayit:
        await q.answer("Bu onay artık geçerli değil.", show_alert=True)
        try:
            await q.edit_message_reply_markup(None)
        except Exception:
            pass
        return
    await q.answer()

    adaylar = [Candidate.from_dict(d) for d in kayit["payload"]["adaylar"]]
    user_id = kayit["user_id"]

    if aksiyon == "no":
        await repo.pending_delete(pending_id)
        await q.edit_message_text("❌ İptal edildi, kaydedilmedi.")
        return

    if aksiyon == "ed":  # tekli adayda düzelt
        context.user_data["pending_edit"] = pending_id
        await q.message.reply_text(
            "✏️ Ne düzeltmek istiyorsun? Örn: <code>tutar 95</code>, "
            "<code>kategori Market</code>, <code>tip işletme</code>.",
            parse_mode="HTML",
        )
        return

    if aksiyon == "ok":
        txs = await repo.add_many(adaylar, user_id)
        await repo.pending_delete(pending_id)
        await q.edit_message_text(
            kaydedildi_mesaji(txs), parse_mode="HTML",
            reply_markup=tx_klavyesi(txs[0].id) if len(txs) == 1 else None,
        )


async def pending_edit_metni(update: Update, context: ContextTypes.DEFAULT_TYPE) -> bool:
    """context.user_data['pending_edit'] varsa metni tek adaya uygular ve kaydeder."""
    pending_id = context.user_data.get("pending_edit")
    if not pending_id:
        return False
    context.user_data.pop("pending_edit", None)

    kayit = await repo.pending_get(pending_id)
    if not kayit:
        await update.effective_message.reply_text("Onay süresi doldu, tekrar gönder.")
        return True

    adaylar = [Candidate.from_dict(d) for d in kayit["payload"]["adaylar"]]
    d = await parse_correction(update.effective_message.text or "")
    a = adaylar[0]
    if "tutar" in d and d["tutar"]:
        try:
            a.tutar = round(abs(float(d["tutar"])), 2)
        except (TypeError, ValueError):
            pass
    if d.get("kategori"):
        a.kategori = str(d["kategori"])
    if d.get("aciklama"):
        a.aciklama = str(d["aciklama"])
    if d.get("tip"):
        from core.models import tip_normalize
        a.tip = tip_normalize(str(d["tip"]))
    if d.get("yon"):
        a.direction = "gelir" if str(d["yon"]).lower().startswith("gel") else "gider"
    if d.get("tarih"):
        from core.dates import tarih_parse
        a.tarih = tarih_parse(str(d["tarih"]))

    txs = await repo.add_many([a], kayit["user_id"])
    await repo.pending_delete(pending_id)
    await update.effective_message.reply_text(
        kaydedildi_mesaji(txs), parse_mode="HTML", reply_markup=tx_klavyesi(txs[0].id)
    )
    return True
