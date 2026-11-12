# Paraİzi — Büyüme analizi (ASO · Pro ekranı · karşılama · ölçüm)

> Hazırlandı: 2026-11-12 · Durum: build 10 Google üretim incelemesinde, kullanıcı verisi henüz yok.
> Yöntem: `.claude/skills/` altındaki pazarlama skill'leri (coreyhaines31/marketingskills, MIT):
> `aso`, `paywalls`, `onboarding`, `analytics`, `product-marketing`. Ürün bağlamı: `.agents/product-marketing.md`.
>
> **Veri olmadan neyi söyleyebiliriz?** Bu rapordaki her şey ya (a) mağaza/ürün kurallarına ve
> kodun bugünkü haline dayanan denetim bulgusu, ya da (b) yayından sonra veriyle doğrulanacak
> **hipotez**dir. Hipotezler açıkça işaretli. Sayısal hedefler başlangıç varsayımıdır, kıyas değildir.

---

## 0. Özet: en önemli 6 bulgu

| # | Bulgu | Etki | Ne zaman |
|---|---|---|---|
| 1 | **İlk deneyim duvara çarpıyor.** Ücretsiz plan günde 3 kayıt; mağazadaki örnek cümle ("Market 850, benzin 1200, kahve 95") tek seferde 3 kayıt oluşturuyor → yeni kullanıcı ilk denemesinde günlük hakkını bitiriyor. | Çok yüksek | Sunucu ayarı, build gerekmez |
| 2 | **Uygulama içi değerlendirme isteği yok.** Play sıralamasında puan ve yorum ağırlığı yüksek (ASO puanının %20'si); şu an kullanıcıdan yorum istenmiyor. | Yüksek | Build 11 |
| 3 | **Bildirim izni değer görülmeden isteniyor** (giriş yapılır yapılmaz). Reddedilirse limit uyarıları ve günlük özetler — uygulamanın alışkanlık döngüsü — kaybolur. | Yüksek | Build 11 |
| 4 | **Pro ekranı yeni Pro özelliklerini göstermiyor** (Excel/PDF dökümü, sınırsız tekrarlayan). Kilitli özellikten gelen kullanıcı genel bir sayfaya düşüyor; neden geldiği yazmıyor. | Orta-yüksek | Build 11 |
| 5 | **Ana sayfanın boş hali zayıf** ("Henüz kayıt yok. Ekle sekmesinden başla."). İlk oturumda tek bir net eylem yok. | Orta-yüksek | Build 11 |
| 6 | **Hiç ürün ölçümü yok** (yalnız Sentry hataları). Yayın günü gelen ilk kullanıcı grubu — en değerli öğrenme verisi — kayıt altına alınmazsa geri getirilemez. | Yüksek | Hemen (SQL) + build 11 (SDK) |

---

## 1. Play Store sayfası denetimi (ASO)

**Mağaza:** Google Play · **Kaynak:** `docs/MAGAZA-METINLERI.md` + `docs/magaza-gorselleri/`
(sayfa henüz herkese açık değil, canlı sayfa çekilemedi) · **Marka seviyesi:** Challenger —
yeni uygulama, puan yok; her karakter ve görsel önemli.

### 1.1 Puan kartı

| Boyut | Ağırlık | Puan | Not | Ana konu |
|---|---|---|---|---|
| Başlık & kısa açıklama | %20 | 8/10 | B | Başlık 29/30, anahtar kelime doğru; kısa açıklamada "gelir gider" yok |
| Uzun açıklama | %15 | 7/10 | B | Güçlü açılış, iyi yapı; yeni özellikler yok, "takip" yoğunluğu düşük |
| Görseller | %25 | 7/10 | B | 6 başlıklı ekran + feature graphic; video yok, yeni özellikler yok, 2 ekranda "0,00 ₺ biriken" |
| Puan & yorumlar | %20 | 0/10 | — | Henüz yok (yayın öncesi doğal) |
| Meta veri & güncellik | %10 | 6/10 | C | Tek dil (TR), kategori doğru, sık güncelleme |
| Dönüşüm sinyalleri | %10 | 5/10 | C | Freemium net; sosyal kanıt yok, indirme aralığı yok |
| **Toplam** | | **55/100 (C)** | | Puan boyutu hariç tutulursa **69/100** — eksik olan büyük ölçüde yayın öncesi doğal durum |

### 1.2 Hızlı kazanımlar (her biri < 1 saat)

**1. Kısa açıklamaya "gelir gider" ekle** · Etki: Orta · Efor: < 15 dk
- Şimdi (76/80): `Harcamanı söyle, yapay zeka kaydetsin. Bütçe ve gider takibi tek uygulamada.`
- Öneri (77/80): `Harcamanı söyle, yapay zeka kaydetsin. Gelir gider ve bütçe takibi tek yerde.`
- Neden: "gelir gider" Türkçede bu kategorinin en yaygın arama kalıplarından; başlıkta "harcama
  takibi" zaten var, kısa açıklama tekrar etmek yerine ikinci kalıbı yakalamalı.
  *(Arama hacmi ücretli araç olmadan ölçülemez — Play Console'daki "Edinme raporu → arama
  terimleri" verisi geldiğinde doğrula.)*

**2. Ekran 4 ve 5'teki "Bu ay biriken 0,00 ₺" örnek verisini düzelt** · Etki: Orta · Efor: < 1 saat
- Yatırım hedefi kartı "0,00 ₺ biriken, 5.000 ₺ kalan" gösteriyor → özellik çalışmıyor ya da boş
  görünüyor. Test ekran hesabına (test-ekran@) birkaç yatırım kaydı eklenip görüntüler
  `scripts/magaza_ekran_goruntuleri.py` ile yeniden üretilmeli.

**3. Uzun açıklamayı yeni özelliklerle güncelle (build 11 yayına girince)** · Etki: Orta · Efor: < 1 saat
- Taslak aşağıda §1.4'te. Build 11 yayına girmeden mağazaya konmamalı (olmayan özelliği
  vaat etmek politika ihlali).

### 1.3 Ayrıntılı bulgular

**Başlık:** `Paraİzi: Sesli Harcama Takibi` (29/30) — marka + ana anahtar kelime + ayırt edici
özellik. Değiştirme. Play politikasına uygun (emoji, "en iyi", "ücretsiz" yok).

**Uzun açıklama (2.189 karakter, 313 kelime):**
- İlk iki cümle güçlü: somut örnek cümle + sonuç. Korunmalı.
- Anahtar kelime yoğunluğu: harcama %2,2 ✓ · bütçe %1,6 · gider %1,6 · gelir %1,3 · takip %0,9 ·
  limit %0,3 · hedef %0,3 · birikim %0. Hedef aralık %2–3 (doğal); "takibi", "hedef", "birikim",
  "fatura", "abonelik", "aile bütçesi" eksik ya da zayıf.
- 4.000 karakter sınırının yarısı kullanılıyor → yeni özellik bölümleri için yer var.
- "Ücretsiz: Her gün kayıt hakkı" belirsiz → kaç kayıt olduğu açıkça yazılmalı (güven + beklenti).

**Görseller:**
1. "Söyle, yapay zeka kaydetsin." — çok güçlü, ilk sırada kalsın ✓
2. "Kontrol her zaman sende." — onay ekranı ✓
3. "Paran nereye gidiyor? Tek bakışta." — ana sayfa ✓ (yeni Analiz/kategori kıyası daha etkileyici)
4. "Bütçeni koy, sınırda kal." — eski "Kategori limitleri" arayüzü; "0,00 ₺ biriken" ✗
5. "Sınıra yaklaşınca haber verir." — bildirimler; yine "0,00 ₺" ✗
6. "Bankana bağlanmaz." — gizlilik ✓ (güçlü güven sinyali, sonda iyi)
- Play en çok 8 ekrana izin veriyor; 2 boş slot var.
- Tanıtım videosu yok. 20–30 sn'lik bir ekran kaydı (cümleyi söyle → 3 kayıt düşer → analiz)
  en güçlü özelliği sessiz izlemede bile anlatır.
- Feature graphic ✓ (1024×500, marka + değer önerisi).

**Meta veri:** Kategori Finans ✓ · Veri güvenliği formu dolu ✓ · Tek dil. İngilizce
(`ingilizce-wip` dalı) bittiğinde İngilizce mağaza girişi ikinci pazar açar.

**Dönüşüm:** Fiyat ve iptal bilgisi açık ✓. Sosyal kanıt yok (yayın öncesi doğal). İlk 50+
yorumdan sonra açıklamaya puan/yorum alıntısı eklenebilir.

### 1.4 Uzun açıklama taslağı v2 (build 11 yayına girince)

Değişen/eklenen bölümler — gerisi aynı kalır:

```
Bütçe, limit ve hedefler
• Her kategoriye ister limit ister hedef koy: harcamada üst sınır, birikimde ulaşmak istediğin tutar
• Aylık harcama sınırı; sınıra yaklaşınca ve aşınca uyarı
• Aylık yatırım ve birikim hedefini belirle, ilerlemeni izle

Analiz ve özetler
• Günlük, haftalık, aylık, yıllık ya da istediğin tarih aralığında gelir-gider grafikleri
• Kategori kıyası: her kategoride geçen döneme göre yüzde kaç arttı ya da azaldı
• Bir kategoriye dokun: o kategorideki tüm harcamalar ve son 6 ayın trendi
• Her akşam günlük, her pazar haftalık özet bildirimi

Kira, fatura, abonelik otomatik
• Tekrarlayan kayıtlar: her ay aynı gün kendiliğinden eklensin

Dolar ve euro
• Toplamları ₺, $ ya da € olarak gör; her kayıt kendi gününün TCMB kuruyla çevrilir

Excel ve PDF dökümü (Pro)
• Tüm kayıtlarını ya da tek bir kategoriyi, seçtiğin tarih aralığıyla Excel veya PDF olarak paylaş

Ücretsiz ve Pro
• Ücretsiz: Günde 3 kayıt, analiz, limit ve hedefler. Hakkın bitince isteğe bağlı kısa bir ödüllü video izleyerek ek hak kazanırsın.
• Pro: Sınırsız kayıt, reklamsız kullanım, aile paylaşımı, Excel/PDF dökümü ve sınırsız tekrarlayan kayıt. Aylık ya da yıllık; Google Play hesabından istediğin zaman iptal edebilirsin.
```
*("Günde 3" sayısı §2.1'deki karara göre güncellenmeli.)*

### 1.5 Anahtar kelime önerileri (hacim doğrulanmadı)

| Anahtar kelime | Neden | Nereye | Öncelik |
|---|---|---|---|
| gelir gider takibi | Kategorinin temel arama kalıbı | Kısa açıklama + uzun açıklama | Yüksek |
| harcama takibi | Zaten başlıkta; uzun açıklamada 3–4 kez doğal geçsin | Uzun açıklama | Yüksek |
| bütçe planlama / aile bütçesi | Hane özelliği ile eşleşir | Uzun açıklama | Orta |
| masraf takibi / gider hesaplama | Esnaf/serbest çalışan dili | İşletme bölümü | Orta |
| fatura / abonelik takibi | Tekrarlayan kayıtlar | Yeni bölüm | Orta |
| birikim hedefi | Hedef özelliği | Bütçe bölümü | Orta |
| sesli not / sesle kayıt | Ayırt edici özellik | İlk paragraf | Düşük-orta |

### 1.6 Görsel planı (8 ekran — build 11 sonrası, test-ekran hesabıyla)

| Sıra | Başlık önerisi | Ekran | Durum |
|---|---|---|---|
| 1 | Söyle, yapay zeka kaydetsin. | Sesli kayıt + 3 kayıt bulundu | Var, kalsın |
| 2 | Paran nereye gidiyor? Tek bakışta. | **Analiz: kategori kıyası (% artış/azalış)** | Yenile |
| 3 | Limit mi, hedef mi? Sen seç. | **Hedefler: LİMİT/HEDEF etiketli satırlar, gerçek ilerleme** | Yeni |
| 4 | Kontrol her zaman sende. | Onay ekranı | Var |
| 5 | Kira, fatura, abonelik otomatik. | Tekrarlayan kayıtlar | Yeni |
| 6 | Sınıra yaklaşınca haber verir. | Bildirimler (gerçek veriyle) | Yenile |
| 7 | Excel ve PDF dökümün hazır. | Dışa aktar butonu + paylaşım | Yeni |
| 8 | Bankana bağlanmaz. Verin sende kalır. | Gizlilik | Var |

İlk 3 ekran en önemlisi (çoğu kullanıcı 3.'den sonra kaydırmaz): ses → analiz → limit/hedef.

---

## 2. Pro ekranı ve yükseltme anları (paywall)

**Bugünkü model:** Freemium, deneme süresi yok. Free: günde 3 kayıt + ödüllü reklamla +1.
Pro: ₺49,99/ay, ₺399,99/yıl (varsayılan yıllık, "%33 indirim").

**Bugünkü tetikleyiciler:** günlük hak bitince alt pencere (reklam ya da Pro) · onay ekranında hak
yetmezse · hane · Excel/PDF (genel uyarı penceresi) · 4. tekrarlayan kayıt (kayıttan *sonra*
uyarı) · Profil → Üyelik.

### 2.1 İlk gün sınırı — en kritik karar ⚠️

**Bulgu:** Değer anı (ilk sesli çoklu kayıt) ile sınır aynı ana denk geliyor. Mağazadaki örnek
cümle 3 kayıt üretir = günlük hakkın tamamı. Kullanıcı daha uygulamayı tanımadan "hakkın bitti"
ekranını görüyor. Skill'in açık kuralı: *"Asla değer görülmeden isteme; kritik akışı engelleme."*

**Seçenekler (sunucu tarafı, build gerekmez — `api/usage.py`):**
| Seçenek | Ne | Artı | Eksi |
|---|---|---|---|
| **A. İlk hafta geniş hak (önerilen)** | Kayıttan sonraki 7 gün günlük hak 3 yerine ör. 15 (`profiles.created_at`'ten) | Alışkanlık oluşurken engel yok; sonra sınır "hissedilir" | İlk hafta reklam geliri az |
| B. Bir giriş = 1 hak | Tek cümledeki 3 kayıt 1 hak sayılır | Sesli kaydı ödüllendirir | Ekonomi değişir; elle kayıt dezavantajlı |
| C. Değiştirme, ölç | `metrikler.sql` §5 "ilk gün hakkı dolan" oranına bak | Veriye dayalı | İlk kohort kaybedilebilir |

Öneri: **A**, yayın günü açık olsun; 2–3 hafta sonra §5 sorgusu ve RevenueCat dönüşümüyle
gözden geçir. Mağaza ve Pro ekranı metinlerine "İlk hafta günde 15 kayıt" eklenebilir.

### 2.2 Pro ekranı (`app/uyelik.tsx`) bulguları

| Bulgu | Öneri | Efor |
|---|---|---|
| Karşılaştırma tablosunda 4 satır var; Excel/PDF dökümü ve sınırsız tekrarlayan yok | Tablo: Sınırsız kayıt · Reklamsız · Aile paylaşımı · Excel/PDF dökümü · Sınırsız tekrarlayan · (Free'de de olanlar: analiz, limit/hedef ✓ — dürüstlük güven verir, kalsın) | Küçük |
| Kilitli özellikten gelen kullanıcı genel sayfaya düşüyor | `/uyelik?neden=disa-aktar|tekrarlayan|hane|limit` → en üstte bağlama özel başlık: "Excel ve PDF dökümü Pro'da" + 2 satır fayda | Küçük |
| Yıllık fiyat yalnız toplam olarak görünüyor | Altına "aylık ₺33,33'e denk gelir" (toplam ve dönem açık kalır) | Çok küçük |
| 4. tekrarlayan kural kaydedildikten *sonra* reddediliyor | Anahtarın yanında "3/3 kullanıldı" göster; açarken Pro bilgisini önceden ver | Küçük |
| Pro olduktan sonra yalnız "Pro üyesin 🎉" | Sonraki adımlar: "Haneni kur", "Excel dökümünü al" kısayolları | Küçük |
| Uyum kontrolü | Fiyat + dönem ✓ · otomatik yenileme metni ✓ · koşullar/gizlilik bağlantısı ✓ · geri yükle ✓ · kapatma (geri) ✓ | — |

### 2.3 Daha sonra (veri geldikten sonra) test edilecekler
- **Yıllık planda 7 günlük ücretsiz deneme** (Play Console teklifi + RevenueCat; ekranda
  "7 gün ücretsiz, sonra ₺399,99/yıl" ve bitmeden hatırlatma). Hipotez: dönüşümü artırır.
- **Tek seferlik vazgeçme teklifi** (Pro ekranı kapatılınca bir kez indirimli yıllık) — yalnız
  bir kez, sahte geri sayım yok.
- Fiyat testi: RevenueCat Experiments ile build gerektirmeden.

---

## 3. Karşılama ve ilk oturum (onboarding)

### 3.1 Değere giden yolun envanteri (bugün)

1. Uygulamayı aç → 5 slaytlık tanıtım (Atla var ✓)
2. Kayıt: **Google** (tek dokunuş ✓) ya da **e-posta** → şifre → *uygulamadan çık, e-postayı aç,
   bağlantıya bas, geri dön, tekrar giriş yap*
3. Giriş yapılır yapılmaz **bildirim izni** penceresi
4. Ana sayfa: boş, "Henüz kayıt yok. Ekle sekmesinden başla."
5. Ekle sekmesine geç → mikrofon izni → konuş → onayla → kaydet ✔ **(aha anı)**

E-postayla kayıtta aha anına ~10+ adım ve uygulama dışına bir çıkış var. Skill verisi: deneme
kullanıcılarının %40–60'ı tek oturumdan sonra dönmüyor; kayıpların %75–80'i ilk gün.

### 3.2 Öneriler

| # | Bulgu → Öneri | Öncelik |
|---|---|---|
| 1 | **Boş ana sayfa** → büyük "İlk harcamanı söyle" kartı: mikrofon butonu doğrudan burada + dokununca yazıyla denenen örnek çipler ("kahve 90", "market 850, benzin 1200"). Mikrofon izni beklemeden ilk başarı. | Yüksek |
| 2 | **Bildirim izni** → giriş anında değil, **ilk kayıt kaydedildikten sonra**: "İlk kaydın tamam 🎉 Her akşam günün özetini göndereyim mi?" → Evet'e basınca sistem izni. Bağlamlı izin daha çok kabul alır; red, alışkanlık döngüsünü (özet + limit uyarısı) öldürür. | Yüksek |
| 3 | **İlk kayıt kutlaması** (zirve-son kuralı): kısa animasyon + bir sonraki tek adım. | Orta |
| 4 | **Başlangıç listesi** (ana sayfada, kapatılabilir, 4 madde, ilerleme çubuğu "Hesap açıldı ✓" ile %20'den başlar): İlk harcamanı söyle · Bir kategoriye limit ya da hedef koy · Kira/fatura gibi tekrarlayan bir kayıt ekle · Günlük özeti aç. Veriler mevcut uç noktalardan gelir, sunucu değişikliği gerekmez. | Orta |
| 5 | **E-posta doğrulama sürtünmesi** → kayıt ekranında Google'ı birincil göster (zaten var, öne al); e-posta doğrulamasında "Gelen kutunu aç" butonu. Supabase'de doğrulamayı kaldırmak önerilmez (spam). | Orta |
| 6 | **Duraklayan kullanıcı**: 3 gün kayıt yoksa nazik bir push ("Dünkü harcamaları tek cümlede söyleyebilirsin"). Var olan push altyapısıyla, sunucu tarafı. | Orta |
| 7 | **Tanıtım slaytları**: 5 slayt giriş öncesi; ölçüm gelince hangi slaytta bırakıldığına bak, gerekirse 3'e indir. | Düşük (veriyle) |

### 3.3 Aktivasyon tanımı (hipotez — veriyle doğrulanacak)
- **Aday:** "Kayıttan sonraki ilk 7 günde en az 3 *farklı günde* kayıt yapmak" (alışkanlık).
- Doğrulama: 4+ haftalık olgun kohortlarda, bu davranışı yapanların 4. haftada geri gelme
  oranı yapmayanlardan belirgin yüksek mi (`metrikler.sql` §2 ve §4). Korelasyon nedensellik
  değildir; karşılama değişikliğinin etkisini ayrıca karşılaştır.

---

## 4. Ölçüm planı (analytics)

Karar vermek için ölçüyoruz; her olay bir soruya cevap vermeli.

### 4.1 Cevaplanacak sorular
1. Yükleyenlerin yüzde kaçı ilk gün kayıt yapıyor? (aktivasyon)
2. Sesli mi, yazılı mı? Hangisi geri getiriyor? (değer önerisi)
3. Günlük hak ilk gün mü doluyor? Reklam mı, Pro mu, bırakma mı? (§2.1 kararı)
4. Pro ekranını kim, nereden görüyor; kaçı alıyor? (yükseltme anları)
5. Hangi özellik (limit/hedef, tekrarlayan, hane, dışa aktarma) elde tutmayla birlikte gidiyor?
6. Bildirim izni oranı ve özet bildirimlerinin geri getirme etkisi.

### 4.2 Aşama 0 — hemen, SDK'sız, gizlilik metni değişmeden ✅
`scripts/metrikler.sql` — Supabase SQL Editor'de salt okuma 7 sorgu:
genel durum · aktivasyon (ilk kayda süre, 24 saat/7 gün oranı) · kayıt kaynağı (ses/yazı/elle) ·
haftalık kohort elde tutma (1./2./4. hafta) · günlük hak baskısı (ilk gün dolanlar dahil) ·
kaba Pro dönüşümü · özellik benimseme. Gelir/iptal/yenileme için **RevenueCat panosu** esas.
Bu sorular 1, 2, 3 (kısmen) ve 5'i cevaplar. Haftada bir çalıştır, sonucu
`.agents/product-marketing.md` → Learnings'e işle.

### 4.3 Aşama 1 — build 11 ile: istemci olayları (öneri: PostHog AB)
Neden: ekran içi davranış (Pro ekranı görüntüleme, karşılamada bırakma, izin cevapları)
veritabanında yok. **PostHog** (`posthog-react-native`, Expo uyumlu, AB/Frankfurt sunucusu,
aylık 1M olaya kadar ücretsiz). Alternatif Firebase Analytics (Google ekosistemi, ama yerel
yapılandırma gerektirir ve veri ABD'de).

**Gizlilik kuralları:** otomatik yakalama ve oturum kaydı **kapalı**; tutar, açıklama, kategori
adı, e-posta **gönderilmez** (finansal/kişisel veri); kullanıcı kimliği yalnız Supabase uuid;
Ayarlar'da "Kullanım istatistiklerini paylaş" anahtarı. **Önce** gizlilik politikası (yeni
alt işleyici: PostHog, AB) ve Play Veri güvenliği formu (Uygulama etkinliği → Uygulama
etkileşimleri, amaç: Analiz) güncellenmeli — ikisi build 11 ile aynı anda.

**Olay planı:**

| Olay | Ne zaman | Özellikler |
|---|---|---|
| `onboarding_slide_viewed` | Tanıtım slaytı göründü | `slayt_no` |
| `onboarding_finished` | Tanıtım bitti/atlandı | `atlandi` (bool), `slayt_no` |
| `signup_completed` | Hesap açıldı | `yontem` (google/eposta) |
| `record_input_started` | Ekle akışı başladı | `girdi` (ses/yazi/elle/hizli) |
| `records_saved` | Onayda kaydedildi | `adet`, `girdi`, `ilk_kayit` (bool) |
| `voice_parse_failed` | AI kayıt çıkaramadı | `neden` |
| `daily_limit_reached` | Günlük hak bitti | `gun_no` (kayıttan beri gün) |
| `rewarded_ad_completed` | Ödüllü video izlendi | — |
| `paywall_viewed` | Pro ekranı açıldı | `yer` (limit/disa_aktar/tekrarlayan/hane/profil) |
| `purchase_completed` / `purchase_cancelled` | Satın alma sonucu | `paket` (aylik/yillik), `yer` |
| `budget_rule_saved` | Limit/hedef kaydedildi | `tur` (limit/hedef), `kapsam` |
| `recurring_created` | Tekrarlayan kuruldu | — |
| `export_completed` | Döküm paylaşıldı | `bicim` (xlsx/pdf), `kategori_filtresi` (bool) |
| `push_permission_result` | Bildirim izni cevabı | `izin` (bool), `yer` |
| `review_prompt_shown` | Değerlendirme istendi | `tetik` |

**Huni(ler):** Yükleme → tanıtım bitti → hesap → ilk kayıt (aktivasyon) · Hak doldu → reklam /
Pro ekranı → satın alma · İlk kayıt → 7 günde 3 farklı gün (aktivasyon hipotezi).

### 4.4 Başlangıç hedefleri (varsayım — ilk 3–4 haftanın verisiyle değiştir)
- İlk 24 saatte kayıt yapan: ≥ %60
- 1. hafta geri gelme: ≥ %25
- Free → Pro (35 gün): %2–4 (freemium; deneme eklenirse yeniden belirle)
- Bildirim izni: ≥ %60

---

## 5. Öncelik planı

### Şimdi — build 10 incelemesi sürerken (uygulamaya dokunmadan)
1. ✅ Ürün bağlamı (`.agents/product-marketing.md`) ve bu rapor
2. ✅ `scripts/metrikler.sql` — ilk kullanıcılar gelir gelmez çalıştırılabilir
3. Karar: §2.1 ilk hafta geniş hak (A/B/C) — sunucu tarafı, istenince hemen yapılır
4. Karar: PostHog build 11'e girsin mi (gizlilik + veri güvenliği güncellemesiyle)

### Build 11 ile (kod)
5. Uygulama içi değerlendirme isteği (`expo-store-review`, Play In-App Review API — yerel modül,
   bu yüzden build gerekir). Tetik: olumlu an (7. kayıt günü, hedefe ulaşma, başarılı döküm);
   hata sonrası asla; 90 günde en çok 1 (Google zaten kota uygular).
6. Bağlamlı bildirim izni (ilk kayıttan sonra) + ilk kayıt kutlaması
7. Boş ana sayfa kartı ("İlk harcamanı söyle" + örnek çipler) + başlangıç listesi
8. Pro ekranı: tablo güncellemesi, `neden` parametresi, aylık karşılık, sonrası kısayolları
9. (Karar verilirse) PostHog + gizlilik politikası + Veri güvenliği formu

### Build 11 yayına girince (mağaza)
10. Kısa açıklama ve uzun açıklama v2 (§1.2, §1.4)
11. 8 ekran görüntüsü (§1.6) + 20–30 sn tanıtım videosu
12. Play Store Listing Experiments: kısa açıklama A/B (en az 7 gün)

### Yayından 3–4 hafta sonra (veriyle)
13. `metrikler.sql` sonuçlarıyla §2.1 ve aktivasyon tanımını gözden geçir
14. Yıllık planda 7 gün deneme testi · vazgeçme teklifi · "arkadaşını davet et, 1 ay Pro"
15. İngilizce mağaza girişi (ingilizce-wip tamamlanınca)
16. Tanıtım sayfası (nimustudio.com/paraizi) + SEO (claude-seo skill'i ile) — organik edinme

---

## Sınırlar

- Mağaza sayfası henüz herkese açık değil: canlı sayfa, rakip sayfaları ve yorumlar çekilmedi.
  Yayından sonra `aso` skill'i Play URL'siyle yeniden çalıştırılmalı (rakip karşılaştırmasıyla).
- Anahtar kelime arama hacmi ve sıralama ücretli ASO araçları olmadan ölçülemez; Play
  Console'un edinme raporundaki arama terimleri ücretsiz ilk kaynak.
- `metrikler.sql` gerçek PostgreSQL ayrıştırıcısından geçti ama Supabase'de çalıştırılmadı.
- Hedef sayılar varsayımdır; ilk olgun kohortlarla değiştirilmeli.
