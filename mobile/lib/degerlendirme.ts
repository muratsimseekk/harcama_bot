import AsyncStorage from "@react-native-async-storage/async-storage";
import * as StoreReview from "expo-store-review";
import { olay } from "./analitik";

/**
 * Play / App Store uygulama içi değerlendirme penceresi (Play In-App Review API).
 * Yalnız olumlu anlarda istenir, hata sonrası asla. Google kendi kotasını da uygular —
 * istek her zaman pencere açmaz; bu yüzden "gösterildi" değil "istendi" kaydedilir.
 */
const SON_ANAHTARI = "degerlendirme.son";
const ARALIK_GUN = 120;
/** Kayıt sonrası tetik için en az bu kadar kayıt (alışkanlık oluşmuş olsun). */
export const DEGERLENDIRME_ESIK = 15;

export type DegerlendirmeTetik = "kayit" | "disa_aktar" | "pro" | "hedef";

export async function degerlendirmeIste(tetik: DegerlendirmeTetik): Promise<boolean> {
  try {
    const son = Number((await AsyncStorage.getItem(SON_ANAHTARI)) ?? 0);
    if (son && Date.now() - son < ARALIK_GUN * 86_400_000) return false;
    if (!(await StoreReview.isAvailableAsync()) || !(await StoreReview.hasAction())) return false;
    await AsyncStorage.setItem(SON_ANAHTARI, String(Date.now()));
    olay("review_prompt_shown", { tetik });
    await StoreReview.requestReview();
    return true;
  } catch {
    return false;
  }
}
