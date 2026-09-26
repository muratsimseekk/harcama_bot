from datetime import timedelta

from api.usage import _coz
from core.config import settings
from core.dates import now


def test_pro_sinirsiz():
    d = _coz({"plan": "pro", "trial_bitis": None})
    assert d.etkin == "pro" and d.pro and d.gunluk_limit >= 10**9


def test_pro_suresi_dolmus_free_olur():
    pb = (now() - timedelta(days=1)).isoformat()
    d = _coz({"plan": "pro", "trial_bitis": None, "plan_bitis": pb})
    assert d.etkin == "free" and not d.pro
    assert d.gunluk_limit == settings.GUNLUK_ENERJI


def test_trial_aktif_sinirsiz_ama_hane_yok():
    # Deneme = Free özellikleri + sınırsız günlük kayıt; hane KAPALI (.pro False)
    tb = (now() + timedelta(days=3)).isoformat()
    d = _coz({"plan": "trial", "trial_bitis": tb})
    assert d.etkin == "free" and not d.pro
    assert d.gunluk_limit >= 10**9


def test_trial_bitmis_free_olur():
    tb = (now() - timedelta(days=1)).isoformat()
    d = _coz({"plan": "trial", "trial_bitis": tb})
    assert d.etkin == "free" and not d.pro
    assert d.gunluk_limit == settings.GUNLUK_ENERJI


def test_trial_tarihsiz_free():
    d = _coz({"plan": "trial", "trial_bitis": None})
    assert d.etkin == "free"


def test_free_limitli():
    d = _coz({"plan": "free", "trial_bitis": None})
    assert d.etkin == "free" and d.gunluk_limit == settings.GUNLUK_ENERJI


def test_legacy_base_free_gibi():
    # Base kaldırıldı; eski satırlar (varsa) Free davranışına düşer.
    d = _coz({"plan": "base", "trial_bitis": None})
    assert d.etkin == "free" and d.gunluk_limit == settings.GUNLUK_ENERJI


def test_reklam_kredisi_tabana_eklenir():
    d = _coz({"plan": "free", "trial_bitis": None}, ad_kredisi=6)
    assert d.gunluk_limit == settings.GUNLUK_ENERJI + 6


def test_trial_aktifken_reklam_kredisi_yoksayilir():
    tb = (now() + timedelta(days=3)).isoformat()
    d = _coz({"plan": "trial", "trial_bitis": tb}, ad_kredisi=6)
    assert d.gunluk_limit >= 10**9  # sınırsız zaten, kredi eklemenin anlamı yok
