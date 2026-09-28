-- Üyelik katmanları: Free (reklamlı) → Pro. Deneme (trial) kaldırıldı.
-- Supabase dashboard → SQL Editor → yapıştır → Run. Idempotent.
-- Önkoşul: scripts/schema_mobile.sql çalıştırılmış olmalı (profiles tablosu var).

alter table public.profiles
  add column if not exists trial_bitis timestamptz,   -- artık yazılmıyor, geriye dönük uyumluluk için duruyor
  add column if not exists plan_bitis  timestamptz;   -- Faz 0.5: ödeme bitişi (RevenueCat)

alter table public.profiles drop constraint if exists profiles_plan_check;
alter table public.profiles
  add constraint profiles_plan_check check (plan in ('free', 'trial', 'base', 'pro'));

-- Yeni kayıt olan her kullanıcı → doğrudan Free (reklamlı) katman, deneme yok.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, plan)
  values (new.id, 'free')
  on conflict (id) do nothing;
  return new;
end;
$$;

-- (Trigger zaten schema_mobile.sql'de tanımlı; fonksiyon güncellenince otomatik geçerli.)

-- Mevcut 'trial' satırları (bu değişiklikten önce kayıt olmuş test kullanıcıları):
-- API kodu artık 'trial'ı da 'free' gibi davranıyor, ama veriyi de temizlemek istersen:
update public.profiles set plan = 'free', trial_bitis = null where plan = 'trial';
