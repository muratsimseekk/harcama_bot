-- Tekrarlayan kayıtlar (kira, fatura, abonelik, maaş …): her ay `day_of_month` günü
-- otomatik eklenir. İşleme: uygulama açılınca POST /v1/tekrarlayan/isle (cron gerekmez).
-- Supabase SQL Editor'da bir kez çalıştırılır; tekrar çalıştırmak güvenli.

create table if not exists public.recurring (
    id             uuid primary key default gen_random_uuid(),
    user_id        text not null,
    description    text not null,
    amount         numeric(14, 2) not null check (amount > 0),
    category       text not null default '',
    type           text not null default 'kisisel',
    direction      text not null default 'gider' check (direction in ('gider', 'gelir')),
    day_of_month   smallint not null check (day_of_month between 1 and 31),
    start_on       date not null default current_date,
    last_added_on  date,                          -- en son eklenen kaydın tarihi
    is_active      boolean not null default true,
    created_at     timestamptz not null default now(),
    updated_at     timestamptz not null default now()
);

create index if not exists ix_recurring_user on public.recurring (user_id, is_active);

alter table public.recurring enable row level security;

drop policy if exists "kendi tekrarlayanlarını gör" on public.recurring;
create policy "kendi tekrarlayanlarını gör" on public.recurring
    for select using (auth.uid()::text = user_id);
drop policy if exists "kendi tekrarlayanını yönet" on public.recurring;
create policy "kendi tekrarlayanını yönet" on public.recurring
    for all using (auth.uid()::text = user_id) with check (auth.uid()::text = user_id);
