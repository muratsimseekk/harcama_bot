import os
import logging
import tempfile
from datetime import datetime
from telegram import Update
from telegram.ext import Application, MessageHandler, CommandHandler, filters, ContextTypes
from groq_client import ses_to_metin, metni_parse_et
from sheets_client import harcamayi_kaydet

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO
)
logger = logging.getLogger(__name__)

TELEGRAM_TOKEN = os.environ.get("TELEGRAM_TOKEN")
IZIN_VERILEN_KULLANICI = int(os.environ.get("IZIN_VERILEN_KULLANICI_ID", "0"))


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "👋 Merhaba! Ben *harcama_takip_rota_bot*'um.\n\n"
        "🎙️ Sesli mesaj gönderin veya yazın:\n"
        "Örnek: 'Sigara aldım, 110 lira'\n"
        "Örnek: 'Ankraj hammaddesi 2500 TL'\n\n"
        "📊 Harcamalarınız otomatik olarak Google Sheets'e kaydedilecek.\n\n"
        "🏷️ *Kişisel kategoriler:* Market, Sigara/İçecek, Kafe/Restoran, Ulaşım, Sağlık, Giyim, Fatura\n"
        "🏭 *İşletme kategorileri:* Hammadde, Nakliye, Personel, Yakıt/Araç, Elektrik/Su, Kira, Makine",
        parse_mode="Markdown"
    )


async def sesli_mesaj_isle(update: Update, context: ContextTypes.DEFAULT_TYPE):
    kullanici_id = update.message.from_user.id
    if IZIN_VERILEN_KULLANICI != 0 and kullanici_id != IZIN_VERILEN_KULLANICI:
        await update.message.reply_text("⛔ Bu botu kullanma yetkiniz yok.")
        return

    await update.message.reply_text("🎙️ Ses mesajı alındı, işleniyor...")

    try:
        voice_file = await update.message.voice.get_file()
        with tempfile.NamedTemporaryFile(suffix=".ogg", delete=False) as tmp:
            tmp_path = tmp.name
        await voice_file.download_to_drive(tmp_path)

        metin = await ses_to_metin(tmp_path)
        os.unlink(tmp_path)

        if not metin:
            await update.message.reply_text("❌ Ses anlaşılamadı, tekrar deneyin.")
            return

        await update.message.reply_text(f"📝 Anlaşılan: *{metin}*", parse_mode="Markdown")
        await _harcamayi_isle(update, metin)

    except Exception as e:
        logger.error(f"Ses işleme hatası: {e}")
        await update.message.reply_text("❌ Bir hata oluştu. Lütfen tekrar deneyin.")


async def yazili_mesaj_isle(update: Update, context: ContextTypes.DEFAULT_TYPE):
    kullanici_id = update.message.from_user.id
    if IZIN_VERILEN_KULLANICI != 0 and kullanici_id != IZIN_VERILEN_KULLANICI:
        await update.message.reply_text("⛔ Bu botu kullanma yetkiniz yok.")
        return

    metin = update.message.text
    if metin.startswith("/"):
        return

    await _harcamayi_isle(update, metin)


async def _harcamayi_isle(update: Update, metin: str):
    try:
        await update.message.reply_text("🤖 Harcama analiz ediliyor...")
        harcama = await metni_parse_et(metin)

        if not harcama:
            await update.message.reply_text(
                "❓ Harcama anlaşılamadı.\n"
                "Örnek: 'Market alışverişi 250 lira' veya 'Nakliye ücreti 750 TL işletme'"
            )
            return

        simdi = datetime.now()
        harcama["tarih"] = simdi.strftime("%d.%m.%Y")
        harcama["saat"] = simdi.strftime("%H:%M")

        tip_emoji = "🏭" if harcama.get("tip") == "isletme" else "👤"

        await update.message.reply_text(
            f"✅ Kaydediliyor...\n"
            f"📌 Açıklama: {harcama['aciklama']}\n"
            f"💰 Tutar: {harcama['tutar']} ₺\n"
            f"🏷️ Kategori: {harcama['kategori']}\n"
            f"{tip_emoji} Tip: {'İşletme' if harcama.get('tip') == 'isletme' else 'Kişisel'}\n"
            f"📅 Tarih: {harcama['tarih']} {harcama['saat']}"
        )

        basari = await harcamayi_kaydet(harcama)

        if basari:
            await update.message.reply_text("✅ Google Sheets'e başarıyla kaydedildi!")
        else:
            await update.message.reply_text("❌ Sheets'e kaydedilemedi, tekrar deneyin.")

    except Exception as e:
        logger.error(f"Harcama işleme hatası: {e}")
        await update.message.reply_text("❌ Bir hata oluştu.")


def main():
    app = Application.builder().token(TELEGRAM_TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(MessageHandler(filters.VOICE, sesli_mesaj_isle))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, yazili_mesaj_isle))

    logger.info("harcama_takip_rota_bot başlatılıyor...")
    app.run_polling(drop_pending_updates=True)


if __name__ == "__main__":
    main()