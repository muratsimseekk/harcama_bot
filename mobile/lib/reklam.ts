/**
 * Ödüllü video reklam — AdMob sarmalayıcısı (Free katman günlük kayıt hakkı — elle+AI ortak).
 *
 * `react-native-google-mobile-ads` HENÜZ KURULU DEĞİL (AdMob hesabı/app ID bekleniyor —
 * bkz `~/.claude/plans/swirling-discovering-jellyfish.md` §7 "AdMob hesabı + EAS dev
 * build'e gated"). `satinalma.ts`'in savunmalı-yükleme desenini taklit ediyoruz: modül
 * veya ad unit ID yoksa `reklamAktif()` false döner, `reklamGoster()` sessizce "hata" verir
 * — arayan taraf (confirm.tsx/islem-form.tsx) "Reklam İzle" butonunu hiç göstermez.
 *
 * Hız: reklam önceden yüklenir (`reklamOnYukle`) ve hak, claim cevabıyla anında onaylanır.
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

// Debug build'de ve preview APK'da (EXPO_PUBLIC_REKLAM_TEST=1, eas.json) her zaman Google'ın
// test birimi: kendi gerçek reklamını izlemek/tıklamak AdMob politikası gereği hesabın
// askıya alınmasına yol açabilir. Gerçek birim yalnız production (mağaza) build'inde.
const TEST_REKLAM = __DEV__ || process.env.EXPO_PUBLIC_REKLAM_TEST === "1";
const AD_UNIT_ID =
  (TEST_REKLAM && RGMA?.TestIds?.REWARDED) ||
  (Platform.select({
    ios: process.env.EXPO_PUBLIC_ADMOB_REWARDED_IOS,
    android: process.env.EXPO_PUBLIC_ADMOB_REWARDED_ANDROID,
  }) ?? "");

/** react-native-google-mobile-ads kurulu + ad unit ID mevcut mu. */
export function reklamAktif(): boolean {
  return !!RGMA && !!AD_UNIT_ID;
}

export type ReklamSonuc = "izlendi" | "iptal" | "hata";

/** `onaylandi`: sunucu hakkı eklediğini doğruladı (`/v1/ads/claim` 200) — arayan taraf
 * `/v1/me`'yi yoklamadan hemen "kazandın" diyebilir. false ise SSV yedeğini beklemeli. */
export type ReklamCevap = { sonuc: ReklamSonuc; onaylandi: boolean };

// Önceden yüklenmiş reklam. Token (SSV customData) sunucuda 10 dk geçerli — 8 dk'dan eski
// hazır reklam atılıp yenisi yüklenir.
type Hazir = { reklam: RGMAModule; token: string; yuklendi: Promise<boolean> };
let hazir: Promise<Hazir> | null = null;
let hazirZaman = 0;
const TAZE_MS = 8 * 60_000;

async function olustur(): Promise<Hazir> {
  // Apple zorunlu tutuyor: SDK kendiliğinden prompt açmaz, ilk reklamdan önce iste
  // (kullanıcı daha önce cevapladıysa no-op — tekrar prompt çıkmaz).
  if (Platform.OS === "ios") {
    await requestTrackingPermissionsAsync().catch(() => {});
  }
  const { token } = await api.adsRequestToken();
  const { RewardedAd, RewardedAdEventType, AdEventType } = RGMA;
  const reklam = RewardedAd.createForAdRequest(AD_UNIT_ID, {
    serverSideVerificationOptions: { customData: token },
  });
  const yuklendi = new Promise<boolean>((resolve) => {
    const k1 = reklam.addAdEventListener(RewardedAdEventType.LOADED, () => {
      k1();
      k2();
      resolve(true);
    });
    const k2 = reklam.addAdEventListener(AdEventType.ERROR, () => {
      k1();
      k2();
      resolve(false);
    });
  });
  reklam.load();
  return { reklam, token, yuklendi };
}

/**
 * Reklamı arka planda önceden yükler — "Reklam İzle"ye basınca beklemeden açılsın.
 * Hak bitmek üzereyken ve hak paneli açılınca çağrılır; hazır taze reklam varsa no-op.
 */
export function reklamOnYukle(): void {
  if (!reklamAktif()) return;
  if (hazir && Date.now() - hazirZaman < TAZE_MS) return;
  const yeni = olustur();
  hazir = yeni;
  hazirZaman = Date.now();
  // Yüklenemediyse (ağ, fill yok vb.) bırak ki bir sonraki çağrı yeniden denesin.
  const birak = () => {
    if (hazir === yeni) hazir = null;
  };
  yeni.then((h) => h.yuklendi.then((ok) => !ok && birak())).catch(birak);
}

/**
 * Ödüllü reklamı gösterir (hazır varsa anında, yoksa yükleyip). Kullanıcı sonuna kadar
 * izlerse EARNED_REWARD anında `/v1/ads/claim` istenir; reklam kapanınca o cevap
 * beklenir (çoğu zaman çoktan gelmiştir). Kapanınca sıradaki reklam önceden yüklenir
 * (birden çok reklam art arda izlenecekse ikincisi beklemeden açılsın).
 */
export async function reklamGoster(): Promise<ReklamCevap> {
  if (!reklamAktif()) return { sonuc: "hata", onaylandi: false };
  try {
    // Önceden yükleme sürüyorsa yenisini başlatma, onu bekle.
    const bekleyen = hazir && Date.now() - hazirZaman < TAZE_MS ? hazir : null;
    hazir = null;
    const h = (bekleyen && (await bekleyen.catch(() => null))) || (await olustur());
    if (!(await h.yuklendi)) return { sonuc: "hata", onaylandi: false };
    const { reklam, token } = h;
    const { RewardedAdEventType, AdEventType } = RGMA;

    return await new Promise<ReklamCevap>((resolve) => {
      let talep: Promise<boolean> | null = null;
      const kaldir1 = reklam.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
        // SSV'yi beklemeden krediyi hemen iste — başarısız olursa (ağ/token süresi vs.)
        // SSV aynı token'la yedek olarak dener (idempotent).
        talep = api
          .adsClaim(token)
          .then(() => true)
          .catch(() => false);
      });
      const bitir = () => {
        kaldir1();
        kaldir2();
        kaldir3();
        reklamOnYukle();
      };
      const kaldir2 = reklam.addAdEventListener(AdEventType.CLOSED, () => {
        bitir();
        if (!talep) return resolve({ sonuc: "iptal", onaylandi: false });
        talep.then((onaylandi) => resolve({ sonuc: "izlendi", onaylandi }));
      });
      const kaldir3 = reklam.addAdEventListener(AdEventType.ERROR, () => {
        bitir();
        resolve({ sonuc: "hata", onaylandi: false });
      });
      reklam.show();
    });
  } catch {
    return { sonuc: "hata", onaylandi: false };
  }
}
