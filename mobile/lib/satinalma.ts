/**
 * Abonelik satın alma — RevenueCat sarmalayıcısı.
 *
 * `react-native-purchases` KURULU. Ama native modül yalnız EAS dev/prod build'de
 * çalışır — Expo Go'da yoktur. Bu yüzden savunmalı yüklüyoruz: modül veya RC API
 * anahtarı yoksa tüm fonksiyonlar sessizce no-op döner, paywall "yakında" gösterir.
 *
 * Yalnız Pro satın alınabilir — Free (reklamlı) katmanın RC'de ürünü/entitlement'ı yok,
 * ödüllü reklamla kazanılır (bkz `mobile/lib/reklam.ts`).
 *
 * CANLIYA ÇIKMADAN:
 *  1. RevenueCat → Project → API Keys → iOS (`appl_…`) + Android (`goog_…`)
 *  2. `EXPO_PUBLIC_RC_IOS_KEY` / `EXPO_PUBLIC_RC_ANDROID_KEY` → eas.json (preview+production)
 *  3. RevenueCat Offering "default" → 2 package: pro_aylik, pro_yillik
 *  4. Entitlement: `pro`
 *  5. `eas build --profile production` — bu noktadan sonra ödeme aktif
 */
import { Platform } from "react-native";

type RNPModule = typeof import("react-native-purchases").default;

let RNP: RNPModule | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  RNP = require("react-native-purchases").default;
} catch {
  RNP = null;
}

const RC_KEY =
  Platform.select({
    ios: process.env.EXPO_PUBLIC_RC_IOS_KEY,
    android: process.env.EXPO_PUBLIC_RC_ANDROID_KEY,
  }) ?? "";

const ENT_PRO = "pro";

let yapilandirildi = false;

export type EtkinPlan = "pro" | null;

export type Paket = {
  id: string; // RC package / ürün id ("pro_aylik" vb.)
  plan: "pro";
  period: "aylik" | "yillik";
  fiyat: string; // yerelleştirilmiş, "₺99,99"
  _rc: unknown; // PurchasesPackage — satinAl'e verilir
};

/** Mağazadan teklif alınamadığında paywall'ın göstereceği referans fiyatlar (TR). */
export const STATIK_FIYAT: Record<string, string> = {
  pro_aylik: "₺99,99",
  pro_yillik: "₺799,99",
};

/** react-native-purchases + RC anahtarı mevcut mu (yani gerçek satın alma mümkün mü). */
export function satinalmaAktif(): boolean {
  return !!RNP && !!RC_KEY;
}

/** Uygulama açılışında bir kez çağrılır. Expo Go / anahtarsız ortamda no-op. */
export function baslat(userId: string): void {
  if (!RNP || !RC_KEY || yapilandirildi) return;
  try {
    RNP.configure({ apiKey: RC_KEY, appUserID: userId });
    yapilandirildi = true;
  } catch {
    yapilandirildi = false;
  }
}

function planCoz(aktifEntitlements: Record<string, unknown>): EtkinPlan {
  return aktifEntitlements[ENT_PRO] ? "pro" : null;
}

function paketCoz(p: {
  identifier?: string;
  product?: { identifier?: string; priceString?: string };
}): Paket {
  const id = (p.identifier || p.product?.identifier || "").toLowerCase();
  const plan: "pro" = "pro";
  const yillik = /yil|year|annual|annually/.test(id);
  return {
    id,
    plan,
    period: yillik ? "yillik" : "aylik",
    fiyat: p.product?.priceString || STATIK_FIYAT[id] || "",
    _rc: p,
  };
}

/** RevenueCat "current" offering'deki paketler. Yoksa boş dizi. */
export async function teklifler(): Promise<Paket[]> {
  if (!RNP || !yapilandirildi) return [];
  try {
    const offerings = await RNP.getOfferings();
    const cur = offerings.current;
    if (!cur) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return cur.availablePackages.map((p: any) => paketCoz(p));
  } catch {
    return [];
  }
}

/** Mevcut aktif plan (uygulama açılışında senkron kontrol için). */
export async function mevcutPlan(): Promise<EtkinPlan> {
  if (!RNP || !yapilandirildi) return null;
  try {
    const info = await RNP.getCustomerInfo();
    return planCoz(info.entitlements.active);
  } catch {
    return null;
  }
}

/** Satın alma. Kullanıcı iptalinde null döner; gerçek hatalar fırlatılır. */
export async function satinAl(paket: Paket): Promise<EtkinPlan> {
  if (!RNP) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { customerInfo } = await RNP.purchasePackage(paket._rc as any);
    return planCoz(customerInfo.entitlements.active);
  } catch (e) {
    if (e && typeof e === "object" && (e as { userCancelled?: boolean }).userCancelled) {
      return null;
    }
    throw e;
  }
}

/** "Satın alımları geri yükle" — cihaz değiştiren / yeniden kuran kullanıcı için (Apple zorunlu). */
export async function geriYukle(): Promise<EtkinPlan> {
  if (!RNP) return null;
  try {
    const info = await RNP.restorePurchases();
    return planCoz(info.entitlements.active);
  } catch {
    return null;
  }
}
