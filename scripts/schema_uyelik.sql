-- Üyelik katmanları: Deneme (trial) → Base → Pro.
-- Supabase dashboard → SQL Editor → yapıştır → Run. Idempotent.
-- Önkoşul: scripts/schema_mobile.sql çalıştırılmış olmalı (profiles tablosu var).

alter table public.profiles
  add column if not exists trial_bitis timestamptz,
  add column if not exists plan_bitis  timestamptz;   -- Faz 0.5: ödeme bitişi (RevenueCat)

alter table public.profiles drop constraint if exists profiles_plan_check;
alter table public.profiles
  add constraint profiles_plan_check check (plan in ('free', 'trial', 'base', 'pro'));

-- Yeni kayıt olan her kullanıcı → 7 günlük tam deneme
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, plan, trial_bitis)
  values (new.id, 'trial', now() + interval '7 days')
  on conflict (id) do nothing;
  return new;
end;
$$;

-- (Trigger zaten schema_mobile.sql'de tanımlı; fonksiyon güncellenince otomatik geçerli.)

-- Mevcut 'free' satırları (varsa test kullanıcıları): kod tarafında 'base' gibi davranır,
-- ayrıca burada da geçirebilirsin:
-- update public.profiles set plan = 'base' where plan = 'free';
