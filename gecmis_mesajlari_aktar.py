"""
Bot çalışmazken Telegram'a atılmış harcama mesajlarını sonradan Sheets'e aktarır.

Bot API geçmiş mesajları okuyamadığı için kaynak, Telegram Desktop'ın dışa
aktarımıdır (format: JSON, "Voice messages" işaretli). İki yol da olur:
  - Sohbet menüsü → Export chat history
  - Ayarlar → Gelişmiş → Export Telegram data → yalnızca "Bot chats"

İki adım:
  1) Önizleme — mesajları okur, Groq ile ayrıştırır, CSV'ye yazar (Sheets'e dokunmaz):
       python gecmis_mesajlari_aktar.py onizle <export klasörü> --baslangic 24.09.2026 --bitis 02.11.2026
  2) CSV'yi kontrol edin (yanlış satırları silin/düzeltin), sonra Sheets'e yazın:
       python gecmis_mesajlari_aktar.py yaz <export klasörü>/aktarim_onizleme.csv

Her yazılan satır CSV'de "yazildi" olarak işaretlenir; yarıda kesilirse tekrar
çalıştırmak aynı kaydı iki kez yazmaz.
"""
import os
import csv
import sys
import json
import time
import asyncio
import argparse
import logging
from datetime import datetime

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from groq_client import ses_to_metin, metni_parse_et
from sheets_client import harcamayi_kaydet

logging.basicConfig(format="%(asctime)s - %(levelname)s - %(message)s", level=logging.INFO)
logger = logging.getLogger(__name__)

# bot.py'deki listeyle aynı — rapor soruları kayıt olarak aktarılmasın
RAPOR_KELIMELERI = [
    "rapor", "analiz", "özet", "ozet", "ne kadar", "kaç lira", "kac lira",
    "harcama yaptım", "harcama yaptim", "toplam", "harcamalar ne",
    "ayında ne", "ayinda ne", "istatistik", "listele", "göster", "goster"
]

CSV_ALANLARI = ["durum", "mesaj_zamani", "mesaj", "tarih", "saat", "aciklama",
                "tutar", "kategori", "tip"]
CSV_AYRAC = ";"  # Türkçe Excel ';' bekler


def _rapor_sorusu_mu(metin: str) -> bool:
    return any(k in metin.lower() for k in RAPOR_KELIMELERI)


def _gun_parse(s: str) -> datetime:
    return datetime.strptime(s, "%d.%m.%Y")


def _metni_birlestir(text) -> str:
    """Export'ta 'text' düz metin ya da (link, kalın yazı vb. varsa) parça listesidir."""
    if isinstance(text, str):
        return text
    return "".join(p if isinstance(p, str) else p.get("text", "") for p in text)


def _bot_sohbetini_bul(veri: dict, sohbet_adi: str | None) -> dict:
    """Tek sohbet export'u (Export chat history) ya da tüm hesap export'u
    (Ayarlar → Gelişmiş → Export Telegram data) olabilir."""
    if "messages" in veri:
        return veri

    sohbetler = [s for s in veri.get("chats", {}).get("list", []) if s.get("type") == "bot_chat"]
    if sohbet_adi:
        sohbetler = [s for s in sohbetler if sohbet_adi.lower() in (s.get("name") or "").lower()]
    if len(sohbetler) == 1:
        return sohbetler[0]

    adlar = ", ".join(repr(s.get("name")) for s in sohbetler) or "yok"
    sys.exit(f"Bot sohbeti seçilemedi (bulunan bot sohbetleri: {adlar}). "
             f"--sohbet ile bot'un adını verin.")


def _kullanici_mesajlari(export_klasoru: str, baslangic: datetime, bitis: datetime | None,
                         sohbet_adi: str | None = None):
    with open(os.path.join(export_klasoru, "result.json"), encoding="utf-8") as f:
        veri = _bot_sohbetini_bul(json.load(f), sohbet_adi)
    logger.info(f"Sohbet: {veri.get('name')} ({len(veri.get('messages', []))} mesaj)")

    # Bot ile özel sohbette sohbet id'si bot'un id'sidir; onun mesajlarını atla.
    bot_from_id = f"user{veri.get('id')}"
    izinli = os.environ.get("IZIN_VERILEN_KULLANICI_ID", "0")

    for m in veri.get("messages", []):
        if m.get("type") != "message" or m.get("from_id") == bot_from_id:
            continue
        if izinli != "0" and m.get("from_id") != f"user{izinli}":
            continue
        zaman = datetime.fromtimestamp(int(m["date_unixtime"]))
        if zaman.date() < baslangic.date() or (bitis and zaman.date() > bitis.date()):
            continue
        yield m, zaman


async def onizle(args):
    baslangic = _gun_parse(args.baslangic)
    bitis = _gun_parse(args.bitis) if args.bitis else None
    cikti = os.path.join(args.export_klasoru, "aktarim_onizleme.csv")

    satirlar = []
    atlanan = []
    for m, zaman in _kullanici_mesajlari(args.export_klasoru, baslangic, bitis, args.sohbet):
        if m.get("media_type") == "voice_message":
            dosya = os.path.join(args.export_klasoru, m.get("file", ""))
            if not os.path.isfile(dosya):
                atlanan.append((zaman, "sesli mesaj dosyası export'ta yok"))
                continue
            metin = await ses_to_metin(dosya)
            if not metin:
                atlanan.append((zaman, "sesli mesaj anlaşılamadı"))
                continue
            metin = f"🎙️ {metin}"
        else:
            metin = _metni_birlestir(m.get("text", "")).strip()

        if not metin or metin.startswith("/") or _rapor_sorusu_mu(metin):
            continue

        try:
            kayitlar = await metni_parse_et(metin.removeprefix("🎙️ "), referans_tarih=zaman)
        except Exception as e:
            atlanan.append((zaman, f"Groq hatası: {e}"))
            continue
        time.sleep(1)  # Groq ücretsiz plan hız sınırı

        if not kayitlar:
            atlanan.append((zaman, f"harcama bulunamadı: {metin[:60]}"))
            continue

        mesaj_gunu = zaman.strftime("%d.%m.%Y")
        for h in kayitlar:
            satirlar.append({
                "durum": "",
                "mesaj_zamani": zaman.strftime("%d.%m.%Y %H:%M"),
                "mesaj": metin,
                "tarih": h["tarih"],
                # bot.py ile aynı kural: kayıt mesajın günüyse mesaj saati, değilse "—"
                "saat": zaman.strftime("%H:%M") if h["tarih"] == mesaj_gunu else "—",
                "aciklama": h.get("aciklama", ""),
                "tutar": h["tutar"],
                "kategori": h.get("kategori", ""),
                "tip": h.get("tip", "kisisel"),
            })
        logger.info(f"{zaman:%d.%m.%Y %H:%M} → {len(kayitlar)} kayıt: {metin[:60]}")

    with open(cikti, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=CSV_ALANLARI, delimiter=CSV_AYRAC)
        w.writeheader()
        w.writerows(satirlar)

    print(f"\n✅ {len(satirlar)} kayıt bulundu → {cikti}")
    if atlanan:
        print(f"⚠️ {len(atlanan)} mesaj atlandı:")
        for zaman, neden in atlanan:
            print(f"   {zaman:%d.%m.%Y %H:%M} — {neden}")
    print("\nCSV'yi kontrol edin; yanlış satırları silin/düzeltin, sonra 'yaz' adımını çalıştırın.")


def _csv_kaydet(yol: str, satirlar: list[dict]):
    with open(yol, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=CSV_ALANLARI, delimiter=CSV_AYRAC)
        w.writeheader()
        w.writerows(satirlar)


async def yaz(args):
    with open(args.csv_dosyasi, newline="", encoding="utf-8-sig") as f:
        satirlar = list(csv.DictReader(f, delimiter=CSV_AYRAC))

    bekleyen = [s for s in satirlar if s.get("durum") != "yazildi"]
    print(f"{len(bekleyen)} kayıt Sheets'e yazılacak ({len(satirlar) - len(bekleyen)} zaten yazılmış).")

    basarili = 0
    for s in bekleyen:
        try:
            tutar = float(str(s["tutar"]).replace(",", "."))
        except ValueError:
            print(f"❌ Geçersiz tutar, atlandı: {s['tarih']} {s['aciklama']} '{s['tutar']}'")
            continue

        harcama = {k: s[k] for k in ("tarih", "saat", "aciklama", "kategori", "tip")}
        harcama["tutar"] = tutar
        hata = await harcamayi_kaydet(harcama)
        if hata:
            print(f"❌ {s['tarih']} {s['aciklama']}: {hata}")
            print("Durduruldu. Sorunu giderip aynı komutu tekrar çalıştırın; yazılanlar tekrar yazılmaz.")
            break

        s["durum"] = "yazildi"
        _csv_kaydet(args.csv_dosyasi, satirlar)  # her kayıttan sonra: yarıda kalırsa tekrar yazılmasın
        basarili += 1
        print(f"✅ {s['tarih']} | {s['aciklama']} | {tutar} ₺ | {s['kategori']}")
        time.sleep(1.5)  # Sheets API dakika başı istek sınırı

    print(f"\n{basarili}/{len(bekleyen)} kayıt yazıldı.")


def main():
    p = argparse.ArgumentParser(description="Telegram export'undaki eski harcama mesajlarını Sheets'e aktarır.")
    alt = p.add_subparsers(dest="komut", required=True)

    o = alt.add_parser("onizle", help="Mesajları ayrıştırıp CSV önizleme üretir (Sheets'e yazmaz)")
    o.add_argument("export_klasoru", help="Telegram Desktop export klasörü (result.json'un olduğu yer)")
    o.add_argument("--baslangic", required=True, help="İlk gün, GG.AA.YYYY (dahil)")
    o.add_argument("--bitis", help="Son gün, GG.AA.YYYY (dahil). Verilmezse bugüne kadar.")
    o.add_argument("--sohbet", help="Tüm hesap export'unda birden çok bot varsa bot'un adı (ör. harcama)")

    y = alt.add_parser("yaz", help="Onaylanmış CSV'yi Sheets'e yazar")
    y.add_argument("csv_dosyasi")

    args = p.parse_args()
    asyncio.run(onizle(args) if args.komut == "onizle" else yaz(args))


if __name__ == "__main__":
    if sys.platform == "win32":
        sys.stdout.reconfigure(encoding="utf-8")
    main()
