-- Paraİzi — kategori başına "limit" (üst sınır) ya da "hedef" (ulaşılacak tutar)
-- Supabase dashboard → SQL Editor → yapıştır → Run. Tekrar çalıştırmak güvenli.
-- Önkoşul: schema_budgets.sql

alter table public.budgets
    add column if not exists tur text not null default 'limit';

alter table public.budgets drop constraint if exists budgets_tur_check;
alter table public.budgets
    add constraint budgets_tur_check check (tur in ('limit', 'hedef'));
