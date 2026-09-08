-- Faz 6 — Hane / aile paylaşımı.
-- Supabase dashboard → SQL Editor → yapıştır → Run. Idempotent.
-- Önkoşul: scripts/schema.sql + scripts/schema_mobile.sql çalıştırılmış olmalı.

create table if not exists public.households (
    id          uuid primary key default gen_random_uuid(),
    ad          text not null,
    kod         text not null unique,        -- 6 karakter, ABCDEFGHJKLMNPQRSTUVWXYZ23456789
    owner_id    text not null,               -- Supabase auth uid
    created_at  timestamptz not null default now()
);

create table if not exists public.household_members (
    household_id uuid not null references public.households(id) on delete cascade,
    user_id      text not null,
    ad           text not null,              -- üye listesi UI'ı için denormalize ad
    rol          text not null check (rol in ('owner', 'editor', 'viewer')),
    joined_at    timestamptz not null default now(),
    primary key (household_id, user_id)
);

-- Bir kullanıcı aynı anda en fazla bir hanede.
create unique index if not exists ux_hh_one_per_user on public.household_members (user_id);

alter table public.households enable row level security;
alter table public.household_members enable row level security;

-- Savunma katmanı: API service_role ile bu politikaları bypass eder, ama şema
-- tutarlılığı ve ileride doğrudan-Supabase erişimi için tanımlı.

drop policy if exists "hane gör" on public.households;
create policy "hane gör" on public.households for select using (
    exists (select 1 from public.household_members m
            where m.household_id = id and m.user_id = auth.uid()::text)
);

drop policy if exists "hane kur" on public.households;
create policy "hane kur" on public.households for insert
    with check (auth.uid()::text = owner_id);

drop policy if exists "hane sahibi düzenler" on public.households;
create policy "hane sahibi düzenler" on public.households for update
    using (auth.uid()::text = owner_id);

drop policy if exists "hane sahibi siler" on public.households;
create policy "hane sahibi siler" on public.households for delete
    using (auth.uid()::text = owner_id);

drop policy if exists "üyeleri gör" on public.household_members;
create policy "üyeleri gör" on public.household_members for select using (
    household_id in (
        select household_id from public.household_members where user_id = auth.uid()::text
    )
);

drop policy if exists "üye ekle" on public.household_members;
create policy "üye ekle" on public.household_members for insert with check (
    user_id = auth.uid()::text
    or exists (select 1 from public.households h
               where h.id = household_id and h.owner_id = auth.uid()::text)
);

drop policy if exists "owner rol değiştirir" on public.household_members;
create policy "owner rol değiştirir" on public.household_members for update using (
    exists (select 1 from public.households h
            where h.id = household_id and h.owner_id = auth.uid()::text)
);

drop policy if exists "ayrıl / owner çıkarır" on public.household_members;
create policy "ayrıl / owner çıkarır" on public.household_members for delete using (
    user_id = auth.uid()::text
    or exists (select 1 from public.households h
               where h.id = household_id and h.owner_id = auth.uid()::text)
);
