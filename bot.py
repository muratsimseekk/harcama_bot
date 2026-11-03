import os
import json
import asyncio
import hashlib
import logging
import tempfile
from datetime import datetime, timedelta, timezone

import tornado.web

try:
    from dotenv import load_dotenv  # yerel geliştirme için opsiyonel
    load_dotenv()
except ImportError:
    pass

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
# Render URL'si (webhook adresi için) — RENDER_URL elle girilmemişse Render'ın otomatik
# verdiği RENDER_EXTERNAL_URL kullanılır. İkisi de yoksa polling'e düşülür (yerel geliştirme).
RENDER_URL = os.environ.get("RENDER_URL") or os.environ.get("RENDER_EXTERNAL_URL", "")

RAPOR_KELIMELERI = [
    "rapor", "analiz", "özet", "ozet", "ne kadar", "kaç lira", "kac lira",
    "harcama yaptım", "harcama yaptim", "toplam", "harcamalar ne",
    "ayında ne", "ayinda ne", "istatistik", "listele", "göster", "goster"
]


def _rapor_sorusu_mu(metin: str) -> bool:
    return any(k in metin.lower() for k in RAPOR_KELIMELERI)


TR_SAAT_DILIMI = timezone(timedelta(hours=3))  # Türkiye 2016'dan beri sabit UTC+3


def _iletilen_mesaj_tarihi(message) -> datetime | None:
    """Mesaj kullanıcının eski bir mesajından iletildiyse (Forward) orijinal
    gönderilme zamanını Türkiye saatiyle döndürür; iletilmemişse None.
    Bot kapalıyken atılmış mesajlar bu sayede sonradan doğru güne kaydedilir."""
    origin = message.forward_origin
    if origin is None:
        return None
    return origin.date.astimezone(TR_SAAT_DILIMI).replace(tzinfo=None)


def _bot_mesajindan_mi_iletildi(message) -> bool:
    origin = message.forward_origin
    kaynak = getattr(origin, "sender_user", None)
    return bool(kaynak and kaynak.is_bot)


# Telegram webhook isteklerini doğrulamak için gizli anahtar (token'dan türetilir, ek env gerekmez)
WEBHOOK_PATH = "/telegram"
WEBHOOK_SECRET = hashlib.sha256((TELEGRAM_TOKEN or "").encode()).hexdigest()[:32]


# --- HTTP Sunucusu (webhook + sağlık kontrolü) ---
class HealthHandler(tornado.web.RequestHandler):
    def get(self):
        # Tarayıcıdan açıldığında servisi uyandırır ("uyandırma linki")
        self.set_header("Content-Type", "text/plain; charset=utf-8")
        self.write("✅ harcama_bot uyanık — Telegram'dan harcama girebilirsiniz.")

    def head(self):
        pass


class TelegramWebhookHandler(tornado.web.RequestHandler):
    """Telegram her mesajı buraya POST eder. Render servisi uyuyor olsa bile
    bu istek onu uyandırır; Telegram yanıt alamazsa mesajı tekrar dener."""

    def initialize(self, app: Application):
        self.app = app

    async def post(self):
        if self.request.headers.get("X-Telegram-Bot-Api-Secret-Token") != WEBHOOK_SECRET:
            self.set_status(403)
            return
        update = Update.de_json(json.loads(self.request.body), self.app.bot)
        await self.app.update_queue.put(update)


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
        "'Bu yıl toplam yatırım raporu'\n\n"
        "🎙️ Sesli mesaj da gönderebilirsiniz!\n\n"
        "📨 Eski mesajları kaydetmek için onları bu sohbete iletin (Forward) — "
        "orijinal tarihleriyle kaydedilir.\n"
        "🔗 /tablo — kayıtların tutulduğu tablonun linki",
        parse_mode="Markdown"
    )


async def tablo(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Kayıtların yazıldığı Google Sheets tablosunun linkini gönderir."""
    kullanici_id = update.message.from_user.id
    if IZIN_VERILEN_KULLANICI != 0 and kullanici_id != IZIN_VERILEN_KULLANICI:
        await update.message.reply_text("⛔ Bu botu kullanma yetkiniz yok.")
        return
    sheets_id = os.environ.get("GOOGLE_SHEETS_ID")
    if not sheets_id:
        await update.message.reply_text("❌ GOOGLE_SHEETS_ID tanımlı değil.")
        return
    await update.message.reply_text(
        f"📊 Kayıtlar bu tabloda (her ay ayrı sayfa, toplamlar '📊 Özet' sayfasında):\n"
        f"https://docs.google.com/spreadsheets/d/{sheets_id}"
    )


async def sesli_mesaj_isle(update: Update, context: ContextTypes.DEFAULT_TYPE):
    kullanici_id = update.message.from_user.id
    if IZIN_VERILEN_KULLANICI != 0 and kullanici_id != IZIN_VERILEN_KULLANICI:
        await update.message.reply_text("⛔ Bu botu kullanma yetkiniz yok.")
        return
    if _bot_mesajindan_mi_iletildi(update.message):
        return

    referans = _iletilen_mesaj_tarihi(update.message)
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

        await update.message.reply_text(f"📝 Anlaşılan: {metin}")

        await _mesaji_yonlendir(update, metin, referans)

    except Exception as e:
        logger.error(f"Ses işleme hatası: {e}", exc_info=True)
        await update.message.reply_text("❌ Bir hata oluştu.")


async def yazili_mesaj_isle(update: Update, context: ContextTypes.DEFAULT_TYPE):
    kullanici_id = update.message.from_user.id
    if IZIN_VERILEN_KULLANICI != 0 and kullanici_id != IZIN_VERILEN_KULLANICI:
        await update.message.reply_text("⛔ Bu botu kullanma yetkiniz yok.")
        return

    if _bot_mesajindan_mi_iletildi(update.message):
        return

    metin = update.message.text
    if metin.startswith("/"):
        return

    await _mesaji_yonlendir(update, metin, _iletilen_mesaj_tarihi(update.message))


async def _mesaji_yonlendir(update: Update, metin: str, referans: datetime | None):
    if not _rapor_sorusu_mu(metin):
        await _harcamalari_isle(update, metin, referans)
    elif referans:
        # İletilen eski bir rapor sorusu: geçmişi aktarırken rapor üretme
        await update.message.reply_text("⏭️ Eski rapor sorusu, atlandı.")
    else:
        await _rapor_isle(update, metin)


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
        logger.error(f"Rapor hatası: {e}", exc_info=True)
        await update.message.reply_text("❌ Rapor oluşturulurken hata oluştu.")


async def _harcamalari_isle(update: Update, metin: str, referans: datetime | None = None):
    """referans: iletilen eski mesajın gönderilme zamanı; yoksa şu an (Türkiye saati)."""
    # Render sunucusu UTC'de çalışır; tarih/saat Türkiye saatine göre hesaplanmalı.
    simdi = referans or datetime.now(TR_SAAT_DILIMI).replace(tzinfo=None)
    try:
        if referans is None:
            await update.message.reply_text("🤖 Harcamalar analiz ediliyor...")
        try:
            harcama_listesi = await metni_parse_et(metin, referans_tarih=simdi)
        except Exception as e:
            logger.error(f"Groq parse erişilemedi: {e}", exc_info=True)
            await update.message.reply_text(
                "⚠️ Yapay zeka servisine şu an ulaşılamıyor. Lütfen birazdan tekrar deneyin.\n\n"
                f"Neden: {type(e).__name__}: {str(e)[:200]}"
            )
            return

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
        hatalar = []
        ozet_satirlar = []

        for harcama in harcama_listesi:
            bugun_str = simdi.strftime("%d.%m.%Y")
            harcama["saat"] = simdi.strftime("%H:%M") if harcama.get("tarih") == bugun_str else "—"

            tip = harcama.get("tip", "kisisel")
            tip_emoji = "🏭" if tip == "isletme" else ("💹" if tip == "yatirim" else "👤")
            ozet_satirlar.append(
                f"{tip_emoji} {harcama['tarih']} | {harcama['aciklama']} | "
                f"{harcama['tutar']} ₺ | {harcama['kategori']}"
            )

            hata = await harcamayi_kaydet(harcama)
            if hata is None:
                basarili += 1
            else:
                basarisiz += 1
                hatalar.append(hata)

        if basarili == 0:
            # Hiçbiri kaydedilemedi — "Kaydedildi" deme, gerçek nedeni göster.
            await update.message.reply_text(
                f"❌ Kaydedilemedi!\n\nNeden: {hatalar[0]}"
            )
            return

        if toplam_adet == 1:
            h = harcama_listesi[0]
            tip = h.get("tip", "kisisel")
            tip_emoji = "🏭" if tip == "isletme" else ("💹" if tip == "yatirim" else "👤")
            tip_tr = {"isletme": "İşletme", "yatirim": "Yatırım"}.get(tip, "Kişisel")
            mesaj = (
                f"✅ Kaydedildi!\n\n"
                f"📌 {h['aciklama']}\n"
                f"💰 {h['tutar']} ₺\n"
                f"🏷️ {h['kategori']}\n"
                f"{tip_emoji} {tip_tr}\n"
                f"📅 {h['tarih']}"
            )
        else:
            ozet_metni = "\n".join(ozet_satirlar)
            mesaj = f"✅ {basarili}/{toplam_adet} harcama kaydedildi!\n\n{ozet_metni}"
            if basarisiz > 0:
                mesaj += f"\n\n⚠️ {basarisiz} harcama kaydedilemedi: {hatalar[0]}"

        if referans:
            mesaj = f"📨 Eski mesaj ({referans:%d.%m.%Y %H:%M})\n" + mesaj

        # parse_mode yok: açıklamadaki '_' veya '*' Telegram Markdown'ını bozup
        # kayıt yapılmış olsa bile "Bir hata oluştu" mesajına düşürüyordu.
        await update.message.reply_text(mesaj)

    except Exception as e:
        logger.error(f"Harcama işleme hatası: {e}", exc_info=True)
        await update.message.reply_text("❌ Bir hata oluştu.")


async def webhook_ile_calistir(app: Application):
    webhook_url = RENDER_URL.rstrip("/") + WEBHOOK_PATH
    sunucu = tornado.web.Application([
        (r"/", HealthHandler),
        (WEBHOOK_PATH, TelegramWebhookHandler, {"app": app}),
    ])

    async with app:
        # drop_pending_updates=False: servisi uyandıran mesaj silinmesin
        await app.bot.set_webhook(
            url=webhook_url,
            secret_token=WEBHOOK_SECRET,
            drop_pending_updates=False,
            allowed_updates=Update.ALL_TYPES,
        )
        await app.start()
        sunucu.listen(PORT, address="0.0.0.0")
        logger.info(f"✅ Webhook aktif: {webhook_url} (port {PORT})")
        try:
            await asyncio.Event().wait()
        finally:
            await app.stop()


def main():
    eksikler = [ad for ad in ("TELEGRAM_TOKEN", "GROQ_API_KEY", "GOOGLE_SHEETS_ID", "GOOGLE_CREDENTIALS_JSON")
                if not os.environ.get(ad)]
    if eksikler:
        logger.error(f"❌ Eksik ortam değişkenleri: {', '.join(eksikler)}")

    app = Application.builder().token(TELEGRAM_TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("tablo", tablo))
    app.add_handler(MessageHandler(filters.VOICE, sesli_mesaj_isle))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, yazili_mesaj_isle))

    logger.info("🤖 harcama_takip_rota_bot başlatılıyor...")

    if not RENDER_URL:
        # Yerel geliştirme: dışarıdan erişilebilir adres yok, polling kullan
        logger.warning("RENDER_URL / RENDER_EXTERNAL_URL yok — polling modunda çalışılıyor")
        app.run_polling(drop_pending_updates=True)
        return

    # Uyanık tutma (self-ping) yok: Render ücretsiz saatleri harcama_api ile paylaşılıyor.
    # Servis 15 dk boşta kalınca uyur; Telegram'ın webhook isteği veya ana sayfa
    # linkine girmek onu uyandırır.
    asyncio.run(webhook_ile_calistir(app))


if __name__ == "__main__":
    main()