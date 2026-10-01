/**
 * Ödüllü video reklam — AdMob sarmalayıcısı (Free katman günlük kayıt hakkı — elle+AI ortak).
 *
 * `react-native-google-mobile-ads` HENÜZ KURULU DEĞİL (AdMob hesabı/app ID bekleniyor —
 * bkz `~/.claude/plans/swirling-discovering-jellyfish.md` §7 "AdMob hesabı + EAS dev
 * build'e gated"). `satinalma.ts`'in savunmalı-yükleme desenini taklit ediyoruz: modül
 * veya ad unit ID yoksa `reklamAktif()` false döner, `reklamGoster()` sessizce "hata" verir
 * — arayan taraf (confirm.tsx/islem-form.tsx) "Reklam İzle" butonunu hiç göstermez.
 *
 * Kredi backend'de iki yoldan yazılabilir: AdMob Server-Side Verification (SSV) callback'i
 * (en güvenilir ama gecikebilir/test reklamlarında hiç gelmez) VE bu dosyanın kendisi —
 * native SDK'nın EARNED_REWARD event'i tetiklenince `/v1/ads/claim`'i çağırıp krediyi hemen
 * ister (bkz api/routes/reklam.py modül docstring — güvenlik ödünü orada açıklanıyor).
 * İkisi de aynı token'ı idempotency anahtarı kullandığı için çifte kredi verilmez.
 *
 * CANLIYA ÇIKMADAN:
 *  1. `npx expo install react-native-google-mobile-ads`
 *  2. AdMob hesabı → Android + iOS app ID + ödüllü video ad unit ID
 *  3. `mobile/app.json` plugin bloğuna gerçek app ID'ler + `expo-tracking-transparency`
 *  4. `EXPO_PUBLIC_ADMOB_REWARDED_ANDROID` / `_IOS` → eas.json (preview+production)
 *  5. AdMob → Server-Side Verification callback URL = `<API>/v1/ads/ssv`
 *  6. `eas build --profile development` — bu noktadan sonra gerçek reklam yüklenir
 */
import { Platform } from "react-native";
import { requestTrackingPermissionsAsync } from "expo-tracking-transparency";
import { api } from "@/lib/api";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RGMAModule = any;

let RGMA: RGMAModule | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  RGMA = require("react-native-google-mobile-ads");
} catch {
  RGMA = null;
}

// Debug build'de her zaman Google'ın test birimi: kendi gerçek reklamını izlemek/tıklamak
// AdMob politikası gereği hesabın askıya alınmasına yol açabilir.
const AD_UNIT_ID =
  (__DEV__ && RGMA?.TestIds?.REWARDED) ||
  (Platform.select({
    ios: process.env.EXPO_PUBLIC_ADMOB_REWARDED_IOS,
    android: process.env.EXPO_PUBLIC_ADMOB_REWARDED_ANDROID,
  }) ?? "");

/** react-native-google-mobile-ads kurulu + ad unit ID mevcut mu. */
export function reklamAktif(): boolean {
  return !!RGMA && !!AD_UNIT_ID;
}

export type ReklamSonuc = "izlendi" | "iptal" | "hata";

/**
 * Ödüllü reklam yükler + gösterir. Kullanıcı sonuna kadar izlerse "izlendi" döner —
 * bu, krediyi GARANTİ ETMEZ (SSV backend'de birkaç saniye içinde işler). Arayan taraf
 * "izlendi" sonrası kısa bir gecikmeyle `/v1/me`'yi yeniden çekmeli.
 */
export async function reklamGoster(): Promise<ReklamSonuc> {
  if (!reklamAktif()) return "hata";
  try {
    // Apple zorunlu tutuyor: SDK kendiliğinden prompt açmaz, ilk reklamdan önce iste
    // (kullanıcı daha önce cevapladıysa no-op — tekrar prompt çıkmaz).
    if (Platform.OS === "ios") {
      await requestTrackingPermissionsAsync().catch(() => {});
    }
    const { token } = await api.adsRequestToken();
    const { RewardedAd, RewardedAdEventType, AdEventType } = RGMA;

    return await new Promise<ReklamSonuc>((resolve) => {
      const reklam = RewardedAd.createForAdRequest(AD_UNIT_ID, {
        serverSideVerificationOptions: { customData: token },
      });

      let kazanildi = false;
      const kaldir1 = reklam.addAdEventListener(
        RewardedAdEventType.EARNED_REWARD,
        () => {
          kazanildi = true;
          // SSV'yi beklemeden krediyi hemen iste — sessizce başarısız olursa (ağ/token
          // süresi vs.) SSV zaten aynı token'la yedek olarak dener.
          api.adsClaim(token).catch(() => {});
        },
      );
      const kaldir2 = reklam.addAdEventListener(RewardedAdEventType.LOADED, () => reklam.show());
      const kaldir3 = reklam.addAdEventListener(AdEventType.CLOSED, () => {
        kaldir1();
        kaldir2();
        kaldir3();
        resolve(kazanildi ? "izlendi" : "iptal");
      });
      const kaldir4 = reklam.addAdEventListener(AdEventType.ERROR, () => {
        kaldir1();
        kaldir2();
        kaldir3();
        kaldir4();
        resolve("hata");
      });

      reklam.load();
    });
  } catch {
    return "hata";
  }
}
