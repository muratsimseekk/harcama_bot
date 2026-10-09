# Paraİzi — Google Play'e çıkış rehberi (adım adım)

> Yalnız Android / Google Play. (iOS için `YAYIN-KONTROL-LISTESI.md`.)
> **👤 = sen yapacaksın · 🤖 = Claude yapacak (bana "X adımını yap" de)**
> Sırayı koru: bekleme gerektiren işler (hesap onayı, 14 günlük test) en başta başlatılıyor.
> Hazırlandı: 2026-10-09

---

## ⏱️ Takvim gerçeği

Yeni **bireysel** Play Console hesabı → production'a çıkmadan önce **en az 12 test kullanıcısı
ile kesintisiz 14 gün kapalı test** zorunlu. Sonra "production erişimi" başvurusu (~birkaç gün).
**Gerçekçi en erken yayın: bugünden ~3 hafta.** Bu yüzden Aşama 1'i bugün başlat.

---

## AŞAMA 1 — Bugün başlat (beklemeli işler)

### 1.1 👤 Google Play Console hesabı
- [ ] https://play.google.com/console/signup → **Kişisel (Personal)** hesap → $25
- [ ] Kimlik doğrulama (nüfus cüzdanı) — 1-3 gün sürer
- [ ] Telefon doğrulama + **gerçek bir Android cihazdan "Play Console" uygulamasıyla giriş**
      (Google yeni hesaplarda fiziksel cihaz erişimini doğruluyor)
- [ ] Geliştirici adı: **nimustudio** · iletişim e-postası: **info@nimustudio.com** · web: **nimustudio.com**

### 1.2 👤 12 test kullanıcısı bul (şimdiden)
- [ ] En az **12, tercihen 15-20** kişi (yedekli) — Android telefonu + Gmail hesabı olan
- [ ] Gmail adreslerini bir listeye topla (Play Console'a e-posta listesi olarak gireceksin)
- [ ] Onlara söyle: "Davet linkine tıklayıp uygulamayı kuracaksın, **14 gün silme**, ara sıra aç"

### 1.3 Alan adı + e-posta — `nimustudio.com` ✅
Google Workspace kaydında Google üzerinden alındı (2026-10-09, kayıt firması Squarespace
Domains, ücret Workspace faturasında). DNS'i **admin.google.com → Hesap → Alanlar → Alanları
yönet** üzerinden yönetilir — Cloudflare KULLANILMIYOR.
⚠️ `nimostudio.com` (o ile) BAŞKASININ domaini — hiçbir yere yazma.

Geliştirici adı: **nimustudio** · İletişim: **info@nimustudio.com**
- [x] MX + SPF kayıtları Google tarafından kuruldu, Gmail AÇIK
- [x] `muratsimsek@nimustudio.com` mail alıyor (test edildi)
- [x] `info` alias'ı eklendi (Dizin → Kullanıcılar → Murat Şimşek → Alternatif e-posta)
- [x] `info@nimustudio.com`'a mail geliyor (test edildi)
- [ ] Gmail → ⚙️ Tüm ayarlar → Hesaplar → "Postaları şu adresten gönder" → `info@nimustudio.com`
      ("Takma ad olarak işle" işaretli) → varsayılan yap + "gönderildiği adresten yanıtla"
- [ ] **DKIM:** Uygulamalar → Google Workspace → Gmail → E-posta kimlik doğrulama → yeni kayıt
      oluştur → (Google'dan alınan domainde genelde "DNS'e otomatik ekle" çıkar) → Kimlik doğrulamayı başlat
- [ ] 👤🤖 **Supabase SMTP** (saatte 2 mail sınırı kalksın): Resend → domain
      `mail.nimustudio.com` → verdiği DNS kayıtlarını Google Admin → Alanlar → DNS'e gir →
      API key'i bana ver → gönderen `Paraİzi <noreply@mail.nimustudio.com>`

---

## AŞAMA 2 — Kod / içerik hazırlığı (hesap onaylanırken)

### 2.1 👤 Uygulama ikonu — ŞU AN HİÇ YOK
- [ ] **1024×1024 PNG**, şeffaf olmayan arka plan (logo/tasarım) → bana ver
      (yoksa 🤖 basit bir geçici ikon hazırlayabilirim — söyle)
- 🤖 Ben: `assets/icon.png`, Android adaptive icon (ön plan + arka plan rengi), splash,
  Play için **512×512** ikon üreteceğim, `app.json`'a bağlayacağım

### 2.2 Yasal sayfalar + hesap silme sayfası — 🤖 hazır, 👤 yayına alınacak
✅ Metinler dolduruldu (Murat Şimşek / nimustudio / Şehitkamil-Gaziantep / info@nimustudio.com),
Sentry + Google ile giriş eklendi. Uygulama içi metin + linkler güncellendi (`lib/yasal.ts`).
✅ `site/` üretildi (`python scripts/site_olustur.py`): ana sayfa, gizlilik, koşullar,
hesap silme, `app-ads.txt`. Adresler:
- `https://nimustudio.com/paraizi/gizlilik` → Play "Gizlilik politikası"
- `https://nimustudio.com/paraizi/hesap-silme` → Data safety "hesap silme URL'si"
- `https://nimustudio.com` → mağaza listesi "Web sitesi" (AdMob `app-ads.txt` buradan okunur)

**👤 Yayına alma (GitHub Pages, ücretsiz):** Ana repo `harcama_bot` özel kalır (Telegram bot
kodu var); site için ayrı **public** repo açılır.
- [ ] github.com → New repository → ad `nimustudio-site` → **Public** → Create (boş)
- [ ] 🤖 `site/` içeriğini o repoya ben gönderirim (+ `CNAME` dosyası `nimustudio.com`)
- [ ] Repo → Settings → Pages → Branch `main` / root → Save → Custom domain `nimustudio.com`
- [ ] Google Admin → Hesap → Alanlar → Alanları yönet → nimustudio.com → **DNS'i yönet**
      (Squarespace paneli açılır) → Squarespace'in park kayıtlarını (A / CNAME www) sil → ekle:
      - `A` `@` → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
      - `CNAME` `www` → `<github-kullanici-adin>.github.io`
      - ⚠️ **MX ve TXT (Google) kayıtlarına DOKUNMA** — mail bozulur
- [ ] Birkaç saat sonra GitHub Pages → **Enforce HTTPS** işaretle
- [ ] Kontrol: üç sayfa + `nimustudio.com/app-ads.txt` açılıyor mu (🤖 kontrol ederim)
- Metin değişirse: `docs/*.md` düzenle → `python scripts/site_olustur.py` → site reposuna tekrar gönder

### 2.3 🤖 Sunucu uyumasın (inceleme sırasında API 40 sn uyanırsa red riski)
`keep-warm.yml` **hiç çalışmıyor**: GitHub zamanlanmış işleri yalnız varsayılan dalda (`main`)
çalıştırır, workflow `faz-m1-mobil`'de.
- [ ] 👤 Seçenek A (önerilen, $7/ay): Render → `harcama-api` → Instance Type → **Starter**
- [ ] 👤 Seçenek B (ücretsiz): https://uptimerobot.com → HTTP monitor →
      `https://harcama-api.onrender.com/health` → 5 dk aralık
- Push bildirim cron'u (`push-cron.yml`) da aynı sebeple çalışmıyor → yayın için şart değil,
  sonra çözeriz.

### 2.4 🤖 Sürüm
- [ ] `app.json` `version` → `1.0.0`, `supportsTablet` → `false`

### 2.5 👤 Supabase ayarları (dashboard → Authentication)
- [ ] URL Configuration → Redirect URLs: `paraizi://**` ekle (`harcama://**` silinebilir)
- [ ] Email Templates → `docs/eposta-sablonlari/` içindeki 6 Türkçe şablonu yapıştır
- [ ] (1.3 sonrası) SMTP Settings → Resend

### 2.6 👤 Demo hesap (Play "App access" için zorunlu — giriş olmadan uygulama açılmıyor)
- [ ] Uygulamadan e-posta/şifre ile hesap aç: örn. `demo@nimustudio.com` (alias olarak ekle) veya bir Gmail
- [ ] İçine 10-15 örnek işlem, 1 bütçe, 1 hedef gir (inceleyen boş ekran görmesin)
- [ ] E-posta + şifreyi not et

---

## AŞAMA 3 — Play Console'da uygulama kaydı (hesap onaylanınca)

### 3.1 👤 Uygulama oluştur
- [ ] Create app → Ad: **Paraİzi** · Varsayılan dil: **Türkçe** · Uygulama · **Ücretsiz**
      (ücretsiz + uygulama içi abonelik; "ücretsiz" sonradan ücretliye çevrilemez — doğru seçim)

### 3.2 👤 Uygulama içeriği (Policy → App content) — hepsini doldur
| Bölüm | Cevap |
|---|---|
| Gizlilik politikası | 2.2'deki URL |
| Uygulama erişimi | "Bazı işlevler kısıtlı" → 2.6 demo hesap e-posta + şifre |
| Reklamlar | **Evet, reklam içeriyor** |
| İçerik derecelendirme | Anket → Kategori "Yardımcı program/Verimlilik/Diğer"; şiddet/kumar vb. hepsi Hayır → 3+ / PEGI 3 |
| Hedef kitle | **18+** (gizlilik politikamız 18 yaş altını kapsamıyor) |
| Veri güvenliği | Aşağıdaki tablo |
| Reklam kimliği (Advertising ID) | **Evet** kullanıyor → amaç: Reklam |
| Finansal özellikler beyanı | Banka/kredi/yatırım/ödeme hizmeti YOK → kişisel bütçe takibi (bu seçenek varsa onu, yoksa "finansal özellik yok") |
| Devlet / Sağlık / Haber | Hayır |

### 3.3 👤 Veri güvenliği formu (Data safety)
Genel: Veri toplanıyor: **Evet** · Aktarımda şifreli: **Evet** · Kullanıcı silme talep
edebilir: **Evet** (uygulama içi + 2.2'deki web sayfası URL'si)

| Veri türü | Toplanıyor | Paylaşılıyor | Geçici mi | Zorunlu mu | Amaç |
|---|---|---|---|---|---|
| Kişisel bilgi → E-posta adresi | ✓ | ✗ | Hayır | Zorunlu | Hesap yönetimi, Uygulama işlevi |
| Kişisel bilgi → Ad | ✓ | ✗ | Hayır | İsteğe bağlı | Uygulama işlevi |
| Finansal bilgi → **Diğer finansal bilgi** (harcama kayıtları) | ✓ | ✗ | Hayır | Zorunlu | Uygulama işlevi, Analiz |
| Ses → Ses kayıtları | ✓ | ✗ | **Evet (geçici işleniyor)** | İsteğe bağlı | Uygulama işlevi |
| Uygulama etkinliği → Diğer kullanıcı içeriği (yazılı girdi) | ✓ | ✗ | Hayır | İsteğe bağlı | Uygulama işlevi |
| Uygulama bilgisi ve performans → Kilitlenme günlükleri + Tanılama | ✓ | ✗ | Hayır | Zorunlu | Analiz |
| Cihaz veya diğer kimlikler (reklam kimliği, push jetonu) | ✓ | ✓ (AdMob) | Hayır | Zorunlu | Reklam, Uygulama işlevi |

> Not: Groq/Supabase/Render/Sentry "hizmet sağlayıcı" sayılır → Google'ın tanımında
> "paylaşım" değildir. Yalnız AdMob reklam için paylaşım olarak işaretlenir.

### 3.4 👤 Mağaza girişi (Grow → Store presence → Main store listing)
- [ ] Uygulama adı (≤30): **Paraİzi** (ya da "Paraİzi: Harcama Takibi")
- [x] Kısa/uzun açıklama + App access + içerik derecelendirme cevapları → 🤖 **`docs/MAGAZA-METINLERI.md`** (kopyala-yapıştır)
      (abartı yok: "en iyi/1 numara" yok, başka marka adı yok, "banka bağlantısı yoktur" var)
- [ ] Uygulama ikonu 512×512 (2.1'den) · **Feature graphic 1024×500** (🤖 hazırlayabilirim)
- [ ] Telefon ekran görüntüleri: en az 2, ideal 4-6 → 🤖 emülatörden demo hesapla alırım
- [ ] Kategori: **Finans** · İletişim e-postası: `info@nimustudio.com` · Web sitesi: `https://nimustudio.com`
- [ ] AdMob → Apps → uygulamayı Play listesine bağla (yayından sonra mümkün olur)

---

## AŞAMA 4 — İlk build ve yükleme

### 4.1 🤖 Production build (AAB)
- [ ] `eas build -p android --profile production` → `.aab` dosyası
      (production profili gerçek reklam kimliğini kullanır ✓)

### 4.2 👤 İlk yükleme **elle** yapılmalı (Google API ilk yüklemeye izin vermez)
- [ ] Testing → **Internal testing** → Create release → `.aab` yükle
- [ ] "Play App Signing" teklifini kabul et
- [ ] Kendini internal tester olarak ekle → kendi telefonuna kur

### 4.3 👤🤖 Google ile giriş — SHA-1'ler (eklenmezse mağaza sürümünde Google girişi çalışmaz)
- [ ] 👤 Play Console → Test and release → Setup → **App signing** → "App signing key"
      SHA-1'i kopyala bana ver
- [ ] 🤖 EAS upload key SHA-1'ini ben çıkarırım (`eas credentials`)
- [ ] 👤 Google Cloud Console → APIs & Services → Credentials → **Android OAuth istemcisi**
      (paket `com.paraizi.app`) → her SHA-1 için bir istemci (debug zaten var) — adımlarını o an söylerim
- [ ] Internal sürümde Google girişini dene

### 4.4 👤 AdMob
- [ ] AdMob → Apps → Paraİzi (Android) → Ad units → ödüllü birim → **Server-side verification**
      → callback URL: `https://harcama-api.onrender.com/v1/ads/ssv`
- [ ] `nimustudio.com/app-ads.txt` yayında mı (2.2) → AdMob → Apps → app-ads.txt durumu "Bulundu"

---

## AŞAMA 5 — Abonelik (Pro) — Google Play Billing + RevenueCat

> Play, ürün oluşturmana ancak **BILLING izinli bir build yüklendikten sonra** izin verir
> → 4.2'den sonra yap. Uygulamada dış ödeme linki yok ✓, fiyat + yenileme metni ekranda var ✓.

- [ ] 👤 Play Console → **Payments profile** → Türk IBAN + vergi bilgileri
- [ ] 👤 Monetize → Products → **Subscriptions** → 2 ürün:
      - `pro_aylik` → base plan aylık, otomatik yenilenen, **₺99,99**
      - `pro_yillik` → base plan yıllık, otomatik yenilenen, **₺799,99**
      (ürün ID'leri birebir böyle olmalı — kod bunlara bakıyor)
- [ ] 👤 https://app.revenuecat.com → proje "Paraİzi" → Android app ekle (`com.paraizi.app`)
- [ ] 👤 RevenueCat'in rehberiyle **Google Cloud service account JSON** oluştur → Play Console
      → Users and permissions → bu hesabı davet et (finans izinleri) → JSON'u RevenueCat'e yükle
      (aktifleşmesi 24-36 saate kadar sürebilir — normal)
- [ ] 👤 RevenueCat → Entitlements → `pro` (iki ürünü bağla) → Offerings → `default` →
      packages: aylık + yıllık
- [ ] 👤 RevenueCat → Integrations → Webhooks → URL
      `https://harcama-api.onrender.com/v1/rc/webhook` · Authorization: `Bearer <gizli>`
      (🤖 gizli değeri ben üretirim, sen Render env'e `RC_WEBHOOK_SECRET` olarak girersin)
- [ ] 👤 RevenueCat → API Keys → Android public key (`goog_...`) → bana ver
- [ ] 🤖 `eas.json` production + preview → `EXPO_PUBLIC_RC_ANDROID_KEY` → yeni build
- [ ] 👤 Play Console → Settings → **License testing** → kendi Gmail'in (test alımı ücretsiz)

---

## AŞAMA 6 — Kapalı test (14 gün) + uçtan uca test

- [ ] 👤 Testing → **Closed testing** → yeni track → 1.2'deki Gmail listesi → 5.'teki build'i yayınla
      → Google incelemesi (1-3 gün) → davet linkini test kullanıcılarına gönder
- [ ] **14 gün sayacı, 12 kişi fiilen kurduktan sonra başlar.** Bu sürede gelen
      hataları düzeltip yeni sürüm yükleyebilirsin (sayaç sıfırlanmaz)

**Kendi test listen (internal/closed build'de, telefonda):**
- [ ] E-posta ile kayıt → doğrulama e-postası geliyor → giriş
- [ ] Google ile giriş
- [ ] Şifremi unuttum → e-posta → link → yeni şifre
- [ ] Elle işlem ekle / düzenle / sil · Sesli kayıt · Yazılı AI kayıt
- [ ] **İnternet kapalıyken**: uygulamayı aç, işlem eklemeyi dene, sesli kaydı dene → çökmemeli,
      Türkçe uyarı vermeli
- [ ] **Mikrofon izni reddedilmişken** sesli kayıt → "Ayarları Aç" yönlendirmesi
- [ ] Günlük hak bitince ödüllü reklam → +hak geliyor
- [ ] Pro satın al (lisans test hesabıyla) → reklamsız/sınırsız → Geri yükle → iptal
- [ ] Hesabı sil → tekrar giriş yapılamıyor
- [ ] Sentry'de yeni hata var mı bak

---

## AŞAMA 7 — Yayın

- [ ] 👤 14 gün dolunca: Dashboard → **Apply for production** → test sürecini anlatan anket
      (kaç kişi test etti, ne geri bildirim geldi, ne düzelttin — 🤖 cevapları birlikte yazarız)
- [ ] Onay (~birkaç gün - 1 hafta) → **Production** → release oluştur → kademeli yayın %20 → %100
- [ ] Yayından sonra: AdMob'da uygulamayı mağaza listesine bağla

## Yayından önce son hatırlatmalar
- [ ] 🔴 **Sentry token'larını yenile** (10-01'de sohbete yapıştırıldı)
- [ ] Render planı / UptimeRobot aktif mi (2.3)
- [ ] Destek e-postasına gelen mailler sana ulaşıyor mu

---

## Sonraki sürüme bırakılanlar (red sebebi değil)
- Çevrimdışı manuel kayıt → "taslak olarak kaydet" + internet gelince otomatik senkron
- Push bildirim cron'unu `main` dalı / harici cron'a taşıma
- iOS / App Store
