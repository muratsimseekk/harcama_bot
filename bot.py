import os
import logging
import tempfile
import threading
import asyncio
from http.server import HTTPServer, BaseHTTPRequestHandler
from datetime import datetime
from telegram import Update
from telegram.ext import Application, MessageHandler, CommandHandler, filters, ContextTypes
from groq_client import ses_to_metin, metni_parse_et
from sheets_client import harcamayi_kaydet
from rapor import rapor_olustur

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO
)
logger = logging.getLogger(__name__)

TELEGRAM_TOKEN = os.environ.get("TELEGRAM_TOKEN")
IZIN_VERILEN_KULLANICI = int(os.environ.get("IZIN_VERILEN_KULLANICI_ID", "0"))
PORT = int(os.environ.get("PORT", 10000))

RAPOR_KELIMELERI = [
    "rapor", "analiz", "özet", "ozet", "ne kadar", "kaç lira", "kac lira",
    "harcama yaptım", "harcama yaptim", "toplam", "harcamalar ne",
    "ayında ne", "ayinda ne", "istatistik", "listele", "göster", "goster"
]


def _rapor_sorusu_mu(metin: str) -> bool:
    return any(k in metin.lower() for k in RAPOR_KELIMELERI)


# --- Keepalive HTTP Sunucusu ---
class HealthHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-Type", "text/plain")
        self.end_headers()
        self.wfile.write(b"OK")

    def do_HEAD(self):
        self.send_response(200)
        self.send_header("Content-Type", "text/plain")
        self.end_headers()

    def log_message(self, format, *args):
        pass  # HTTP log'larını bastır


def keepalive_thread():
    """Ayrı thread'de HTTP sunucusu çalıştırır — Render'ın port kontrolü için."""
    sunucu = HTTPServer(("0.0.0.0", PORT), HealthHandler)
    logger.info(f"✅ Keepalive HTTP sunucusu port {PORT}'de başlatıldı")
    sunucu.serve_forever()


# --- Telegram Handlers ---

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "👋 Merhaba! Ben *harcama_takip_rota_bot*'um.\n\n"
        "💾 *Harcama kaydetmek için:*\n"
        "'Sigara 110 lira'\n"
        "'30 Nisan petrol 600 TL, sigara 170 TL'\n\n"
        "📊 *Rapor almak için:*\n"
        "'Nisan ayında kişisel yeme içme ne kadar?'\n"
        "'Geçen ay faturalar toplamı'\n"
        "'Nisan dükkan nakliye harcamaları'\n"
        "'Mayıs tüm harcamalar özeti'\n\n"
        "🎙️ Sesli mesaj da gönderebilirsiniz!",
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

        if _rapor_sorusu_mu(metin):
            await _rapor_isle(update, metin)
        else:
            await _harcamalari_isle(update, metin)

    except Exception as e:
        logger.error(f"Ses işleme hatası: {e}")
        await update.message.reply_text("❌ Bir hata oluştu.")


async def yazili_mesaj_isle(update: Update, context: ContextTypes.DEFAULT_TYPE):
    kullanici_id = update.message.from_user.id
    if IZIN_VERILEN_KULLANICI != 0 and kullanici_id != IZIN_VERILEN_KULLANICI:
        await update.message.reply_text("⛔ Bu botu kullanma yetkiniz yok.")
        return

    metin = update.message.text
    if metin.startswith("/"):
        return

    if _rapor_sorusu_mu(metin):
        await _rapor_isle(update, metin)
    else:
        await _harcamalari_isle(update, metin)


async def _rapor_isle(update: Update, soru: str):
    try:
        await update.message.reply_text("📊 Rapor hazırlanıyor, lütfen bekleyin...")
        png_yolu, mesaj = await rapor_olustur(soru)

        if png_yolu and os.path.exists(png_yolu):
            await update.message.reply_text(mesaj, parse_mode="Markdown")
            with open(png_yolu, "rb") as f:
                await update.message.reply_photo(photo=f)
            os.unlink(png_yolu)
        else:
            await update.message.reply_text(mesaj)

    except Exception as e:
        logger.error(f"Rapor hatası: {e}")
        await update.message.reply_text("❌ Rapor oluşturulurken hata oluştu.")


async def _harcamalari_isle(update: Update, metin: str):
    try:
        await update.message.reply_text("🤖 Harcamalar analiz ediliyor...")
        harcama_listesi = await metni_parse_et(metin)

        if not harcama_listesi:
            await update.message.reply_text(
                "❓ Harcama anlaşılamadı.\n\n"
                "Kayıt: 'Market 250 lira'\n"
                "Tarihli: '2 Mayıs market 300 TL'\n"
                "Toplu: '30 Nisan petrol 600 TL, sigara 170 TL'\n\n"
                "Rapor: 'Nisan yeme içme ne kadar?'"
            )
            return

        toplam_adet = len(harcama_listesi)
        basarili = 0
        basarisiz = 0
        ozet_satirlar = []

        for harcama in harcama_listesi:
            bugun_str = datetime.now().strftime("%d.%m.%Y")
            harcama["saat"] = datetime.now().strftime("%H:%M") if harcama.get("tarih") == bugun_str else "—"

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
            mesaj = f"✅ *{basarili}/{toplam_adet} harcama kaydedildi!*\n\n{ozet_metni}"
            if basarisiz > 0:
                mesaj += f"\n\n⚠️ {basarisiz} harcama kaydedilemedi."

        await update.message.reply_text(mesaj, parse_mode="Markdown")

    except Exception as e:
        logger.error(f"Harcama işleme hatası: {e}")
        await update.message.reply_text("❌ Bir hata oluştu.")


def main():
    # HTTP keepalive sunucusunu ANA THREAD'DEN ÖNCE başlat
    t = threading.Thread(target=keepalive_thread, daemon=True)
    t.start()

    # Sunucunun port'u açmasını bekle
    import time
    time.sleep(1)

    # Telegram bot'u başlat
    app = Application.builder().token(TELEGRAM_TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(MessageHandler(filters.VOICE, sesli_mesaj_isle))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, yazili_mesaj_isle))

    logger.info("🤖 harcama_takip_rota_bot başlatılıyor...")
    app.run_polling(drop_pending_updates=True)


if __name__ == "__main__":
    main()