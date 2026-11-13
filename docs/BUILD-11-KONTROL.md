# Build 11 — yapılacaklar listesi

Hazırlandı: 2026-11-12. Kod hazır, **pushlanmadı** (faz-m1-mobil'de 9 commit: 93bb396 → b37ece2).
Genel kurallar: `docs/YAYIN-KONTROL-LISTESI.md`. Bu liste yalnız build 11'e özel.

## A. Build almadan ÖNCE

- [x] **Build 10 production'da yayında** (2026-11-13: Play'de herkese açık, yalnız Türkiye, 12 yükleme)
- [x] Render'da `ANDROID_SON_SURUM=10` (2026-11-13 `/v1/surum` → `{"android":10}`)
- [ ] **Play uyarısı — DEX optimizasyonu / kod karartma %1** (son tarih Şub 2027): R8 kapalı. Karar ver:
      build 11'e mi build 12'ye mi? Açmak için `expo-build-properties` → `android.enableMinifyInReleaseBuilds`
      + `enableShrinkResourcesInReleaseBuilds`; önce **preview build**'de tüm akışlar denenmeli (giriş, ses,
      reklam, satın alma, dışa aktar) — R8 eksik keep kuralıyla release'te çökme yapabilir.
- [ ] Play uyarısı — uçtan uca ekran (edge-to-edge) eski API: kütüphanelerden gelen bilgi amaçlı uyarı,
      engelleyici değil; Play Console'da hangi API'ler listelendiğine bak, SDK yükseltmesinde tekrar kontrol et
- [x] **PostHog:** posthog.com → **EU Cloud** proje aç → Project API key'i kopyala
      (2026-11-14: anahtar EAS production + preview'a eklendi, `eas env:list` ile doğrulandı)
  - EAS → Environment variables (production + preview): `EXPO_PUBLIC_POSTHOG_KEY=<key>`
  - (Host varsayılan `https://eu.i.posthog.com`; değiştirme)
  - Proje ayarlarında: "Discard client IP" aç, Session replay kapalı, Autocapture kapalı
  - Anahtar eklenmezse uygulama çalışır ama hiç ölçüm olmaz
- [x] **Play politika denetimi** (Google `play-policy-insights` skill'i, 2026-11-13): 🟢 Uyumlu — kritik/önemli bulgu
  yok. Uygulanan öneriler: kayıt arka plana geçince/sekme değişince atılıyor (`ekle.tsx`), eski depolama
  izinleri `blockedPermissions`'a eklendi. Kod değişirse build'den önce tekrar çalıştır: Claude'a
  "play-policy-insights ile denetle" de (çıktı `.scratch/`, git'e girmez).
- [ ] Sentry eski token'larının silindiğini teyit et (bkz memory: Sentry token rotasyonu)
- [ ] **Push:** `git push origin faz-m1-mobil` → Render otomatik deploy
  - Backend'de yeni: kategori bazlı limit/hedef (`budgets.tur` — SQL zaten çalıştırıldı ✅), hedefe ulaşınca bildirim
  - Kontrol: https://harcama-api.onrender.com/health ve uygulamada Hedefler ekranı açılıyor mu
  - `site/` de güncellendi (gizlilik politikasına PostHog eklendi) → yayındaki gizlilik sayfasında "PostHog" görünüyor mu kontrol et
- [ ] Build: `cd mobile && eas build --platform android --profile production`
  (versionCode uzaktan otomatik artar → 11 olmalı)

## B. Build geldikten sonra, yayına göndermeden ÖNCE (telefonda / dahili test)

Expo Go'da denenemeyenler — gerçek build'de mutlaka bak:
- [ ] **Yeni hesap akışı:** yeni hesap aç → ana sayfada "İlk harcamanı söyle" kartı → örnekle kaydet
      → "İlk kaydın tamam 🎉" penceresi + bildirim sorusu → "Evet" → sistem izni çıkıyor mu
- [ ] Eski hesap (izni zaten vermiş): açılışta izin penceresi ÇIKMAMALI, bildirimler gelmeye devam etmeli
- [ ] Başlangıç listesi: adımlar işaretleniyor mu, "Günlük özeti aç" çalışıyor mu, X ile kapanıyor mu
- [ ] Ayarlar → Bildirimler (Açık/Kapalı) ve Kullanım istatistikleri satırları
- [ ] PostHog → Activity/Live events: `signup_completed`, `records_saved`, `paywall_viewed` geliyor mu
      (tutar/açıklama gibi alanlar OLMAMALI)
- [ ] Pro ekranı: limit dolunca / dışa aktarda / tekrarlayanda doğru başlık; yıllıkta "Ayda yalnız ₺33,33"
- [ ] Uygulama içi değerlendirme: yalnız Play'den yüklenen sürümde görünür (dahili test kanalı) —
      görünmezse sorun değil, Google kotası
- [ ] Google ile giriş, sesli kayıt, reklam izleme, satın alma ekranı hâlâ çalışıyor mu (genel duman testi)

## C. Play Console'a gönderirken

- [ ] **Veri güvenliği formu** — iki yeni satır (ayrıntı `GOOGLE-PLAY-REHBERI.md` §3.3):
  - "Uygulama etkinliği → **Uygulama etkileşimleri**": toplanıyor, paylaşılmıyor, isteğe bağlı, amaç Analiz (PostHog)
  - "Kişisel bilgi → **Kullanıcı kimlikleri**": toplanıyor, paylaşılmıyor, amaç Uygulama işlevi (RevenueCat) +
    Analiz (PostHog) — Play denetimi bunu eksik buldu
- [ ] Play Console → App bundle explorer → build 11 izinleri: yalnız İnternet, RECORD_AUDIO, MODIFY_AUDIO_SETTINGS,
      VIBRATE, AD_ID, POST_NOTIFICATIONS, BILLING, ağ durumu, WAKE_LOCK/RECEIVE_BOOT gibi kütüphane izinleri olmalı;
      depolama ve SYSTEM_ALERT_WINDOW OLMAMALI
- [ ] Sürüm notları (öneri):
      ```
      • Her kategoriye ister limit ister hedef koy
      • Analiz'de kategori kıyası: geçen aya göre yüzde kaç değişti
      • Excel / PDF dökümü daha kolay bulunuyor
      • Yeni başlayanlar için başlangıç listesi
      • Hata düzeltmeleri ve iyileştirmeler
      ```
- [ ] İncelemeye gönder

## D. Build 11 YAYINA GİRİNCE (önce değil — olmayan özelliği vaat etmek politika ihlali)

- [ ] Render → `ANDROID_SON_SURUM=11` → kontrol: https://harcama-api.onrender.com/v1/surum
- [ ] Mağaza girişi: kısa + uzun açıklama **v2** → `MAGAZA-METINLERI.md` ("Build 11 yayına girince" bölümü)
- [ ] Ekran görüntüleri: eskileri sil, `docs/magaza-gorselleri/ekran-1..8.png` yükle (bu sırayla)
- [ ] hb-sdk58 test dalını faz-m1-mobil ile eşitle

## E2. Türkiye dışına açılırken (İngilizce sürümle birlikte — build 11 kapsamı DEĞİL)

Uygulama şu an yalnız Türkiye'de dağıtılıyor. Başka ülke (özellikle AB/AEA, İngiltere) açılmadan önce:
- [ ] AdMob: Google UMP izin penceresi (AEA/İngiltere için zorunlu onaylı CMP)
- [ ] PostHog: AB kullanıcıları için baştan onay (opt-in); şu an kapatılabilir (opt-out)
- [ ] Hesap silinince PostHog'daki kişi profilini de sil (ya da gizlilik politikasında saklama süresini yaz)
- [ ] Gizlilik politikası + mağaza metinleri İngilizce

## E. Yayından 3–4 hafta sonra

- [ ] PostHog hunisi + `scripts/metrikler.sql` ile ilk ölçüm → `BUYUME-ANALIZI.md` §4.4 hedeflerini güncelle
- [ ] 3 hak / ilk gün sınırı kararını veriyle yeniden değerlendir (§2.1)
