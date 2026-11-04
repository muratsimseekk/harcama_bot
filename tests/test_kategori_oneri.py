from datetime import date

from core.kategori_oneri import gecmis_haritasi, kategorileri_tamamla
from core.models import Candidate, Category
from core.review import incele


def _cat(ad, tip="kisisel", keywords=()):
    return Category(id=ad, user_id="u", name=ad, tip=tip, keywords=list(keywords))


def _aday(aciklama, kategori="", oneri="", yon="gider", tip="kisisel", emin=False):
    return Candidate(
        aciklama=aciklama, tutar=100, kategori=kategori, kategori_onerisi=oneri,
        direction=yon, tip=tip, emin=emin, tarih=date.today(),
    )


def _satir(aciklama, kategori, tip="kisisel", yon="gider"):
    return {"description": aciklama, "category": kategori, "type": tip, "direction": yon}


KATEGORILER = [
    _cat("Market", keywords=["bakkal"]),
    _cat("Evcil", keywords=["mama"]),
    _cat("Kira", tip="isletme", keywords=["dükkan kirası"]),
    _cat("Kira Geliri", tip="gelir", keywords=["kiracı", "kira geldi"]),
    _cat("Çek Tahsilatı", tip="gelir", keywords=["çek"]),
]


def test_gecmis_ai_kategorisini_gecersiz_kilar():
    a = _aday("Kedi kumu", kategori="Market", emin=True)
    kategorileri_tamamla([a], KATEGORILER, [_satir("kedi kumu", "Evcil")])
    assert a.kategori == "Evcil"
    assert a.neden == "Daha önce böyle kategorilemiştin"


def test_gecmis_bos_kategoriyi_doldurur_ve_inceleme_sebebini_kaldirir():
    a = _aday("Kedi kumu", oneri="Hayvan")
    kategorileri_tamamla([a], KATEGORILER, [_satir("KEDİ KUMU", "Evcil")])
    assert a.kategori == "Evcil" and a.kategori_onerisi == "" and a.emin is True
    assert incele(a) == []


def test_gecmis_en_yeni_secim_kazanir():
    harita = gecmis_haritasi([_satir("kahve", "Yeni"), _satir("kahve", "Eski")])
    assert harita[("gider", "kahve")][0] == "Yeni"


def test_gecmis_jenerik_aciklamadan_ogrenmez():
    assert gecmis_haritasi([_satir("Harcama", "Market"), _satir("şey", "Market")]) == {}


def test_gecmis_diger_kategorisinden_ogrenmez():
    assert gecmis_haritasi([_satir("kahve", "Diğer")]) == {}


def test_gecmis_silinmis_kategoriye_dusmez():
    a = _aday("Kedi kumu", oneri="Hayvan")
    kategorileri_tamamla([a], KATEGORILER, [_satir("kedi kumu", "Silinmiş")])
    assert a.kategori == "" and a.kategori_onerisi == "Hayvan"


def test_gecmis_yon_karismaz():
    """Kira gelir olarak kaydedildiyse aynı açıklamalı gider ondan etkilenmez."""
    a = _aday("Kira", yon="gider", oneri="Konut")
    kategorileri_tamamla(
        [a], [_cat("Kira Geliri", tip="gelir")], [_satir("kira", "Kira Geliri", yon="gelir")],
    )
    assert a.kategori == "" and a.kategori_onerisi == "Konut"


def test_gecmis_kategorinin_bolumunu_de_alir():
    a = _aday("Depo", tip="kisisel")
    kategorileri_tamamla([a], KATEGORILER, [_satir("depo", "Kira", tip="isletme")])
    assert a.kategori == "Kira" and a.tip == "isletme"


def test_anahtar_kelime_ai_bos_biraktiginda_doldurur():
    a = _aday("Kedi için mama", oneri="Hayvan")
    kategorileri_tamamla([a], KATEGORILER, [])
    assert a.kategori == "Evcil" and a.kategori_onerisi == ""


def test_anahtar_kelime_kelime_sinirina_bakar():
    """'çek' kelimesi 'içecek' içinde eşleşmemeli."""
    a = _aday("İçecek parası", yon="gelir")
    kategorileri_tamamla([a], KATEGORILER, [])
    assert a.kategori == ""


def test_anahtar_kelime_gelirde_yalniz_gelir_kategorilerine_bakar():
    a = _aday("Bakkal kiracı", yon="gelir")
    kategorileri_tamamla([a], KATEGORILER, [])
    assert a.kategori == "Kira Geliri"


def test_anahtar_kelime_en_uzun_eslesme_kazanir():
    kategoriler = [_cat("Fatura", keywords=["su"]), _cat("Su Arıtma", keywords=["su arıtma"])]
    a = _aday("Su arıtma filtresi")
    kategorileri_tamamla([a], kategoriler, [])
    assert a.kategori == "Su Arıtma"


def test_oneri_mevcut_kategoriyse_dogrudan_secilir():
    a = _aday("Sebze", oneri="market")
    kategorileri_tamamla([a], KATEGORILER, [])
    assert a.kategori == "Market" and a.kategori_onerisi == ""


def test_oneri_yeniyse_kalir():
    a = _aday("Bilgisayar tamiri", oneri="Teknoloji")
    kategorileri_tamamla([a], KATEGORILER, [])
    assert a.kategori == "" and a.kategori_onerisi == "Teknoloji"


def test_kategori_doluysa_oneri_silinir():
    a = _aday("Sebze", kategori="Market", oneri="Gıda")
    kategorileri_tamamla([a], KATEGORILER, [])
    assert a.kategori == "Market" and a.kategori_onerisi == ""


def test_kategori_listesi_yoksa_dokunmaz():
    a = _aday("Kedi kumu", oneri="Hayvan")
    kategorileri_tamamla([a], [], [_satir("kedi kumu", "Evcil")])
    assert a.kategori == "" and a.kategori_onerisi == "Hayvan"
