# HANE-PRO — Hane özelliğinin Pro sürüm genişletmeleri

> **Durum:** Hane MVP'si (işlemlerin havuzlanması) yayında. Bu dosyadaki üç genişletme
> **Pro üyeliğe** konacak ve lansmandan sonra, ayrı güncellemelerde yapılacak.
>
> **Ne zaten var (MVP):** `households` + `household_members` (owner/editor/viewer),
> katılım kodu, `deps.kapsam(user_id)` → hane üyelerinin işlemlerini havuzlar,
> `/v1/summary` + `/v1/transactions` + `/v1/notifications` havuzlu okur, işlem satırında
> "kim ekledi" atıfı, `_sahiplik` hane rol kontrolü.
>
> **Ne yok:** kişi bazında kırılım, bağımsız hane bütçesi/hedefi.

---

## HP-1 — Kişi bazında kırılım (ben / eşim / toplam)

**İstek:** Karı-koca ikisi de gelir/gider giriyor. Kullanıcı hem kendi toplamını, hem her
üyenin ayrı toplamını, hem birleşik toplamı görebilmeli — haftalık / aylık / yıllık hepsinde.
(Örn: "Ben bu ay 3.200 harcadım, eşim 1.800, toplam 5.000.") Gelir için de aynı.

### Backend
`core/summary.py` **değişmez** — `ozetle(txs)` zaten hangi listeyi verirsen onu topluyor,
`user_id`'ye bakmıyor.

`api/routes/summary.py`:
- `ids = await deps.kapsam(user_id)` zaten var (havuzlu txs geliyor).
- Hanedeyse: `bu_txs`'i `t.user_id`'ye göre grupla → her üye için `ozetle(uye_txs)`.
- Üye adları: `repo.hane_uyeleri(household_id)` → `{user_id: ad}`.
- `OzetModel` yeni alan: `uyeler: list[UyeOzetModel] | None`
  = `[{user_id, ad, ben: bool, ozet: OzetGovde}]`. Hanede değilse `None`.
- `bu_donem` / `onceki` = birleşik (bugünkü davranış). `hedefler` / `yatirim` → HP-2.

`api/schemas.py`: `UyeOzetModel` ekle, `OzetModel.uyeler` opsiyonel.

### Mobil
- `lib/types.ts` `Ozet` + `uyeler?: UyeOzet[]`.
- **Ana sayfa** (`app/(app)/index.tsx`): hero kartın altına kompakt şerit —
  her üye için `Ben/Ayşe · {gider}` + sonda `Toplam · {gider}`. Yatay scroll veya 2-3 satır.
- **Analiz** (`app/(app)/analiz.tsx`): seçili periyot (hafta/ay/yıl) için detaylı
  "Kişi bazında" kartı — üye başına gelir + gider + net; genişletince kategori kırılımı.
  `useSummary(gran)` zaten periyodu taşıyor, 3 periyot da otomatik gelir.
- Yeni bileşen gerekebilir: `components/UyeKirilim.tsx` (üye satırları + toplam).

### Şema
Yok. `Transaction.user_id` zaten mevcut.

### Test
`tests/test_api_summary.py` — hane üyesi için `uyeler` dolu, her üyenin toplamı doğru,
birleşik = üyelerin toplamı; hanede değilse `uyeler=None`.

---

## HP-2 — Bağımsız hane bütçesi + hedefi

**İstek:** Her hane üyesi kendine özel kategori limiti/hedefi koyabilsin
(ör. Market: A → 5.000, B → 10.000). Bunlar hem ayrı ayrı görünür, hem birleşik
(15.000) görünür. **Ayrıca** hane olarak bağımsız bir ortak limit de ayarlanabilsin
(ör. üyeler 15.000 koydu ama hane sınırı 12.000). Hem limit (budget) hem hedef (goal) için.
2+ kişi için çalışmalı.

### Şema — `scripts/schema_hane_butce.sql`
```sql
alter table public.budgets add column if not exists household_id uuid
  references public.households(id) on delete cascade;
alter table public.goals   add column if not exists household_id uuid
  references public.households(id) on delete cascade;

-- Kişisel benzersizlik: household_id NULL iken (user_id, kapsam, kapsam_deger)
-- Hane benzersizliği: household_id dolu iken (household_id, kapsam, kapsam_deger)
drop index if exists ux_budgets_user_scope;
create unique index ux_budgets_kisisel on public.budgets
  (user_id, kapsam, coalesce(kapsam_deger,'')) where household_id is null;
create unique index ux_budgets_hane on public.budgets
  (household_id, kapsam, coalesce(kapsam_deger,'')) where household_id is not null;

drop index if exists ux_goals_user_tip;
create unique index ux_goals_kisisel on public.goals
  (user_id, tip, period) where household_id is null;
create unique index ux_goals_hane on public.goals
  (household_id, tip, period) where household_id is not null;
```

### Backend
- `core/models.py` — `Budget` / `Goal` + `household_id: str | None`.
- `core/repo.py`:
  - `budgets_list_coklu(user_ids: list[str])` — üye bütçeleri, `.in_("user_id", ...)`,
    `household_id is null`.
  - `hane_budgets(household_id)` — `household_id = hid` satırları.
  - `budget_upsert(..., household_id=None)` — parametreleş; `household_id` doluysa hane satırı.
  - Aynısı `goals` için: `goals_list_coklu`, `hane_goal`, `goal_upsert(..., household_id=None)`.
- `api/routes/budgets.py`:
  - `PUT /v1/budgets` gövdesine `hane: bool = False` — `True` ise `_owner_uyelik(user_id)`
    kontrolü (sadece owner hane bütçesi koyar) → `household_id` set.
  - `GET /v1/budgets` — hanedeyse `{ benim: [...], uyeler: [{user_id, ad, butceler: [...]}],
    hane: [...] }`; hanede değilse eski düz liste.
  - Silme: kişisel satır → sahibi; hane satırı → owner.
  - Aynı yapı `/v1/goals`.
- `api/routes/summary.py` — `hedefler` her bütçeli kategori için:
  ```
  {
    kapsam, kapsam_deger, etiket,
    benim:    { limit, harcanan, oran, durum },              # benim limitim vs benim harcamam
    ortak_toplam: { limit, harcanan, oran, durum },          # üye limitleri toplamı vs birleşik harcama
    hane:     { limit, harcanan, oran, durum } | null,       # bağımsız hane limiti varsa
    uyeler:   [ { user_id, ad, ben, limit, harcanan, oran, durum } ]
  }
  ```
  `core.summary.hedef_ilerleme(txs, budgets)` her senaryo için ayrı çağrılır
  (benim txs+benim budgets / birleşik txs+toplanmış budgets / birleşik txs+hane budget).
- `YatirimModel` de aynı yapı: `benim`, `ortak_toplam`, `hane`, `uyeler`.
- `api/routes/notifications.py` — bütçe uyarısı: üye kendi limitini VEYA hane limitini
  aşınca. `notifications_sent` dedupe anahtarına `household_id` (kişi bazlı bildirim
  bütçe kişisel olduğu için sorun değil ama hane limiti bildirimi bir kez gitmeli).

### Mobil — `app/(app)/hedefler.tsx`
- Üstte "Benim / Hane" segmenti (`Sekmeli`); "Hane" segmenti sadece owner'a limit ayarlatır,
  diğer üyeler okur.
- **Benim** sekmesi: bugünkü akış (kendi kategori limitlerini `tutarSor` ile ayarla).
- **Hane** sekmesi: kategori satırı → birleşik ilerleme barı; dokun/genişlet →
  üye başına mini barlar + (varsa) bağımsız hane limiti çizgisi. Owner "Hane limiti belirle".
- `components/` — çok segmentli/çok barlı ilerleme bileşeni (`IlerlemeCubugu` tek `oran`
  alıyor → `CokluIlerleme` veya `IlerlemeCubugu`'na `segmentler?` prop'u).
- `lib/queries.ts` `invalidateHepsi`'ye `["budgets"]` ekle (hane katıl/ayrıl bütçe
  görünümünü değiştirir — şu an eksik, MVP'de de düzeltilebilir).

### ⚠️ Şimdiki gizli tutarsızlık (MVP'de var)
Hane MVP'sinde işlemler havuzlanıyor ama `/v1/summary` bütçe ilerlemesi
"**birleşik harcama vs SADECE benim limitim**" gösteriyor
(`api/routes/summary.py` `budgets_list(user_id)` tekil, txs ise `deps.kapsam` çoklu).
Bir hane üyesi Market'e 5.000 limit koyup eşi 8.000 harcayınca "%260 aştın" görür.

**Ara çözüm seçenekleri (HP-2 gelene kadar):**
1. Hanedeyse bütçe ilerlemesini **üye limitleri toplamına** göre hesapla
   (`budgets_list_coklu` + kategori bazında topla — küçük değişiklik, şema yok). VEYA
2. Hanedeyken dashboard bütçe kartını gizle / "bütçeler HP-2'de" notu.

Öneri: seçenek 1 (yanlış gösterimi düzeltir, HP-2 için de temel).

### Test
`tests/test_api_budgets.py` (yeni) — hane owner hane limiti koyar; üye koyamaz (403);
`GET /v1/budgets` hanede benim+uyeler+hane döner; summary `hedefler` üç senaryoyu da
doğru hesaplar.

---

## HP-3 — Diğer hane ertelemeleri

| İş | Tetik |
|---|---|
| `transactions.household_id` kolonu + `(household_id, occurred_on)` index | `user_id IN (...)` sorgusu ölçekte yavaşlayınca |
| Hane başına AI kotası (şu an kişi başı) | Kotanın hane bazında olması istenirse |
| QR katılım kodu + davet linki | UX iyileştirmesi |
| Çoklu hane (bir kişi birden fazla hanede) | Şu an `ux_hh_one_per_user` engelliyor |
| "Kim değiştirdi" denetim kaydı | Güven / şeffaflık |
| Push cron'u hane bazında gruplama | Hane bildirimleri havuzlanınca |

---

## Sıra önerisi
1. **HP-1** (kişi kırılımı) — şema yok, en görünür değer, düşük risk.
2. **HP-2 ara çözüm** (bütçe = üye toplamı) — mevcut tutarsızlığı kapatır.
3. **HP-2 tam** (bağımsız hane bütçesi) — şema + UI, daha büyük.
4. **HP-3** — tetiklere göre.
