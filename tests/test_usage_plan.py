from datetime import timedelta

from api.usage import _coz
from core.config import settings
from core.dates import now


def test_pro_sinirsiz():
    d = _coz({"plan": "pro"})
    assert d.etkin == "pro" and d.pro and d.gunluk_limit >= 10**9


def test_pro_suresi_dolmus_free_olur():
    pb = (now() - timedelta(days=1)).isoformat()
    d = _coz({"plan": "pro", "plan_bitis": pb})
    assert d.etkin == "free" and not d.pro
    assert d.gunluk_limit == settings.GUNLUK_ENERJI


def test_free_limitli():
    d = _coz({"plan": "free"})
    assert d.etkin == "free" and d.gunluk_limit == settings.GUNLUK_ENERJI


def test_legacy_trial_free_gibi():
    # Deneme kaldırıldı; eski 'trial' satırları (varsa) Free davranışına düşer.
    d = _coz({"plan": "trial", "trial_bitis": (now() + timedelta(days=3)).isoformat()})
    assert d.etkin == "free" and not d.pro
    assert d.gunluk_limit == settings.GUNLUK_ENERJI


def test_legacy_base_free_gibi():
    # Base kaldırıldı; eski satırlar (varsa) Free davranışına düşer.
    d = _coz({"plan": "base"})
    assert d.etkin == "free" and d.gunluk_limit == settings.GUNLUK_ENERJI


def test_reklam_kredisi_tabana_eklenir():
    d = _coz({"plan": "free"}, ad_kredisi=6)
    assert d.gunluk_limit == settings.GUNLUK_ENERJI + 6
