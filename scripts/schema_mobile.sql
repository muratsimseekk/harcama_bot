-- Harcama Bot — Mobil (Faz M1) şema eki
-- Supabase dashboard → SQL Editor → yapıştır → Run
-- Önkoşul: scripts/schema.sql çalıştırılmış olmalı (transactions tablosu var).

-- ------------------------------------------------------------------ --
-- profiles: kullanıcı planı (free/pro)
-- ------------------------------------------------------------------ --
create table if not exists public.profiles (
    id         uuid primary key references auth.users(id) on delete cascade,
    plan       text not null default 'free' check (plan in ('free', 'pro')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "kendi profilini gör" on public.profiles;
create policy "kendi profilini gör" on public.profiles
    for select using (auth.uid() = id);

drop policy if exists "kendi profilini güncelle" on public.profiles;
create policy "kendi profilini güncelle" on public.profiles
    for update using (auth.uid() = id);

-- Yeni kayıt olan her kullanıcı için otomatik profiles satırı
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
    insert into public.profiles (id) values (new.id)
    on conflict (id) do nothing;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- ------------------------------------------------------------------ --
-- transactions: mobil kullanıcılar için RLS politikaları
-- (Telegram botu + API service_role anahtarıyla bu politikaları bypass eder;
--  bunlar uygulamanın ileride doğrudan Supabase'e konuşması için savunma katmanı.)
-- ------------------------------------------------------------------ --
drop policy if exists "kendi işlemlerini gör" on public.transactions;
create policy "kendi işlemlerini gör" on public.transactions
    for select using (auth.uid()::text = user_id);

drop policy if exists "kendi işlemini ekle" on public.transactions;
create policy "kendi işlemini ekle" on public.transactions
    for insert with check (auth.uid()::text = user_id);

drop policy if exists "kendi işlemini güncelle" on public.transactions;
create policy "kendi işlemini güncelle" on public.transactions
    for update using (auth.uid()::text = user_id);
