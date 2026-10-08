import * as Network from "expo-network";

/**
 * İnternet kesin yoksa true. Durum bilinmiyorsa (null/undefined) false döner — isteği
 * engellemeyiz; asıl hata zaten api.ts'de Türkçe BAGLANTI_HATASI'na çevrilir.
 */
export async function cevrimdisi(): Promise<boolean> {
  try {
    const d = await Network.getNetworkStateAsync();
    return d.isConnected === false || d.isInternetReachable === false;
  } catch {
    return false;
  }
}
