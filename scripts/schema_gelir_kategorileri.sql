-- Migration: gelir kategorileri — categories.type artık 'gelir' de olabilir.
-- API'yi deploy etmeden ÖNCE çalıştır.
-- Supabase dashboard → SQL Editor → yapıştır → Run. Idempotent.

do $$
declare
    ad text;
begin
    -- type kolonundaki mevcut CHECK kısıtını adından bağımsız bul ve kaldır.
    for ad in
        select conname from pg_constraint
        where conrelid = 'public.categories'::regclass
          and contype = 'c'
          and pg_get_constraintdef(oid) like '%type%'
    loop
        execute format('alter table public.categories drop constraint %I', ad);
    end loop;
end $$;

alter table public.categories
    add constraint categories_type_check
    check (type in ('kisisel', 'isletme', 'yatirim', 'gelir'));
