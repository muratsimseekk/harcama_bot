# Proje skill'leri

Kaynak: https://github.com/coreyhaines31/marketingskills (MIT, LICENSE-marketingskills). 2026-11-12 indirildi;
yalnız markdown (betik/hook yok). Seçilenler: product-marketing, aso, analytics, paywalls, onboarding.
Ürün bağlamı: `.agents/product-marketing.md`. Analiz: `docs/BUYUME-ANALIZI.md`.

## Geliştirme / yayın skill'leri (2026-11-13)

| Skill | Kaynak | Ne için |
|---|---|---|
| play-policy-insights | https://github.com/android/skills (Google resmi, Apache-2.0, `5815d27`) — LICENSE-android-skills | Play politikası denetimi: veri güvenliği beyanı ↔ kod, demo giriş, kısıtlı izinler. Her build öncesi (bkz `docs/BUILD-11-KONTROL.md`). Betikler yalnız Python standart kütüphanesi; tek ağ isteği Play'deki herkese açık uygulama/veri güvenliği sayfası; çıktılar `.scratch/` (git'e girmez). |
| expo-upgrade | https://github.com/expo/skills (Expo resmi, MIT, `cd91460`) — LICENSE-expo-skills | SDK yükseltme (57 → 58, hb-sdk58 dalı) |
| eas-app-stores | aynı | EAS build + Play/App Store gönderimi |

Bilerek alınmayanlar ve nedenleri: appeeky/aso-skills (yukarıdaki aso/paywalls ile çakışır), crgeee/google-playstore-toolkit
(4⭐, Şubat'tan beri güncellenmemiş, yer yer eskimiş), app-store-screenshots (kendi betiğimiz var), ui-ux-pro-max /
superpowers (yeniden tasarım/çalışma çatısı — bu aşamada fazla). Test için agent-device/Maestro ileride, bellek yeterse.
