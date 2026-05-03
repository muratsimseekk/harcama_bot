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
        "🎙️ *Tek harcama:*\n"
        "'Sigara aldım 110 lira'\n"
        "'2 Mayıs tarihinde market 300 TL'\n\n"
        "📋 *Toplu giriş:*\n"
        "'1 Nisan market 250 TL, 3 Nisan akaryakıt 500 TL, 5 Nisan ankraj hammaddesi 2500 TL'\n\n"
        "📅 Tarih belirtirsen o tarihe, belirtmezsen bugüne kaydeder.\n"
        "📊 Harcamalar otomatik olarak Google Sheets'e kaydedilir.",
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
        await _harcamalari_isle(update, metin)

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

    await _harcamalari_isle(update, metin)


async def _harcamalari_isle(update: Update, metin: str):
    try:
        await update.message.reply_text("🤖 Harcamalar analiz ediliyor...")
        harcama_listesi = await metni_parse_et(metin)

        if not harcama_listesi:
            await update.message.reply_text(
                "❓ Harcama anlaşılamadı.\n\n"
                "Tek örnek: 'Market 250 lira'\n"
                "Tarihli örnek: '2 Mayıs market 300 TL'\n"
                "Toplu örnek: '1 Nisan sigara 110 TL, 3 Nisan akaryakıt 500 TL'"
            )
            return

        toplam_adet = len(harcama_listesi)
        basarili = 0
        basarisiz = 0
        ozet_satirlar = []

        for harcama in harcama_listesi:
            # Saat: bugünün harcamasıysa şimdiki saat, geçmişse "—"
            bugun_str = datetime.now().strftime("%d.%m.%Y")
            if harcama.get("tarih") == bugun_str:
                harcama["saat"] = datetime.now().strftime("%H:%M")
            else:
                harcama["saat"] = "—"

            tip_emoji = "🏭" if harcama.get("tip") == "isletme" else "👤"
            ozet_satirlar.append(
                f"{tip_emoji} {harcama['tarih']} | {harcama['aciklama']} | "
                f"{harcama['tutar']} ₺ | {harcama['kategori']}"
            )

            sonuc = await harcamayi_kaydet(harcama)
            if sonuc:
                basarili += 1
            else:
                basarisiz += 1

        # Sonuç mesajı
        if toplam_adet == 1:
            h = harcama_listesi[0]
            tip_emoji = "🏭" if h.get("tip") == "isletme" else "👤"
            mesaj = (
                f"✅ Kaydedildi!\n\n"
                f"📌 {h['aciklama']}\n"
                f"💰 {h['tutar']} ₺\n"
                f"🏷️ {h['kategori']}\n"
                f"{tip_emoji} {'İşletme' if h.get('tip') == 'isletme' else 'Kişisel'}\n"
                f"📅 {h['tarih']}"
            )
        else:
            ozet_metni = "\n".join(ozet_satirlar)
            mesaj = (
                f"✅ *{basarili}/{toplam_adet} harcama kaydedildi!*\n\n"
                f"{ozet_metni}"
            )
            if basarisiz > 0:
                mesaj += f"\n\n⚠️ {basarisiz} harcama kaydedilemedi."

        await update.message.reply_text(mesaj, parse_mode="Markdown")

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
