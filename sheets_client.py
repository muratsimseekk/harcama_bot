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

TIP_ETIKETI = {
    "kisisel": "Kişisel",
    "isletme": "İşletme",
    "yatirim": "Yatırım"
}


def _sheets_baglantisi():
    credentials_bilgi = json.loads(CREDENTIALS_JSON)
    credentials = Credentials.from_service_account_info(credentials_bilgi, scopes=SCOPES)
    service = build("sheets", "v4", credentials=credentials)
    return service.spreadsheets()


def _tarih_parse(tarih_str: str) -> datetime:
    try:
        return datetime.strptime(tarih_str, "%d.%m.%Y")
    except:
        return datetime.now()


def _sayfa_adi_olustur(dt: datetime) -> str:
    return f"{AYLAR_TR[dt.month]} {dt.year}"


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

    baslik = [["Tarih", "Gün", "Saat", "Açıklama", "Kategori", "Tip", "Tutar (₺)", "Notlar"]]
    sheets.values().update(
        spreadsheetId=SHEETS_ID,
        range=f"'{sayfa_adi}'!A1:H1",
        valueInputOption="RAW",
        body={"values": baslik}
    ).execute()

    sayfa_id = _sayfa_id_al(sheets, sayfa_adi)

    # Başlık rengi: tip'e göre farklı renk yok, tek renk yeterli
    format_body = {
        "requests": [
            {
                "repeatCell": {
                    "range": {"sheetId": sayfa_id, "startRowIndex": 0, "endRowIndex": 1},
                    "cell": {
                        "userEnteredFormat": {
                            "backgroundColor": {"red": 0.13, "green": 0.37, "blue": 0.64},
                            "textFormat": {
                                "foregroundColor": {"red": 1.0, "green": 1.0, "blue": 1.0},
                                "bold": True, "fontSize": 11
                            },
                            "horizontalAlignment": "CENTER"
                        }
                    },
                    "fields": "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)"
                }
            },
            {
                "repeatCell": {
                    "range": {
                        "sheetId": sayfa_id,
                        "startRowIndex": 1,
                        "startColumnIndex": 6,
                        "endColumnIndex": 7
                    },
                    "cell": {
                        "userEnteredFormat": {
                            "numberFormat": {"type": "NUMBER", "pattern": "#,##0.00"}
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
    Tek bir kaydı ilgili ay sayfasına kaydeder.
    tip: 'kisisel', 'isletme' veya 'yatirim'
    """
    try:
        sheets = _sheets_baglantisi()
        harcama_dt = _tarih_parse(harcama["tarih"])
        sayfa_adi = _sayfa_adi_olustur(harcama_dt)

        if not _sayfa_var_mi(sheets, sayfa_adi):
            _sayfa_olustur(sheets, sayfa_adi)

        gun_adi = GUNLER_TR[harcama_dt.weekday()]
        tip_raw = harcama.get("tip", "kisisel").lower().strip()
        tip_tr = TIP_ETIKETI.get(tip_raw, "Kişisel")
        saat = harcama.get("saat", "—")

        yeni_satir = [[
            harcama["tarih"],
            gun_adi,
            saat,
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

        _ozet_guncelle(sheets, harcama_dt, float(harcama["tutar"]), tip_raw)
        return True

    except Exception as e:
        print(f"Sheets kayıt hatası: {e}")
        return False


def _ozet_guncelle(sheets, harcama_dt: datetime, tutar: float, tip: str):
    """📊 Özet sayfasını günceller — artık Yatırım sütunu da var."""
    try:
        ozet_sayfa = "📊 Özet"
        if not _sayfa_var_mi(sheets, ozet_sayfa):
            _ozet_sayfasi_olustur(sheets, ozet_sayfa)

        result = sheets.values().get(
            spreadsheetId=SHEETS_ID,
            range=f"'{ozet_sayfa}'!A:E"
        ).execute()
        satirlar = result.get("values", [])

        ay_adi = _sayfa_adi_olustur(harcama_dt)
        ay_bulundu = False

        for i, satir in enumerate(satirlar):
            if satir and satir[0] == ay_adi:
                kisisel = _safe_float(satir, 1)
                isletme = _safe_float(satir, 2)
                yatirim = _safe_float(satir, 3)

                if tip == "kisisel":
                    kisisel += tutar
                elif tip == "isletme":
                    isletme += tutar
                elif tip == "yatirim":
                    yatirim += tutar

                toplam = kisisel + isletme + yatirim
                sheets.values().update(
                    spreadsheetId=SHEETS_ID,
                    range=f"'{ozet_sayfa}'!B{i+1}:E{i+1}",
                    valueInputOption="USER_ENTERED",
                    body={"values": [[kisisel, isletme, yatirim, toplam]]}
                ).execute()
                ay_bulundu = True
                break

        if not ay_bulundu:
            kisisel = tutar if tip == "kisisel" else 0.0
            isletme = tutar if tip == "isletme" else 0.0
            yatirim = tutar if tip == "yatirim" else 0.0
            toplam = kisisel + isletme + yatirim
            sheets.values().append(
                spreadsheetId=SHEETS_ID,
                range=f"'{ozet_sayfa}'!A:E",
                valueInputOption="USER_ENTERED",
                insertDataOption="INSERT_ROWS",
                body={"values": [[ay_adi, kisisel, isletme, yatirim, toplam]]}
            ).execute()

    except Exception as e:
        print(f"Özet güncelleme hatası: {e}")


def _safe_float(satir: list, index: int) -> float:
    try:
        return float(str(satir[index]).replace(",", ".")) if len(satir) > index and satir[index] else 0.0
    except:
        return 0.0


def _ozet_sayfasi_olustur(sheets, sayfa_adi: str):
    body = {
        "requests": [{
            "addSheet": {
                "properties": {
                    "title": sayfa_adi,
                    "index": 0,
                    "gridProperties": {"rowCount": 100, "columnCount": 6}
                }
            }
        }]
    }
    sheets.batchUpdate(spreadsheetId=SHEETS_ID, body=body).execute()

    # Yatırım sütunu eklendi
    baslik = [["Ay", "Kişisel (₺)", "İşletme (₺)", "Yatırım (₺)", "Toplam (₺)"]]
    sheets.values().update(
        spreadsheetId=SHEETS_ID,
        range=f"'{sayfa_adi}'!A1:E1",
        valueInputOption="RAW",
        body={"values": baslik}
    ).execute()

    sayfa_id = _sayfa_id_al(sheets, sayfa_adi)
    format_body = {
        "requests": [{
            "repeatCell": {
                "range": {"sheetId": sayfa_id, "startRowIndex": 0, "endRowIndex": 1},
                "cell": {
                    "userEnteredFormat": {
                        "backgroundColor": {"red": 0.13, "green": 0.37, "blue": 0.64},
                        "textFormat": {
                            "foregroundColor": {"red": 1.0, "green": 1.0, "blue": 1.0},
                            "bold": True, "fontSize": 11
                        },
                        "horizontalAlignment": "CENTER"
                    }
                },
                "fields": "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)"
            }
        }]
    }
    sheets.batchUpdate(spreadsheetId=SHEETS_ID, body=format_body).execute()
