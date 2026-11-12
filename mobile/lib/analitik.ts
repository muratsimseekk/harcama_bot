import AsyncStorage from "@react-native-async-storage/async-storage";
import PostHog from "posthog-react-native";
import { useSyncExternalStore } from "react";

/**
 * Ürün analitiği (PostHog, AB sunucusu). Plan: docs/BUYUME-ANALIZI.md §4.3.
 *
 * Gizlilik kuralları — değiştirmeden önce gizlilik politikasını güncelle:
 *  - Otomatik yakalama ve oturum kaydı KAPALI; yalnız aşağıdaki adlandırılmış olaylar gider.
 *  - Tutar, açıklama, kategori adı, e-posta, ad GÖNDERİLMEZ. Özellikler yalnız sayı/sabit etiket.
 *  - Kimlik yalnız Supabase kullanıcı uuid'si; konum (GeoIP) kapalı.
 *  - Kullanıcı Ayarlar → "Kullanım istatistikleri"nden kapatabilir (cihazda saklanır).
 *
 * Anahtar yoksa (EXPO_PUBLIC_POSTHOG_KEY) ya da geliştirme modundaysa her şey sessizce no-op.
 */
const ANAHTAR = process.env.EXPO_PUBLIC_POSTHOG_KEY;
const SUNUCU = process.env.EXPO_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com";
// Geliştirmede olay gitmesin (test verisi panoyu kirletmesin); denemek için EXPO_PUBLIC_POSTHOG_DEV=1
const ETKIN = !!ANAHTAR && (!__DEV__ || process.env.EXPO_PUBLIC_POSTHOG_DEV === "1");
const TERCIH_ANAHTARI = "analitik.kapali";

export type OlayAdi =
  | "onboarding_slide_viewed"
  | "onboarding_finished"
  | "signup_completed"
  | "record_input_started"
  | "records_saved"
  | "voice_parse_failed"
  | "daily_limit_reached"
  | "rewarded_ad_completed"
  | "paywall_viewed"
  | "purchase_completed"
  | "purchase_cancelled"
  | "budget_rule_saved"
  | "recurring_created"
  | "export_completed"
  | "push_permission_result"
  | "review_prompt_shown"
  | "checklist_item_tapped"
  | "checklist_dismissed";

type Ozellik = Record<string, string | number | boolean | null | undefined>;

let ph: PostHog | null = null;
let kapali = false; // kullanıcı tercihi
const dinleyiciler = new Set<() => void>();

export function analitikBaslat() {
  if (!ETKIN || ph) return;
  try {
    ph = new PostHog(ANAHTAR!, {
      host: SUNUCU,
      captureAppLifecycleEvents: true, // yükleme / açılış — huninin başı
      enableSessionReplay: false,
      disableGeoip: true,
      personProfiles: "identified_only",
    });
  } catch {
    ph = null;
    return;
  }
  AsyncStorage.getItem(TERCIH_ANAHTARI)
    .then((v) => {
      kapali = v === "1";
      if (kapali) ph?.optOut();
      dinleyiciler.forEach((f) => f());
    })
    .catch(() => {});
}

/** Analitik yapılandırılmış mı (Ayarlar'daki anahtar yalnız o zaman görünür). */
export const analitikVar = () => ETKIN;

export function olay(ad: OlayAdi, ozellik?: Ozellik) {
  if (!ph || kapali) return;
  try {
    ph.capture(ad, ozellik as Record<string, string | number | boolean | null>);
  } catch {
    /* analitik hiçbir akışı bozmasın */
  }
}

/** Oturum açılınca uuid ile tanı, kapanınca sıfırla (bir sonraki kullanıcıya karışmasın). */
export function kimlik(uid: string | null | undefined) {
  if (!ph) return;
  try {
    if (uid) ph.identify(uid);
    else ph.reset();
  } catch {
    /* yoksay */
  }
}

export async function analitikTercih(acik: boolean) {
  kapali = !acik;
  try {
    await AsyncStorage.setItem(TERCIH_ANAHTARI, acik ? "0" : "1");
  } catch {
    /* yoksay */
  }
  try {
    if (acik) await ph?.optIn();
    else ph?.optOut();
  } catch {
    /* yoksay */
  }
  dinleyiciler.forEach((f) => f());
}

function abone(f: () => void) {
  dinleyiciler.add(f);
  return () => {
    dinleyiciler.delete(f);
  };
}

export function useAnalitikAcik(): boolean {
  return useSyncExternalStore(abone, () => !kapali, () => !kapali);
}
