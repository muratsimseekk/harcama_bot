"""Yapay zekanın çıkardığı adayların kategorisini kullanıcının verisiyle tamamlar. Saf — I/O yok.

Sıra (ilk uyan kazanır):
  1. Geçmiş: kullanıcı aynı açıklamayı daha önce kategorilediyse o kategori (AI'ı da geçersiz
     kılar — kullanıcının kendi seçimi/düzeltmesi modelin tahmininden güvenilirdir).
  2. Anahtar kelime: AI boş bıraktıysa açıklama kategori adı/anahtar kelimesiyle eşleşiyor mu?
  3. AI önerisi: hâlâ boşsa AI'ın önerdiği YENİ kategori adı kalır; onay ekranı
     "bu kategori olsun mu?" diye sorar. Ad zaten varsa soru sormadan o kategori seçilir.
"""
from __future__ import annotations

import re

from core.models import Candidate, Category
from core.varsayilan_kategoriler import digermi, kucuk_tr

_GECMIS_NEDEN = "Daha önce böyle kategorilemiştin"

# Tek başına ayırt edici olmayan açıklamalar geçmişten öğrenilmez.
_JENERIK = {
    "harcama", "ödeme", "odeme", "gider", "gelir", "masraf", "şey", "sey", "para",
    "belirsiz harcama", "-", "—", "x",
}


def _ogrenilebilir(aciklama: str) -> bool:
    n = kucuk_tr(aciklama)
    return len(n) >= 3 and n not in _JENERIK


def gecmis_haritasi(satirlar: list[dict]) -> dict[tuple[str, str], tuple[str, str]]:
    """Kayıt satırları (en yeni önce) → {(yön, açıklama): (kategori, tip)}. En yeni seçim kazanır."""
    harita: dict[tuple[str, str], tuple[str, str]] = {}
    for r in satirlar:
        aciklama = r.get("description") or ""
        kategori = (r.get("category") or "").strip()
        if not kategori or digermi(kategori) or not _ogrenilebilir(aciklama):
            continue
        anahtar = (r.get("direction") or "gider", kucuk_tr(aciklama))
        harita.setdefault(anahtar, (kategori, r.get("type") or "kisisel"))
    return harita


def _anahtar_kelime_eslesmesi(aciklama: str, uygun: list[Category], tip: str) -> Category | None:
    """En uzun eşleşen kelime kazanır (daha özgül); eşitlikte adayın kendi bölümü."""
    metin = kucuk_tr(aciklama)
    en_iyi: tuple[int, bool] | None = None
    secilen: Category | None = None
    for k in uygun:
        if digermi(k.name):
            continue
        for kelime in {kucuk_tr(k.name), *(kucuk_tr(x) for x in k.keywords)}:
            if kelime and re.search(rf"(?<!\w){re.escape(kelime)}(?!\w)", metin):
                puan = (len(kelime), k.tip == tip)
                if en_iyi is None or puan > en_iyi:
                    en_iyi, secilen = puan, k
    return secilen


def kategorileri_tamamla(
    adaylar: list[Candidate], kategoriler: list[Category], gecmis_satirlari: list[dict],
) -> None:
    """Adayları yerinde günceller. Kategori listesi yoksa (yüklenemediyse) dokunmaz."""
    if not kategoriler:
        return
    gecmis = gecmis_haritasi(gecmis_satirlari)

    for a in adaylar:
        gelirde = a.direction == "gelir"
        uygun = [k for k in kategoriler if (k.tip == "gelir") == gelirde]
        ada_gore: dict[str, Category] = {}
        for k in uygun:
            # Aynı ad birden çok bölümde olabilir → adayın kendi bölümündeki öncelikli.
            if kucuk_tr(k.name) not in ada_gore or k.tip == a.tip:
                ada_gore[kucuk_tr(k.name)] = k

        hedef = gecmis.get((a.direction, kucuk_tr(a.aciklama)))
        if hedef:
            # Kategori silinmiş/gizlenmişse geçmiş yok sayılır.
            kayitli_ad, kayitli_tip = hedef
            k = next(
                (x for x in uygun if kucuk_tr(x.name) == kucuk_tr(kayitli_ad) and x.tip == kayitli_tip),
                ada_gore.get(kucuk_tr(kayitli_ad)),
            )
            if k:
                _uygula(a, k)
                a.emin = True
                a.neden = _GECMIS_NEDEN
                continue

        if a.kategori:
            a.kategori_onerisi = ""
            continue

        k = _anahtar_kelime_eslesmesi(a.aciklama, uygun, a.tip)
        if k is None and a.kategori_onerisi:
            k = ada_gore.get(kucuk_tr(a.kategori_onerisi))
        if k:
            _uygula(a, k)


def _uygula(a: Candidate, k: Category) -> None:
    a.kategori = k.name
    a.kategori_onerisi = ""
    if k.tip != "gelir":
        # Seçici kategorileri bölüme göre süzüyor; bölüm uyuşmazsa seçili görünmez.
        a.tip = k.tip
