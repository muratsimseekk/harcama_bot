"""Rapor akışı."""
import logging
import os

from telegram import Update
from telegram.ext import ContextTypes

from core.reports import rapor_olustur

logger = logging.getLogger(__name__)


async def rapor_isle(update: Update, context: ContextTypes.DEFAULT_TYPE, soru: str) -> None:
    mesaj = update.effective_message
    durum = await mesaj.reply_text("📊 Rapor hazırlanıyor...")
    try:
        png, metin = await rapor_olustur(soru, str(update.effective_user.id))
        if png and os.path.exists(png):
            await durum.edit_text(metin, parse_mode="HTML")
            with open(png, "rb") as f:
                await mesaj.reply_photo(photo=f)
            os.unlink(png)
        else:
            await durum.edit_text(metin, parse_mode="HTML")
    except Exception as e:
        logger.error(f"rapor hatası: {e}", exc_info=True)
        await durum.edit_text("❌ Rapor oluşturulurken hata oluştu.")
