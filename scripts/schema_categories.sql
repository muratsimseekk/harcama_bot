-- Harcama Bot — Faz M2: düzenlenebilir kategoriler
-- Supabase dashboard → SQL Editor → yapıştır → Run
-- Önkoşul: scripts/schema.sql + scripts/schema_mobile.sql çalıştırılmış olmalı.

create table if not exists public.categories (
    id          uuid primary key default gen_random_uuid(),
    user_id     text not null,
    name        text not null,
    type        text not null check (type in ('kisisel', 'isletme', 'yatirim')),
    color       text,
    keywords    text[] not null default '{}',
    is_active   boolean not null default true,
    sort_order  int not null default 0,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

-- aynı kullanıcıda + aynı bölümde (tip) aynı isim (büyük/küçük harf duyarsız) bir kez.
-- Farklı bölümlerde aynı ad olabilir (örn. "Fatura" hem kişisel hem işletme).
create unique index if not exists ux_categories_user_type_name
    on public.categories (user_id, type, lower(name));
create index if not exists ix_categories_user_active
    on public.categories (user_id, is_active);

alter table public.categories enable row level security;

drop policy if exists "kendi kategorilerini gör" on public.categories;
create policy "kendi kategorilerini gör" on public.categories
    for select using (auth.uid()::text = user_id);

drop policy if exists "kendi kategorisini ekle" on public.categories;
create policy "kendi kategorisini ekle" on public.categories
    for insert with check (auth.uid()::text = user_id);

drop policy if exists "kendi kategorisini güncelle" on public.categories;
create policy "kendi kategorisini güncelle" on public.categories
    for update using (auth.uid()::text = user_id);

drop policy if exists "kendi kategorisini sil" on public.categories;
create policy "kendi kategorisini sil" on public.categories
    for delete using (auth.uid()::text = user_id);
