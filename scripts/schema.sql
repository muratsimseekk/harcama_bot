-- Harcama Bot — Supabase şeması
-- Supabase dashboard → SQL Editor → yapıştır → Run

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------------ --
-- transactions: tek veri kaynağı (gider + gelir)
-- ------------------------------------------------------------------ --
create table if not exists public.transactions (
    id           uuid primary key default gen_random_uuid(),
    user_id      text not null,
    direction    text not null default 'gider' check (direction in ('gider', 'gelir')),
    type         text not null check (type in ('kisisel', 'isletme', 'yatirim')),
    category     text not null,
    description  text not null,
    amount       numeric(14, 2) not null check (amount > 0),
    currency     text not null default 'TRY',
    occurred_on  date not null,
    occurred_at  timestamptz,
    source       text not null default 'telegram_text',
    raw_input    text,
    note         text,
    deleted_at   timestamptz,
    created_at   timestamptz not null default now(),
    updated_at   timestamptz not null default now()
);

create index if not exists ix_tx_user_date on public.transactions (user_id, occurred_on);
create index if not exists ix_tx_user_type on public.transactions (user_id, type);
create index if not exists ix_tx_user_cat  on public.transactions (user_id, category);
create index if not exists ix_tx_live      on public.transactions (user_id, deleted_at);

alter table public.transactions enable row level security;
-- Şimdilik yalnız service_role erişir (bot). Mobilde auth.uid() politikaları eklenecek.

-- ------------------------------------------------------------------ --
-- pending_transactions: onay bekleyen adaylar (bot restart'ına dayanır)
-- ------------------------------------------------------------------ --
create table if not exists public.pending_transactions (
    id          uuid primary key default gen_random_uuid(),
    user_id     text not null,
    chat_id     bigint not null,
    message_id  bigint not null,
    payload     jsonb not null,
    created_at  timestamptz not null default now()
);

alter table public.pending_transactions enable row level security;

-- Eski onayları temizlemek istersen (opsiyonel, manuel):
-- delete from public.pending_transactions where created_at < now() - interval '7 days';
