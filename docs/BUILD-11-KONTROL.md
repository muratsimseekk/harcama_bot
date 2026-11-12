# Build 11 — yapılacaklar listesi

Hazırlandı: 2026-11-12. Kod hazır, **pushlanmadı** (faz-m1-mobil'de 9 commit: 93bb396 → b37ece2).
Genel kurallar: `docs/YAYIN-KONTROL-LISTESI.md`. Bu liste yalnız build 11'e özel.

## A. Build almadan ÖNCE

- [ ] **Build 10 production'da yayında mı?** Değilse dur — push ve build 11 bekler.
- [ ] Render'da `ANDROID_SON_SURUM=10` ayarlı mı? (build 10 onaylanınca yapılacaktı)
- [ ] **PostHog:** posthog.com → **EU Cloud** proje aç → Project API key'i kopyala
  - EAS → Environment variables (production + preview): `EXPO_PUBLIC_POSTHOG_KEY=<key>`
  - (Host varsayılan `https://eu.i.posthog.com`; değiştirme)
  - Proje ayarlarında: "Discard client IP" aç, Session replay kapalı, Autocapture kapalı
  - Anahtar eklenmezse uygulama çalışır ama hiç ölçüm olmaz
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

- [ ] **Veri güvenliği formu:** "Uygulama etkinliği → Uygulama etkileşimleri" ekle
      (toplanıyor ✓, paylaşılmıyor, isteğe bağlı, amaç: Analiz) — ayrıntı `GOOGLE-PLAY-REHBERI.md` §3.3
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

## E. Yayından 3–4 hafta sonra

- [ ] PostHog hunisi + `scripts/metrikler.sql` ile ilk ölçüm → `BUYUME-ANALIZI.md` §4.4 hedeflerini güncelle
- [ ] 3 hak / ilk gün sınırı kararını veriyle yeniden değerlendir (§2.1)
