-- Migration: kategori adı benzersizliği bölüm (tip) bazlı olsun.
-- Önce: (user_id, lower(name)) → aynı ad tüm bölümlerde bir kez.
-- Sonra: (user_id, type, lower(name)) → aynı ad farklı bölümlerde olabilir.
-- Supabase dashboard → SQL Editor → yapıştır → Run. Idempotent.

drop index if exists public.ux_categories_user_name;

create unique index if not exists ux_categories_user_type_name
    on public.categories (user_id, type, lower(name));
