"""Telegram uygulamasını kurar ve çalıştırır."""
import logging

from telegram.ext import (
    Application,
    CallbackQueryHandler,
    CommandHandler,
    MessageHandler,
    filters,
)

from bot import keepalive
from bot.handlers_correction import son_komut, tx_callback
from bot.handlers_transaction import (
    handle_text,
    handle_voice,
    pending_callback,
    start,
)
from core.config import settings

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)


async def _yardim(update, context):
    from bot.handlers_transaction import YARDIM
    await update.effective_message.reply_text(YARDIM, parse_mode="HTML")


def main() -> None:
    eksik = settings.eksikler()
    if eksik:
        raise SystemExit(f"Eksik ortam değişkenleri: {', '.join(eksik)}")

    keepalive.baslat()

    app = Application.builder().token(settings.TELEGRAM_TOKEN).build()

    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("son", son_komut))
    app.add_handler(CommandHandler(["yardim", "help"], _yardim))

    app.add_handler(CallbackQueryHandler(pending_callback, pattern=r"^p:"))
    app.add_handler(CallbackQueryHandler(tx_callback, pattern=r"^t:"))

    app.add_handler(MessageHandler(filters.VOICE, handle_voice))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_text))

    logger.info("🤖 Bot başlatılıyor...")
    app.run_polling(drop_pending_updates=True)
