-- Free (reklamlı) katman — ödüllü reklam kredileri (günlük "enerji" sistemi).
-- Supabase SQL Editor'de elle çalıştırılır. Kredi, AdMob Server-Side Verification (SSV)
-- callback'i doğrulandıktan sonra api/routes/reklam.py::ssv_callback() tarafından yazılır.
-- Tavan YOK — kullanıcı istediği kadar reklam izleyip kredi kazanabilir.
--
-- "Bugün kazanılan kredi" hesaplanışı api/usage.py::_gun_ad_kredisi ile birebir aynı desen:
-- transactions tablosundaki _gun_kayit_sayisi gibi, created_at >= gün başı satırları toplanır.

create table if not exists public.ad_rewards (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  ad_network      text not null default 'admob',
  transaction_id  text not null,          -- AdMob SSV transaction_id → idempotency anahtarı
  credited_amount int not null,           -- bu ödülün verdiği kayıt hakkı (AD_KREDI_ADET anında donuk)
  created_at      timestamptz not null default now()
);

-- Aynı SSV callback'i (Google retry ederse) ikinci kez kredi vermesin.
create unique index if not exists ad_rewards_txn_uniq
  on public.ad_rewards (ad_network, transaction_id);

-- "Bugün kaç kredi" sorguları user_id + created_at ile filtreleniyor.
create index if not exists ad_rewards_user_created_idx
  on public.ad_rewards (user_id, created_at);

alter table public.ad_rewards enable row level security;

-- Yalnız service_role yazar (SSV endpoint'i service key ile çalışır); kullanıcı yalnız
-- kendi satırlarını okuyabilir (opsiyonel — /v1/me zaten toplamı döndürüyor).
drop policy if exists "kendi reklam kredilerini gör" on public.ad_rewards;
create policy "kendi reklam kredilerini gör" on public.ad_rewards for select
  using (auth.uid() = user_id);
