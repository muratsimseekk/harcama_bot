from datetime import timedelta

from api.usage import _coz
from core.config import settings
from core.dates import now


def test_pro_sinirsiz():
    d = _coz({"plan": "pro", "trial_bitis": None})
    assert d.etkin == "pro" and d.pro and d.ai_limit >= 10**9


def test_trial_aktif_sinirsiz_ai_ama_hane_yok():
    # Deneme = Base özellikleri + sınırsız AI; hane KAPALI (.pro False)
    tb = (now() + timedelta(days=3)).isoformat()
    d = _coz({"plan": "trial", "trial_bitis": tb})
    assert d.etkin == "base" and not d.pro
    assert d.ai_limit >= 10**9


def test_trial_bitmis_base_olur():
    tb = (now() - timedelta(days=1)).isoformat()
    d = _coz({"plan": "trial", "trial_bitis": tb})
    assert d.etkin == "base" and not d.pro
    assert d.ai_limit == settings.BASE_AI_AYLIK


def test_base_limitli():
    d = _coz({"plan": "base", "trial_bitis": None})
    assert d.etkin == "base" and d.ai_limit == settings.BASE_AI_AYLIK


def test_free_legacy_base_gibi():
    d = _coz({"plan": "free", "trial_bitis": None})
    assert d.etkin == "base"


def test_trial_tarihsiz_base():
    d = _coz({"plan": "trial", "trial_bitis": None})
    assert d.etkin == "base"
