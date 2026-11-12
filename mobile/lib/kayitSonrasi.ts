import AsyncStorage from "@react-native-async-storage/async-storage";
import { olay } from "./analitik";
import { bildirimDurumu } from "./bildirim";
import { DEGERLENDIRME_ESIK, degerlendirmeIste } from "./degerlendirme";

/**
 * Kayıt kaydedildikten sonra tek giriş noktası (onay ekranı ve elle ekleme):
 *  1. analitik olayı,
 *  2. hesabın İLK kaydıysa kutlama (+ izin hiç sorulmadıysa günlük özet bildirimi sorusu),
 *  3. değilse ve bildirim izni hiç sorulmadıysa bir kez bağlamlı izin sorusu,
 *  4. hiçbiri değilse ve alışkanlık oluştuysa uygulama içi değerlendirme isteği.
 * Pencere <IlkAdimPenceresi /> (kökte) tarafından gösterilir.
 */
export type Girdi = "ses" | "yazi" | "elle" | "hizli";

export type PencereIcerik = { tur: "ilk_kayit"; bildirimSor: boolean } | { tur: "bildirim" };

const SORULDU_ANAHTARI = "bildirim.soruldu";

let pencere: (PencereIcerik & { no: number }) | null = null;
let sayac = 0;
const dinleyiciler = new Set<() => void>();
const yayinla = () => dinleyiciler.forEach((f) => f());

export function pencereAbone(f: () => void) {
  dinleyiciler.add(f);
  return () => {
    dinleyiciler.delete(f);
  };
}
export const pencereDurumu = () => pencere;
export function pencereKapat() {
  pencere = null;
  yayinla();
}
function pencereAc(icerik: PencereIcerik) {
  pencere = { ...icerik, no: ++sayac };
  yayinla();
}

export async function bildirimSoruldu(): Promise<void> {
  try {
    await AsyncStorage.setItem(SORULDU_ANAHTARI, "1");
  } catch {
    /* yoksay */
  }
}

async function bildirimSorulmali(): Promise<boolean> {
  if ((await bildirimDurumu()) !== "undetermined") return false;
  try {
    return (await AsyncStorage.getItem(SORULDU_ANAHTARI)) !== "1";
  } catch {
    return false;
  }
}

/**
 * @param oncekiToplam kayıttan ÖNCEKİ toplam kayıt sayısı (/me → toplam_kayit); bilinmiyorsa undefined.
 */
export async function kayitSonrasi(o: { adet: number; girdi: Girdi; oncekiToplam: number | undefined }) {
  const ilk = o.oncekiToplam === 0;
  olay("records_saved", { adet: o.adet, girdi: o.girdi, ilk_kayit: ilk });

  // Başarı katmanı ve geri dönüş animasyonu bitsin, sonra pencere
  await new Promise((r) => setTimeout(r, 700));

  const sor = await bildirimSorulmali();
  if (ilk) {
    pencereAc({ tur: "ilk_kayit", bildirimSor: sor });
    return;
  }
  if (sor) {
    pencereAc({ tur: "bildirim" });
    return;
  }
  const sonraki = (o.oncekiToplam ?? 0) + o.adet;
  if (o.oncekiToplam !== undefined && sonraki >= DEGERLENDIRME_ESIK) {
    await degerlendirmeIste("kayit");
  }
}
