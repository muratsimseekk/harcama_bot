/**
 * Abonelik satın alma — RevenueCat sarmalayıcısı.
 *
 * ŞU AN: iskele (stub). `react-native-purchases` kurulu DEĞİL çünkü Expo Go'da
 * çalışmaz — dev build gerekir. Aşağıdaki adımlar tamamlanınca aktif olur:
 *
 *  1. Apple Developer ($99) + Google Play ($25) hesapları
 *  2. App Store Connect + Play Console'da abonelik ürünleri:
 *       pro_aylik, pro_yillik, base_aylik  (id'ler backend RC_URUN_PLAN ile eşleşmeli)
 *  3. RevenueCat hesabı → iki mağazayı bağla → "Offerings" + "Entitlements" (pro / base)
 *  4. RevenueCat → Integrations → Webhooks → URL: https://harcama-api.onrender.com/v1/rc/webhook
 *       Authorization header = Render env RC_WEBHOOK_SECRET ile aynı
 *  5. `npx expo install react-native-purchases react-native-purchases-ui`
 *  6. app.json plugins'e "react-native-purchases" ekle
 *  7. `eas build --profile development` (Expo Go artık kullanılamaz)
 *  8. Bu dosyadaki STUB bölümünü aşağıdaki GERÇEK KOD ile değiştir + RC_API_KEY'leri gir
 *
 * GERÇEK KOD (kur + yapıştır):
 *
 *   import Purchases, { PurchasesOffering } from "react-native-purchases";
 *   import { Platform } from "react-native";
 *
 *   const RC_KEY = Platform.select({
 *     ios: "appl_XXXX",
 *     android: "goog_XXXX",
 *   })!;
 *
 *   export const SATINALMA_MEVCUT = true;
 *
 *   export async function baslat(userId: string) {
 *     Purchases.configure({ apiKey: RC_KEY, appUserID: userId });
 *   }
 *   export async function teklifler(): Promise<PurchasesOffering | null> {
 *     const o = await Purchases.getOfferings();
 *     return o.current ?? null;
 *   }
 *   export async function satinAl(paketId: string): Promise<boolean> {
 *     const o = await Purchases.getOfferings();
 *     const paket = o.current?.availablePackages.find((p) => p.identifier === paketId);
 *     if (!paket) return false;
 *     const { customerInfo } = await Purchases.purchasePackage(paket);
 *     return Object.keys(customerInfo.entitlements.active).length > 0;
 *   }
 *   export async function geriYukle(): Promise<boolean> {
 *     const info = await Purchases.restorePurchases();
 *     return Object.keys(info.entitlements.active).length > 0;
 *   }
 */

export const SATINALMA_MEVCUT = false;

export async function baslat(_userId: string): Promise<void> {}

export async function satinAl(_paketId: string): Promise<boolean> {
  return false;
}

export async function geriYukle(): Promise<boolean> {
  return false;
}
