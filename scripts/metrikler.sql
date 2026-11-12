-- Paraİzi — ürün metrikleri (salt okuma; hiçbir şey yazmaz/değiştirmez)
-- Supabase → SQL Editor → istediğin sorguyu seçip Run. Her sorgu tek başına çalışır.
-- Uygulamaya SDK eklemeden, mevcut tablolardan: aktivasyon, elde tutma, günlük hak baskısı,
-- Pro dönüşümü, özellik benimseme. Ayrıntı ve yorum: docs/BUYUME-ANALIZI.md §4.
--
-- Ortak kurallar:
--  * Test/demo hesapları hariç: @nimustudio.com uzantılı e-postalar. Kendi kişisel hesabını da
--    hariç tutmak için her sorgudaki `haric` satırına ekle.
--  * "Etkinlik" = kullanıcının kendi eklediği kayıt. İçe aktarma ('import') ve otomatik
--    tekrarlayan ('tekrarlayan') sayılmaz. Silinen kayıtlar da sayılır (kullanıcı yine de geldi).
--  * Günler İstanbul saatine göre.
--  * Olgunlaşmamış kohortlar (gözlem penceresi bitmemiş) NULL döner; başarısız sayılmaz.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) Genel durum
-- ─────────────────────────────────────────────────────────────────────────────
with k as (
  select p.id::text uid, p.created_at, coalesce(p.plan, 'free') plan
  from public.profiles p join auth.users u on u.id = p.id
  where u.email not ilike '%@nimustudio.com'   -- haric
)
select
  count(*)                                                       as kullanici,
  count(*) filter (where created_at > now() - interval '7 days')  as yeni_7_gun,
  count(*) filter (where created_at > now() - interval '30 days') as yeni_30_gun,
  count(*) filter (where plan = 'pro')                            as pro
from k;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) Aktivasyon: kayıt olduktan sonra ilk kayda ne kadar sürede geçiliyor?
--    (en az 7 gün önce kayıt olan kullanıcılar — 7 günlük pencere dolmuş olsun)
-- ─────────────────────────────────────────────────────────────────────────────
with k as (
  select p.id::text uid, p.created_at
  from public.profiles p join auth.users u on u.id = p.id
  where u.email not ilike '%@nimustudio.com'   -- haric
    and p.created_at < now() - interval '7 days'
),
ilk as (
  select t.user_id, min(t.created_at) ilk_kayit
  from public.transactions t
  where coalesce(t.source, '') not in ('import', 'tekrarlayan')
  group by t.user_id
)
select
  count(*)                                                                         as kullanici,
  count(ilk.ilk_kayit)                                                             as hic_kayit_yapan,
  round(100.0 * count(*) filter (where ilk.ilk_kayit <= k.created_at + interval '1 day') / nullif(count(*), 0), 1)
                                                                                   as ilk_24_saatte_pct,
  round(100.0 * count(*) filter (where ilk.ilk_kayit <= k.created_at + interval '7 days') / nullif(count(*), 0), 1)
                                                                                   as ilk_7_gunde_pct,
  round((percentile_cont(0.5) within group (
          order by extract(epoch from ilk.ilk_kayit - k.created_at) / 60))::numeric, 1)
                                                                                   as medyan_dakika_ilk_kayda
from k left join ilk on ilk.user_id = k.uid;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3) Kayıt kaynağı (son 30 gün): sesli mi, yazılı mı, elle mi?
-- ─────────────────────────────────────────────────────────────────────────────
with k as (
  select p.id::text uid
  from public.profiles p join auth.users u on u.id = p.id
  where u.email not ilike '%@nimustudio.com'   -- haric
)
select
  case
    when t.source = 'mobile_voice' then 'sesli (AI)'
    when t.source in ('mobile_text', 'mobil_yazi') then 'yazılı (AI)'
    when t.source = 'mobile_manual' then 'elle form'
    when t.source = 'tekrarlayan' then 'tekrarlayan (otomatik)'
    else coalesce(t.source, '(boş)')
  end                                       as kaynak,
  count(*)                                  as kayit,
  count(distinct t.user_id)                 as kullanici,
  round(100.0 * count(*) / sum(count(*)) over (), 1) as pct
from public.transactions t join k on k.uid = t.user_id
where t.created_at > now() - interval '30 days'
  and coalesce(t.source, '') <> 'import'
group by 1
order by kayit desc;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4) Haftalık kohort elde tutma: kayıt haftasına göre, sonraki haftalarda geri gelenler (%)
--    h1 = kayıttan sonraki 1–7. gün, h2 = 8–14. gün, h4 = 22–28. gün
-- ─────────────────────────────────────────────────────────────────────────────
with k as (
  select p.id::text uid, (p.created_at at time zone 'Europe/Istanbul')::date kayit_gun
  from public.profiles p join auth.users u on u.id = p.id
  where u.email not ilike '%@nimustudio.com'   -- haric
),
akt as (
  select distinct t.user_id, (t.created_at at time zone 'Europe/Istanbul')::date gun
  from public.transactions t
  where coalesce(t.source, '') not in ('import', 'tekrarlayan')
),
kk as (
  select
    date_trunc('week', k.kayit_gun)::date hafta,
    k.uid,
    exists (select 1 from akt a where a.user_id = k.uid and a.gun between k.kayit_gun + 1  and k.kayit_gun + 7)  h1,
    exists (select 1 from akt a where a.user_id = k.uid and a.gun between k.kayit_gun + 8  and k.kayit_gun + 14) h2,
    exists (select 1 from akt a where a.user_id = k.uid and a.gun between k.kayit_gun + 22 and k.kayit_gun + 28) h4
  from k
)
select
  hafta,
  count(*) as kullanici,
  case when hafta + 13 < current_date then round(100.0 * count(*) filter (where h1) / count(*), 1) end as h1_pct,
  case when hafta + 20 < current_date then round(100.0 * count(*) filter (where h2) / count(*), 1) end as h2_pct,
  case when hafta + 34 < current_date then round(100.0 * count(*) filter (where h4) / count(*), 1) end as h4_pct
from kk
group by hafta
order by hafta desc;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5) Günlük kayıt hakkı baskısı (Free): hak ne sıklıkla doluyor, ilk gün doluyor mu?
--    GUNLUK_ENERJI = 3 varsayıldı (core/config.py). Plan bugünkü plandır (geçmiş değil).
-- ─────────────────────────────────────────────────────────────────────────────
with k as (
  select p.id::text uid, (p.created_at at time zone 'Europe/Istanbul')::date kayit_gun
  from public.profiles p join auth.users u on u.id = p.id
  where u.email not ilike '%@nimustudio.com'   -- haric
    and coalesce(p.plan, 'free') <> 'pro'
),
g as (
  select t.user_id, (t.created_at at time zone 'Europe/Istanbul')::date gun, count(*) n
  from public.transactions t join k on k.uid = t.user_id
  where coalesce(t.source, '') not in ('import', 'tekrarlayan')
  group by 1, 2
),
r as (
  select distinct user_id::text user_id, (created_at at time zone 'Europe/Istanbul')::date gun
  from public.ad_rewards
)
select
  count(*)                                                        as kayitli_gun,
  count(*) filter (where n >= 3)                                  as hak_dolan_gun,
  round(100.0 * count(*) filter (where n >= 3) / nullif(count(*), 0), 1) as hak_dolan_gun_pct,
  count(*) filter (where (g.user_id, g.gun) in (select user_id, gun from r)) as reklam_izlenen_gun,
  -- kayıt olduğu gün hakkını dolduranlar: ilk deneyimde duvara çarpanlar
  (select count(*) from g g2 join k on k.uid = g2.user_id and g2.gun = k.kayit_gun where g2.n >= 3)
                                                                  as ilk_gun_hak_dolan_kullanici,
  (select count(*) from g g2 join k on k.uid = g2.user_id and g2.gun = k.kayit_gun)
                                                                  as ilk_gun_kayit_yapan_kullanici
from g;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6) Pro dönüşümü (kaba): en az 14 gün önce kayıt olanlardan bugün Pro olanlar
--    Gerçek gelir, iptal ve yenileme için RevenueCat panosu esastır.
-- ─────────────────────────────────────────────────────────────────────────────
with k as (
  select p.id::text uid, coalesce(p.plan, 'free') plan
  from public.profiles p join auth.users u on u.id = p.id
  where u.email not ilike '%@nimustudio.com'   -- haric
    and p.created_at < now() - interval '14 days'
)
select
  count(*)                                                                      as kullanici,
  count(*) filter (where plan = 'pro')                                          as pro,
  round(100.0 * count(*) filter (where plan = 'pro') / nullif(count(*), 0), 2)  as pro_pct
from k;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7) Özellik benimseme: kullanıcıların yüzde kaçı hangi özelliği kurmuş?
-- ─────────────────────────────────────────────────────────────────────────────
with k as (
  select p.id::text uid
  from public.profiles p join auth.users u on u.id = p.id
  where u.email not ilike '%@nimustudio.com'   -- haric
)
select
  count(*) as kullanici,
  round(100.0 * count(*) filter (where exists (select 1 from public.budgets b
        where b.user_id::text = k.uid and b.kapsam = 'genel')) / nullif(count(*), 0), 1)               as aylik_sinir_pct,
  round(100.0 * count(*) filter (where exists (select 1 from public.budgets b
        where b.user_id::text = k.uid and b.kapsam <> 'genel' and coalesce(b.tur, 'limit') = 'limit')) / nullif(count(*), 0), 1)
                                                                                                         as kategori_limiti_pct,
  round(100.0 * count(*) filter (where exists (select 1 from public.budgets b
        where b.user_id::text = k.uid and b.tur = 'hedef')) / nullif(count(*), 0), 1)                  as kategori_hedefi_pct,
  round(100.0 * count(*) filter (where exists (select 1 from public.goals g
        where g.user_id::text = k.uid)) / nullif(count(*), 0), 1)                                       as yatirim_hedefi_pct,
  round(100.0 * count(*) filter (where exists (select 1 from public.recurring r
        where r.user_id::text = k.uid and r.is_active)) / nullif(count(*), 0), 1)                       as tekrarlayan_pct,
  round(100.0 * count(*) filter (where exists (select 1 from public.household_members h
        where h.user_id::text = k.uid)) / nullif(count(*), 0), 1)                                       as hane_pct,
  round(100.0 * count(*) filter (where exists (select 1 from public.push_tokens pt
        where pt.user_id::text = k.uid)) / nullif(count(*), 0), 1)                                      as bildirim_acik_pct
from k;
