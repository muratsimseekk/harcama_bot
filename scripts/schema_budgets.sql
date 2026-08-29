-- Harcama Bot — Faz M3: bütçe / hedef katmanı
-- Supabase dashboard → SQL Editor → yapıştır → Run
-- Önkoşul: schema.sql + schema_mobile.sql + schema_categories.sql çalıştırılmış olmalı.

-- ------------------------------------------------------------------ --
-- budgets: aylık harcama limitleri (genel / kategori / tür)
-- ------------------------------------------------------------------ --
create table if not exists public.budgets (
    id            uuid primary key default gen_random_uuid(),
    user_id       text not null,
    kapsam        text not null check (kapsam in ('genel', 'kategori', 'tip')),
    kapsam_deger  text,                         -- kategori adı ya da tür; 'genel' ise null
    period        text not null default 'month',
    limit_amount  numeric(14, 2) not null check (limit_amount > 0),
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now()
);

create unique index if not exists ux_budgets_user_scope
    on public.budgets (user_id, kapsam, coalesce(kapsam_deger, ''));

alter table public.budgets enable row level security;

drop policy if exists "kendi bütçelerini gör" on public.budgets;
create policy "kendi bütçelerini gör" on public.budgets
    for select using (auth.uid()::text = user_id);
drop policy if exists "kendi bütçesini ekle" on public.budgets;
create policy "kendi bütçesini ekle" on public.budgets
    for insert with check (auth.uid()::text = user_id);
drop policy if exists "kendi bütçesini güncelle" on public.budgets;
create policy "kendi bütçesini güncelle" on public.budgets
    for update using (auth.uid()::text = user_id);
drop policy if exists "kendi bütçesini sil" on public.budgets;
create policy "kendi bütçesini sil" on public.budgets
    for delete using (auth.uid()::text = user_id);

-- ------------------------------------------------------------------ --
-- goals: aylık yatırım / birikim hedefi
-- ------------------------------------------------------------------ --
create table if not exists public.goals (
    id            uuid primary key default gen_random_uuid(),
    user_id       text not null,
    period        text not null default 'month',
    tip           text not null default 'yatirim',
    hedef_amount  numeric(14, 2) not null check (hedef_amount > 0),
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now()
);

create unique index if not exists ux_goals_user_tip on public.goals (user_id, tip, period);

alter table public.goals enable row level security;

drop policy if exists "kendi hedeflerini gör" on public.goals;
create policy "kendi hedeflerini gör" on public.goals
    for select using (auth.uid()::text = user_id);
drop policy if exists "kendi hedefini ekle" on public.goals;
create policy "kendi hedefini ekle" on public.goals
    for insert with check (auth.uid()::text = user_id);
drop policy if exists "kendi hedefini güncelle" on public.goals;
create policy "kendi hedefini güncelle" on public.goals
    for update using (auth.uid()::text = user_id);
drop policy if exists "kendi hedefini sil" on public.goals;
create policy "kendi hedefini sil" on public.goals
    for delete using (auth.uid()::text = user_id);
