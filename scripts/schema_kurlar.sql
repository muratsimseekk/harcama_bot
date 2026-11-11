-- ------------------------------------------------------------------ --
-- kurlar: TCMB günlük döviz satış kurları (1 USD / 1 EUR kaç TL)
-- Uygulamada ₺ / $ / € gösterimi için; her işlem kendi gününün kuruyla çevrilir.
-- Yalnız iş günleri (bülten yayınlanan günler) satır alır; hafta sonu/tatil için
-- önceki iş gününün kuru kullanılır (core/kur.py).
-- Doldurma: python scripts/kur_doldur.py
-- ------------------------------------------------------------------ --
create table if not exists public.kurlar (
    tarih       date primary key,
    usd         numeric(14, 6) not null check (usd > 0),
    eur         numeric(14, 6) not null check (eur > 0),
    kaynak      text not null default 'tcmb',   -- tcmb | ecb (yedek)
    created_at  timestamptz not null default now()
);

alter table public.kurlar enable row level security;
-- Yalnız service_role yazar/okur (API üzerinden); kullanıcı politikası yok.
