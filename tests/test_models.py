from datetime import date

from core.models import Candidate, Transaction, tip_normalize


def test_tip_normalize():
    assert tip_normalize("Kişisel") == "kisisel"
    assert tip_normalize("İşletme") == "isletme"
    assert tip_normalize("Yatırım") == "yatirim"
    assert tip_normalize("bilinmeyen") == "kisisel"


def test_candidate_dict_roundtrip():
    a = Candidate(
        aciklama="galvaniz", tutar=1500.0, kategori="Galvaniz", tip="isletme",
        direction="gider", tarih=date(2026, 5, 2), emin=False,
    )
    a2 = Candidate.from_dict(a.to_dict())
    assert (a2.aciklama, a2.tutar, a2.kategori, a2.tip, a2.tarih, a2.emin) == \
           (a.aciklama, a.tutar, a.kategori, a.tip, a.tarih, a.emin)


def test_candidate_to_row():
    a = Candidate(aciklama="kahve", tutar=90.0, kategori="Kafe/Restoran",
                  tip="kisisel", tarih=date(2026, 8, 28))
    row = a.to_row("123")
    assert row["user_id"] == "123"
    assert row["amount"] == 90.0
    assert row["occurred_on"] == "2026-08-28"
    assert row["direction"] == "gider"
    assert row["type"] == "kisisel"


def test_transaction_from_row():
    t = Transaction.from_row({
        "id": "abc", "user_id": "123", "direction": "gelir", "type": "Kişisel",
        "category": "Maaş", "description": "maaş", "amount": "45000.00",
        "currency": "TRY", "occurred_on": "2026-08-01", "source": "telegram_text",
        "created_at": "2026-08-01T09:00:00+00:00",
    })
    assert t.tutar == 45000.0
    assert t.tip == "kisisel"
    assert t.tarih == date(2026, 8, 1)
    assert t.direction == "gelir"
