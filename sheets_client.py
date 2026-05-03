import os
import json
from datetime import datetime
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build

SHEETS_ID = os.environ.get("GOOGLE_SHEETS_ID")
CREDENTIALS_JSON = os.environ.get("GOOGLE_CREDENTIALS_JSON")

SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]

AYLAR_TR = {
    1: "Ocak", 2: "Şubat", 3: "Mart", 4: "Nisan",
    5: "Mayıs", 6: "Haziran", 7: "Temmuz", 8: "Ağustos",
    9: "Eylül", 10: "Ekim", 11: "Kasım", 12: "Aralık"
}

GUNLER_TR = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"]


def _sheets_baglantisi():
    credentials_bilgi = json.loads(CREDENTIALS_JSON)
    credentials = Credentials.from_service_account_info(credentials_bilgi, scopes=SCOPES)
    service = build("sheets", "v4", credentials=credentials)
    return service.spreadsheets()


def _sayfa_adi_olustur(yil: int, ay: int) -> str:
    return f"{AYLAR_TR[ay]} {yil}"


def _sayfa_var_mi(sheets, sayfa_adi: str) -> bool:
    try:
        meta = sheets.get(spreadsheetId=SHEETS_ID).execute()
        sayfalar = [s["properties"]["title"] for s in meta["sheets"]]
        return sayfa_adi in sayfalar
    except:
        return False


def _sayfa_id_al(sheets, sayfa_adi: str) -> int:
    meta = sheets.get(spreadsheetId=SHEETS_ID).execute()
    for s in meta["sheets"]:
        if s["properties"]["title"] == sayfa_adi:
            return s["properties"]["sheetId"]
    return 0


def _sayfa_olustur(sheets, sayfa_adi: str):
    """Yeni ay sayfası oluşturur, başlık satırı + format uygular"""
    # Sayfa ekle
    body = {
        "requests": [{
            "addSheet": {
                "properties": {
                    "title": sayfa_adi,
                    "gridProperties": {"rowCount": 2000, "columnCount": 8}
                }
            }
        }]
    }
    sheets.batchUpdate(spreadsheetId=SHEETS_ID, body=body).execute()

    # Başlık satırı yaz
    baslik = [["Tarih", "Gün", "Saat", "Açıklama", "Kategori", "Tip", "Tutar (₺)", "Notlar"]]
    sheets.values().update(
        spreadsheetId=SHEETS_ID,
        range=f"'{sayfa_adi}'!A1:H1",
        valueInputOption="RAW",
        body={"values": baslik}
    ).execute()

    # Başlık formatı: koyu mavi arka plan, beyaz kalın yazı
    sayfa_id = _sayfa_id_al(sheets, sayfa_adi)
    format_body = {
        "requests": [
            {
                "repeatCell": {
                    "range": {
                        "sheetId": sayfa_id,
                        "startRowIndex": 0,
                        "endRowIndex": 1
                    },
                    "cell": {
                        "userEnteredFormat": {
                            "backgroundColor": {"red": 0.13, "green": 0.37, "blue": 0.64},
                            "textFormat": {
                                "foregroundColor": {"red": 1.0, "green": 1.0, "blue": 1.0},
                                "bold": True,
                                "fontSize": 11
                            },
                            "horizontalAlignment": "CENTER"
                        }
                    },
                    "fields": "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)"
                }
            },
            {
                # Tutar sütununu (G) para formatı yap
                "repeatCell": {
                    "range": {
                        "sheetId": sayfa_id,
                        "startRowIndex": 1,
                        "startColumnIndex": 6,
                        "endColumnIndex": 7
                    },
                    "cell": {
                        "userEnteredFormat": {
                            "numberFormat": {
                                "type": "NUMBER",
                                "pattern": "#,##0.00"
                            }
                        }
                    },
                    "fields": "userEnteredFormat.numberFormat"
                }
            }
        ]
    }
    sheets.batchUpdate(spreadsheetId=SHEETS_ID, body=format_body).execute()


async def harcamayi_kaydet(harcama: dict) -> bool:
    """
    Harcamayı ilgili ay sayfasına kaydeder.
    harcama: {aciklama, tutar, kategori, tip, tarih, saat}
    """
    try:
        sheets = _sheets_baglantisi()
        simdi = datetime.now()
        sayfa_adi = _sayfa_adi_olustur(simdi.year, simdi.month)

        # Sayfa yoksa oluştur
        if not _sayfa_var_mi(sheets, sayfa_adi):
            _sayfa_olustur(sheets, sayfa_adi)

        gun_adi = GUNLER_TR[simdi.weekday()]
        tip_tr = "İşletme" if harcama.get("tip") == "isletme" else "Kişisel"

        yeni_satir = [[
            harcama["tarih"],
            gun_adi,
            harcama["saat"],
            harcama["aciklama"],
            harcama["kategori"],
            tip_tr,
            harcama["tutar"],
            ""
        ]]

        sheets.values().append(
            spreadsheetId=SHEETS_ID,
            range=f"'{sayfa_adi}'!A:H",
            valueInputOption="USER_ENTERED",
            insertDataOption="INSERT_ROWS",
            body={"values": yeni_satir}
        ).execute()

        # Özet sayfasını güncelle
        _ozet_guncelle(sheets, simdi, float(harcama["tutar"]), harcama.get("tip", "kisisel"))

        return True

    except Exception as e:
        print(f"Sheets kayıt hatası: {e}")
        return False


def _ozet_guncelle(sheets, simdi: datetime, tutar: float, tip: str):
    """📊 Özet sayfasındaki aylık toplamları günceller"""
    try:
        ozet_sayfa = "📊 Özet"

        if not _sayfa_var_mi(sheets, ozet_sayfa):
            _ozet_sayfasi_olustur(sheets, ozet_sayfa)

        result = sheets.values().get(
            spreadsheetId=SHEETS_ID,
            range=f"'{ozet_sayfa}'!A:D"
        ).execute()
        satirlar = result.get("values", [])

        ay_adi = _sayfa_adi_olustur(simdi.year, simdi.month)
        ay_bulundu = False

        for i, satir in enumerate(satirlar):
            if satir and satir[0] == ay_adi:
                kisisel = float(str(satir[1]).replace(",", ".")) if len(satir) > 1 and satir[1] else 0.0
                isletme = float(str(satir[2]).replace(",", ".")) if len(satir) > 2 and satir[2] else 0.0

                if tip == "isletme":
                    isletme += tutar
                else:
                    kisisel += tutar

                toplam = kisisel + isletme
                sheets.values().update(
                    spreadsheetId=SHEETS_ID,
                    range=f"'{ozet_sayfa}'!B{i+1}:D{i+1}",
                    valueInputOption="USER_ENTERED",
                    body={"values": [[kisisel, isletme, toplam]]}
                ).execute()
                ay_bulundu = True
                break

        if not ay_bulundu:
            kisisel = 0.0 if tip == "isletme" else tutar
            isletme = tutar if tip == "isletme" else 0.0
            sheets.values().append(
                spreadsheetId=SHEETS_ID,
                range=f"'{ozet_sayfa}'!A:D",
                valueInputOption="USER_ENTERED",
                insertDataOption="INSERT_ROWS",
                body={"values": [[ay_adi, kisisel, isletme, tutar]]}
            ).execute()

    except Exception as e:
        print(f"Özet güncelleme hatası: {e}")


def _ozet_sayfasi_olustur(sheets, sayfa_adi: str):
    """Ana özet sayfasını oluşturur"""
    body = {
        "requests": [{
            "addSheet": {
                "properties": {
                    "title": sayfa_adi,
                    "index": 0,
                    "gridProperties": {"rowCount": 100, "columnCount": 5}
                }
            }
        }]
    }
    sheets.batchUpdate(spreadsheetId=SHEETS_ID, body=body).execute()

    baslik = [["Ay", "Kişisel (₺)", "İşletme (₺)", "Toplam (₺)"]]
    sheets.values().update(
        spreadsheetId=SHEETS_ID,
        range=f"'{sayfa_adi}'!A1:D1",
        valueInputOption="RAW",
        body={"values": baslik}
    ).execute()

    sayfa_id = _sayfa_id_al(sheets, sayfa_adi)
    format_body = {
        "requests": [{
            "repeatCell": {
                "range": {
                    "sheetId": sayfa_id,
                    "startRowIndex": 0,
                    "endRowIndex": 1
                },
                "cell": {
                    "userEnteredFormat": {
                        "backgroundColor": {"red": 0.13, "green": 0.37, "blue": 0.64},
                        "textFormat": {
                            "foregroundColor": {"red": 1.0, "green": 1.0, "blue": 1.0},
                            "bold": True,
                            "fontSize": 11
                        },
                        "horizontalAlignment": "CENTER"
                    }
                },
                "fields": "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)"
            }
        }]
    }
    sheets.batchUpdate(spreadsheetId=SHEETS_ID, body=format_body).execute()
