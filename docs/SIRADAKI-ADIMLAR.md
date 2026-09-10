# Sıradaki adımlar — ödeme sistemi + mağaza lansmanı

> **Bu dosya sohbetler arası devam noktasıdır.** Yeni bir konuşmaya başlarken önce bunu oku.
> Son güncelleme: **2026-09-10**

---

## 1. Şu an neredeyiz?

**Kod tarafı lansmana hazır.** Ödeme altyapısı dahil her şey yazıldı ve test edildi.
Kalan iş **mağaza hesapları + karar** bekliyor — kodda yapılacak zorunlu bir şey yok.

Branch: `faz-m1-mobil` · Son commit: `12698b8`

---

## 2. ÖNCE KARAR VERİLMESİ GEREKENLER (her şey buna bağlı)

### 2.1 🔴 Uygulama ismi — EN KRİTİK
"Harcama" jenerik bulundu, yeni isim aranıyor. Öneriler sunuldu, **karar verilmedi.**

| Öneri | Anlam | Not |
|---|---|---|
| **Kese** ⭐ | Para kesesi; *"kesenin ağzını açmak"* | Önerilen. İki dilde temiz okunur, özel karakter yok |
| **Akça** | Eski Türkçe "para"; *"akçalı işler"* | Global yazım "Akce" |
| **Duru** | Berrak, net | Modern app tınısı, sıcak tasarımla uyumlu |
| Kasa · Huzur · Kuruş · Birikim · Hesap | — | İkinci sıra alternatifler |

**Kaçınılacaklar:** Denge (İng. *dengue* ile karışır) · Para/Lira/Nakit (jenerik, alınmış) ·
Bütçe/Cüzdan (Türkçe karakter sorunu)

> ⚠️ **NEDEN ACİL:** `app.json` bundle kimliği `com.harcama.mobil`. Bu kimlik **mağazaya ilk
> gönderimden sonra ASLA değiştirilemez.** İsim değişecekse hesap açmadan ve uygulama kaydı
> oluşturmadan ÖNCE karar verilmeli.

**Yapılacak:** İsim seçilince → App Store/Play Store/TÜRKPATENT/domain müsaitlik kontrolü →
`app.json` (`name`, `slug`, `scheme`, bundleIdentifier/package) güncelle.

### 2.2 🟡 Mali müşavir cevabı
Kullanıcının **metal imalatı alanında mevcut bir şahıs şirketi var** (kendi üzerine).
Yeni şirket kurmaya gerek yok görünüyor — mevcut kayda **NACE 62.01.01 (bilgisayar programlama)**
eklenmesi yeterli olabilir. Müşavire sorulacaklar:

1. Mevcut şahıs şirketine yazılım NACE kodu eklenebilir mi?
2. **GVK Mükerrer 20/B** mobil uygulama geliştiriciliği kazanç istisnasından, mevcut ticari
   mükellefiyeti varken yararlanabilir mi? (2026 sınırı **5.300.000 TL**, banka %15 stopaj =
   nihai vergi, ayrı beyanname yok. Şart: istisna belgesi + özel banka hesabı)
3. Yararlanamazsa uygulama geliri metal geliriyle birleşip hangi dilime girer? Ayrı Ltd. Şti. mantıklı mı?
4. Apple İrlanda / Google'a kesilecek fatura **hizmet ihracatı** olarak KDV istisnalı mı?
5. İstisna için ayrı banka hesabı gerekiyorsa hangi bankada?

**Neden önemli:** Cevap "bireysel mi şahıs şirketi mi" seçimini belirler; Apple/Google hesabı
açarken bu seçim sonradan değiştirilemez.

### 2.3 🟡 Yasal metinler için kişisel bilgi
`docs/gizlilik-politikasi.md` + `docs/kullanim-kosullari.md` içinde `[köşeli parantez]` alanları var.
**Gerekli:** ad-soyad · iletişim e-postası · şehir. (Verilmedi.)

---

## 3. AKSİYON LİSTESİ — sırayla

### Aşama 0 — Kararlar (ŞU AN BURADAYIZ)
- [ ] Uygulama ismine karar ver → müsaitlik kontrolü → `app.json` güncelle
- [ ] Mali müşavirle görüş → bireysel/şirket kararı
- [ ] Yasal metinler için ad/e-posta/şehir bilgisi ver

### Aşama 1 — Hesaplar (1-7 gün, onay bekleme)
- [ ] **Apple Developer Program** — $99/yıl · [developer.apple.com/programs/enroll](https://developer.apple.com/programs/enroll/)
      Entity Type: müşavir cevabına göre Individual / Company. Onay 24-48 saat.
      **Hesap açar açmaz → Small Business Program başvurusu (%15 komisyon, %30 değil)**
- [ ] **Google Play Console** — $25 tek sefer · [play.google.com/console/signup](https://play.google.com/console/signup)
      Kimlik doğrulama 1-3 gün.
- [ ] **RevenueCat** — ücretsiz · [app.revenuecat.com/signup](https://app.revenuecat.com/signup) → proje adı = yeni uygulama ismi

### Aşama 2 — Görseller + metinler (hesaplar onaylanırken paralel yapılabilir)
- [ ] App ikonu **1024×1024 PNG** (şeffaf değil) → `mobile/assets/icon.png`
- [ ] Adaptive icon (Android) + splash
- [ ] Feature graphic (Google) **1024×500**
- [ ] Ekran görüntüleri: iPhone 6.7" (1290×2796) 3-10 adet · Android telefon 2+
- [ ] Mağaza metinleri: isim (≤30 karakter), alt başlık (≤30), kısa/uzun açıklama, anahtar kelimeler,
      kategori = **Finans**, yaş sınırı 4+/Everyone  *(→ Claude hazırlayacak)*
- [ ] Gizlilik politikası + kullanım koşullarını **GitHub Pages'te yayınla** →
      URL'leri `mobile/lib/yasal.ts` `YASAL_URL` ile eşitle

### Aşama 3 — Mağaza kayıtları
- [ ] App Store Connect → yeni uygulama kaydı (bundle ID buradan kilitlenir!)
- [ ] Play Console → yeni uygulama kaydı
- [ ] Apple: Agreements, Tax and Banking → **Türk IBAN + W-8BEN vergi formu**
- [ ] Google: Payments profile → **Türk IBAN**

### Aşama 4 — Abonelikler + RevenueCat
- [ ] App Store Connect → Subscriptions → grup "Harcama Üyelik" → 4 ürün (aşağıdaki tablo)
- [ ] Play Console → Subscriptions → aynı 4 ürün, monthly/annual base plans
- [ ] RevenueCat → iki mağazayı bağla (App Store Connect API key + Play service account JSON)
- [ ] RevenueCat → Entitlements: `base`, `pro` → Offering **"default"** → 4 package
- [ ] RevenueCat → Integrations → Webhooks → `https://harcama-api.onrender.com/v1/rc/webhook`
      Authorization header = `Bearer <RC_WEBHOOK_SECRET>`
- [ ] RevenueCat → API Keys → iOS + Android anahtarlarını **`mobile/eas.json`** preview+production
      env'ine yaz (`EXPO_PUBLIC_RC_IOS_KEY` / `EXPO_PUBLIC_RC_ANDROID_KEY` — alanlar hazır, boş)
- [ ] **Render env**: `RC_WEBHOOK_SECRET` (uzun rastgele string) + `BASE_AI_AYLIK=150`

### Aşama 5 — Derleme + ödeme testi
- [ ] `eas build --profile development -p android` (+ ios)
      ⚠️ Native modül eklendi → **Expo Go artık RevenueCat'i çalıştıramaz**, dev build şart
      (JS bundle Expo Go'da hâlâ açılıyor, paywall "yakında" gösteriyor — bu doğru davranış)
- [ ] Sandbox hesaplarıyla: satın al · iptal · geri yükle · yenileme · Base→Pro yükseltme · trial→base düşüş
- [ ] `eas build --profile production`

### Aşama 6 — Gönderim
- [ ] Apple: inceleme notları + **demo hesap** (çalışan e-posta/şifre) + abonelik inceleme ekran görüntüleri
- [ ] Apple Privacy Nutrition Labels + Google Data Safety formları (gizlilik politikasıyla birebir tutarlı)
- [ ] `app.json` `version` `0.1.0` → `1.0.0` · `supportsTablet` → iPad test edilmediyse **false**
- [ ] Google: **20 test kullanıcısı / 14 gün kapalı test** (zorunlu, en erken ~3 hafta) → sonra production
- [ ] Apple: incelemeye gönder (~24-48 saat)

---

## 4. Fiyatlandırma (KARAR VERİLDİ)

### Türkiye
| Plan | Aylık | Yıllık (%33 indirim) |
|---|---|---|
| **Base** | ₺59,99 | ₺479,99 (≈₺40/ay) |
| **Pro** | ₺99,99 | ₺799,99 (≈₺67/ay) |

### Diğer pazarlar (USD çıpası — mağazalar otomatik lokalize eder, TR manuel override)
| Plan | Aylık | Yıllık |
|---|---|---|
| Base | $3.99 | $29.99 |
| Pro | $6.99 | $59.99 |

### Ürün ID'leri (mağazalarda birebir bu şekilde oluşturulacak)
`base_aylik` · `base_yillik` · `pro_aylik` · `pro_yillik`
→ entitlement: `base` / `base` / `pro` / `pro`

### Katman kapsamları
| Katman | Kapsam |
|---|---|
| **Deneme** (7 gün, otomatik) | Base özellikleri + **sınırsız AI**. Hane KİLİTLİ. Süre bitince Base'e düşer |
| **Base** | Aylık **150 AI kaydı** (`BASE_AI_AYLIK`), elle giriş sınırsız, özet/analiz/bütçe/hedef |
| **Pro** | Sınırsız AI + **hane paylaşımı** |

**Ekonomi:** Groq ~$0.001/AI kaydı → tipik kullanıcı ~₺2,5/ay maliyet, power-user ~₺20.
Net gelir (KDV + %15 Apple SBP sonrası): Base ~₺42/ay, Pro ~₺71/ay. Marj %80+.

### Para akışı (netleştirildi)
`Kullanıcı → Apple/Google → (KDV + %15 komisyon kesilir) → senin IBAN'ın`
- RevenueCat **paraya dokunmaz**, sadece abonelik durumunu izler. $2.500/ay brüt gelire kadar ücretsiz.
- **Google:** ayın satışları → takip eden ayın ~15'i → 2-3 iş günü sonra hesapta. Eşik ~$100.
- **Apple:** mali ay kapanışından 33-45 gün sonra. Satıştan paraya **5-9 hafta**.
- **İlk para: ilk satıştan ~4-8 hafta sonra.**

---

## 5. Kod tarafı — ne hazır, ne eksik

### ✅ HAZIR (bu oturumda tamamlandı)
- `react-native-purchases@10.9.0` kurulu (autolinking; ayrı config plugin yok, `app.json` dokunulmadı)
- `mobile/lib/satinalma.ts` — gerçek implementasyon: savunmalı `require()` (Expo Go'da no-op),
  `satinalmaAktif()` · `baslat` · `teklifler` · `satinAl` · `geriYukle` · `mevcutPlan`,
  entitlement-bazlı plan çözümü, `STATIK_FIYAT` fallback
- `mobile/app/uyelik.tsx` — paywall: aylık/yıllık toggle, Base/Pro fiyat kartları
  (mağaza fiyatı veya statik), "Seç" → satın al → `me.refetch()`, **Geri Yükle**, yasal linkler
- `mobile/app/_layout.tsx` — giriş sonrası RevenueCat init (Supabase user id = RC appUserID)
- `api/routes/uyelik.py` — webhook: `entitlement_ids` öncelikli plan çözümü + esnek auth header
- `api/usage.py` — deneme = Base kapsamı + sınırsız AI (`_coz()` trial dalı `etkin='base'`)
- `mobile/eas.json` + `.env.example` — RC anahtar alanları hazır (boş)

### ⏳ EKSİK (hepsi hesap/karar bekliyor, kod yazımı gerektirmiyor)
- RC API anahtarlarını `eas.json`'a yazmak
- `eas build` + sandbox testi
- İsim değişirse `app.json` güncellemesi

---

## 6. Bilinen açık maddeler (düşük öncelik, lansmanı engellemez)

- `hedefler.tsx` kategori limitleri listesi `is_active=false` kategorileri de gösteriyor
  (kategori-yonet gizli işaretliyor) — tutarsızlık
- Arama server-side değil: `GET /v1/transactions?limit=400` çekip client-side filtreliyor
- `confirm.tsx`: AI listede olmayan kategori adı üretince (`kategori="fatura"`) onayla guard'ı
  sadece boşluğu kontrol ediyor → yeni kategori kullanıcı onayı olmadan otomatik oluşuyor
- Sekme çubuğunda testID yok → Maestro otomasyonu zor (adb koordinat tabanlı test kullanıldı)

---

## 7. Teknik hatırlatmalar

- **Bundle ID (`com.harcama.mobil`) ilk gönderimden sonra değiştirilemez** — isim kararı önce
- **Expo Go artık RevenueCat'i çalıştıramaz** (native modül). JS bundle hâlâ açılıyor, paywall
  "Abonelikler yakında" gösteriyor. Gerçek ödeme testi için `eas build` şart.
- Yerel geliştirme reçetesi: `docs/DEVAM.md` §9 (Android emülatör, Metro, uvicorn, adb reverse)
- Doğrulama komutları: `pytest` (111 test) · `ruff check api core tests` · `mobile/node_modules/.bin/tsc -p mobile --noEmit`
- Render env'de `BASE_AI_AYLIK=150` ayarlanmalı (kod default'u 150, yerel `.env` de 150)

---

## 8. İlgili dokümanlar

| Dosya | İçerik |
|---|---|
| `docs/YAYIN-KONTROL-LISTESI.md` | Mağaza gönderimi tam kontrol listesi (fiyat tablosu + IAP adımları dahil) |
| `docs/DEVAM.md` | Genel proje devam dosyası · §8 üyelik/fiyat · §9 yerel kurulum |
| `docs/HANE-PRO.md` | Ertelenen Pro hane özellikleri (kişi bazında kırılım, bağımsız hane bütçesi) |
| `docs/gizlilik-politikasi.md` · `docs/kullanim-kosullari.md` | Yasal metinler (`[parantez]` alanları doldurulacak) |
