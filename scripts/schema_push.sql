-- Harcama Bot — Faz 0: push bildirim altyapısı
-- Supabase dashboard → SQL Editor → yapıştır → Run
-- Önkoşul: schema.sql + schema_mobile.sql çalıştırılmış olmalı.

-- ------------------------------------------------------------------ --
-- push_tokens: cihaz başına Expo push token'ı
-- ------------------------------------------------------------------ --
create table if not exists public.push_tokens (
    id          uuid primary key default gen_random_uuid(),
    user_id     text not null,
    token       text not null unique,
    platform    text,                     -- 'ios' | 'android'
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

create index if not exists ix_push_tokens_user on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;

drop policy if exists "kendi token'larını gör" on public.push_tokens;
create policy "kendi token'larını gör" on public.push_tokens
    for select using (auth.uid()::text = user_id);
drop policy if exists "kendi token'ını ekle" on public.push_tokens;
create policy "kendi token'ını ekle" on public.push_tokens
    for insert with check (auth.uid()::text = user_id);
drop policy if exists "kendi token'ını güncelle" on public.push_tokens;
create policy "kendi token'ını güncelle" on public.push_tokens
    for update using (auth.uid()::text = user_id);
drop policy if exists "kendi token'ını sil" on public.push_tokens;
create policy "kendi token'ını sil" on public.push_tokens
    for delete using (auth.uid()::text = user_id);

-- ------------------------------------------------------------------ --
-- notifications_sent: aynı bildirimi dönemde bir kez göndermek için
-- anahtar örn: 'butce:Market:2026-09', 'butce_asti:genel:2026-09'
-- ------------------------------------------------------------------ --
create table if not exists public.notifications_sent (
    user_id       text not null,
    anahtar       text not null,
    gonderildi_at timestamptz not null default now(),
    primary key (user_id, anahtar)
);

alter table public.notifications_sent enable row level security;
-- Yalnız service_role yazar/okur; kullanıcı politikası yok (varsayılan: erişim yok).
