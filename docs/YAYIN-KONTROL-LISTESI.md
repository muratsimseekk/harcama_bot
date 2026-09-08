# App Store + Google Play yayın kontrol listesi

> İlk kez yayınlayan için. Sıra önemli. Kod tarafında yapılanlar ✅ ile işaretli.

## 0. Takvim uyarısı

- **Google (yeni bireysel hesap):** uygulamayı production'a çıkarmadan önce **20 test
  kullanıcısıyla 14 gün kapalı test** zorunlu (Kasım 2023+). Yani en erken ~3 hafta.
  Şirket hesabı muaf ama D-U-N-S numarası ~1-2 hafta.
- **Apple:** böyle bir kural yok; ilk inceleme ~24-48 saat, red olursa döngü uzar.

## 1. Hesaplar

- [ ] Apple Developer Program — $99/yıl · developer.apple.com — **bireysel** seç (D-U-N-S gerekmez)
- [ ] Google Play Console — $25 tek sefer · play.google.com/console
- [ ] RevenueCat hesabı — ücretsiz · revenuecat.com (abonelik için)

## 2. Yasal sayfalar

- [x] Gizlilik Politikası metni — `docs/gizlilik-politikasi.md`
- [x] Kullanım Koşulları metni — `docs/kullanim-kosullari.md`
- [x] Uygulama içi görüntüleme — `app/yasal.tsx` (Ayarlar → Yasal, kayıt ekranında onay)
- [ ] Metinlerdeki `[köşeli parantez]` alanlarını doldur (ad, e-posta, adres, şehir)
- [ ] Bir hukukçuya / mali müşavire gözden geçirt (KVKK + abonelik)
- [ ] **Web'de yayınla** — GitHub Pages en kolay:
      - repo → Settings → Pages → `docs/` klasöründen yayınla, ya da ayrı bir repo
      - URL'leri `mobile/lib/yasal.ts` `YASAL_URL` ile eşitle
      - Aynı URL'leri App Store Connect + Play Console formlarına gir
- [ ] KVKK VERBİS kaydı gerekli mi kontrol et (küçük ölçek muaf olabilir)

## 3. Uygulama içi zorunluluklar

- [x] Sadece e-posta/şifre girişi (sosyal giriş kaldırıldı → "Sign in with Apple" gerekmiyor)
- [x] Şifremi unuttum → çalışır (`sifre-sifirla` + `sifre-yenile` + PKCE deep link)
      - [ ] **Supabase → Auth → URL Configuration → Redirect URLs**'e ekle:
            `harcama://sifre-yenile` ve dev için `exp://` / `exp+harcama://*`
      - [ ] Supabase → Auth → Email Templates → "Reset Password" şablonunu Türkçeleştir
      - [ ] Gerçek e-posta ile test et (deneme: e-posta gelsin → link → yeni şifre → giriş)
- [x] Hesap silme → gerçek (`DELETE /v1/me` tüm veri + auth kaydı siler; Ayarlar → Hesabı Sil)
      - [ ] Gerçek hesapla test et
- [x] "yakında" placeholder özellikler kaldırıldı (PIN, parmak izi, bildirim ayarları)
- [ ] **Demo hesap:** App Store inceleme notlarına çalışan test hesabı (e-posta + şifre) yaz
- [ ] Mikrofon/bildirim izin metinleri Türkçe ve net (mikrofon zaten var)

## 4. Backend hazırlık (inceleme sırasında çalışmalı)

- [x] `/v1/rc/webhook` — RevenueCat → `profiles.plan` senkronu
- [x] `plan_bitis` süre dolunca Base'e düşürme
- [ ] **Render soğuk başlatma çöz** (inceleyen 40 sn beklerse red):
      - En basit: `.github/workflows/keep-warm.yml` (eklendi) + repo Secret `API_URL`
      - Daha güvenilir: **cron-job.org / UptimeRobot** ile 5 dk'da bir `/health` ping (ücretsiz)
      - En temiz: **Render Starter $7/ay** — hiç uyumaz. İnceleme haftası için şart.
- [ ] `scripts/schema_uyelik.sql`, `schema_hane.sql`, `schema_categories_tip_unique.sql`
      Supabase'de çalıştırıldı mı? (evet)
- [ ] Render env: `RC_WEBHOOK_SECRET`, `RC_URUN_PLAN`

## 5. Abonelik / ödeme (RevenueCat)

- [ ] App Store Connect → Features → Subscriptions → abonelik grubu + ürünler:
      `pro_aylik`, `pro_yillik`, `base_aylik` (id'ler `RC_URUN_PLAN` ile eşleşmeli)
      - Her ürüne: fiyat, açıklama, gözden geçirme ekran görüntüsü
- [ ] Play Console → Monetize → Subscriptions → aynı ürünler
- [ ] RevenueCat → iki mağazayı bağla → Entitlements: `pro`, `base` → Offerings
- [ ] RevenueCat → Integrations → Webhooks → `https://harcama-api.onrender.com/v1/rc/webhook`
      + Authorization header = `RC_WEBHOOK_SECRET`
- [ ] `npx expo install react-native-purchases react-native-purchases-ui`
- [ ] `app.json` plugins → `"react-native-purchases"`
- [ ] `mobile/lib/satinalma.ts` → STUB bölümünü gerçek kodla değiştir + RC API key'leri
- [ ] **`eas build --profile development`** — Expo Go artık kullanılamaz, dev build şart
- [ ] Sandbox test hesaplarıyla satın alma + geri yükleme + iptal test et
- [ ] Paywall ekranı (`app/uyelik.tsx`) Apple kurallarına uygun: fiyat, süre, otomatik
      yenileme, iptal yolu, Şartlar + Gizlilik linki hepsi görünür

## 6. Mağaza varlıkları

- [ ] **App ikonu 1024×1024 PNG** (şeffaf değil) → `assets/icon.png`, `app.json`'a `"icon"`
- [ ] Adaptive icon (Android) → `assets/adaptive-icon.png` + arka plan rengi
- [ ] Splash screen → `assets/splash.png` + `app.json` `"splash"`
- [ ] `app.json`: `version` `0.1.0` → `1.0.0`
- [ ] `supportsTablet: true` → iPad UI'ı test etmedin ise **`false`** yap (yoksa iPad ekran
      görüntüsü de zorunlu)
- [ ] Ekran görüntüleri:
      - Apple: iPhone 6.7" (1290×2796) 3-10 adet
      - Google: telefon 2+ adet + **feature graphic 1024×500**
- [ ] Metinler: isim, kısa açıklama, uzun açıklama, anahtar kelimeler, **kategori = Finans**,
      yaş sınırı (4+ / Everyone)
- [ ] Açıklamada net: "kişisel bütçe takip aracı, banka bağlantısı yoktur, girdiğiniz
      veriler yapay zeka ile işlenir"

## 7. Gizlilik formları

- [ ] **Apple Privacy Nutrition Labels** (App Store Connect):
      E-posta (hesaba bağlı), Finansal Bilgi (işlemler, hesaba bağlı), Ses Verisi (geçici),
      Kullanım Verisi. "Üçüncü taraf reklamı" YOK, "izleme" YOK.
- [ ] **Google Data Safety** (Play Console): aynı veriler + "transit'te şifreli: evet" +
      "kullanıcı silme talebi: evet" (in-app + web form)
- [ ] İkisi de gizlilik politikasıyla **birebir tutarlı** olmalı

## 8. Build & gönderim

- [ ] `eas build -p ios --profile production` + `eas build -p android --profile production`
- [ ] `eas submit -p ios` / `eas submit -p android`
- [ ] Apple: App Store Connect'te uygulama kaydı, demo hesap, inceleme notları
- [ ] Google: önce kapalı test (20 kişi/14 gün), sonra production

## En sık ilk-red sebepleri (kontrol et)

1. Hesap silme yok/çalışmıyor → ✅ yapıldı, gerçek hesapla test kaldı
2. Demo hesap verilmemiş → inceleme notuna ekle
3. Gizlilik politikası erişilemez/tutarsız → web'de yayınla + formlarla eşitle
4. İnceleme anında backend down → Render keep-warm / Starter
5. IAP dışı ödeme / dış link → yok (sadece RevenueCat üzerinden)
6. Çalışmayan buton / "yakında" özellik → temizlendi; "Pro'ya Geç" gerçek ekrana gidiyor
7. Yanıltıcı ekran görüntüsü / yanlış kategori → gerçek ekranlar, Finans kategorisi
