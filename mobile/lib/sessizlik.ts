/**
 * Sesli kayıtta sessizlik algılama — saf mantık, kayıt seviyesini (dBFS) örnek örnek değerlendirir.
 *
 * Eşik sabit değil, ortam gürültüsüne uyar: taban düşük seviyeleri anında izler, yukarı yavaş
 * tırmanır. Konuşma aralarındaki kısa düşüşler tabanı aşağıda tuttuğu için konuşma ayırt edilir;
 * sabit gürültü ise (fan, trafik) bir süre sonra tabana karışıp "konuşma" sayılmaz.
 */

/** Konuştuktan sonra bu kadar sessizlikte kayıt biter ve gönderilir. */
export const SESSIZLIK_MS = 3000;
/** Hiç konuşmadan bu kadar geçerse kayıt gönderilmeden kapanır. */
export const KONUSMA_BEKLEME_MS = 8000;
/** Sesli kaydın üst sınırı (gürültüde sessizlik hiç yakalanamazsa da mikrofon açık kalmasın). */
export const MAX_KAYIT_MS = 120_000;
/** Seviye okuma aralığı (ms). */
export const OLCUM_ARALIGI_MS = 200;

const TABAN_BASLANGIC = -50; // dB — sessiz oda varsayımı
const TABAN_ALT = -70; // dB — Android ilk okumada -160 verir, taban oraya inmesin
const TABAN_YUKSELME = 1.5; // dB/sn
const TABAN_USTU = 12; // dB — tabanın bu kadar üstü konuşma
const MUTLAK_ESIK = -50; // dB — bunun altı tabandan bağımsız olarak konuşma değil
const KONUSMA_ORNEGI = 2; // art arda örnek — kapı çarpması gibi tek ani ses konuşma sayılmaz

export type SesKarari = "dinle" | "bitir" | "vazgec";

export function sessizlikAlgilayici(baslangic: number) {
  let taban = TABAN_BASLANGIC;
  let sonOlcum = baslangic;
  let sonKonusma = baslangic;
  let ardArda = 0;
  let konustu = false;

  /** `db` yoksa cihaz seviye bildirmiyordur: yalnız üst sınır geçerli, kullanıcı elle bitirir. */
  return (db: number | undefined, simdi: number): SesKarari => {
    if (simdi - baslangic >= MAX_KAYIT_MS) return "bitir";
    if (db === undefined) return "dinle";

    const seviye = Math.max(db, TABAN_ALT);
    taban = Math.min(seviye, taban + (TABAN_YUKSELME * (simdi - sonOlcum)) / 1000);
    sonOlcum = simdi;

    if (seviye > Math.max(taban + TABAN_USTU, MUTLAK_ESIK)) {
      ardArda += 1;
      if (ardArda >= KONUSMA_ORNEGI) konustu = true;
      if (konustu) sonKonusma = simdi;
    } else {
      ardArda = 0;
    }

    if (konustu) return simdi - sonKonusma >= SESSIZLIK_MS ? "bitir" : "dinle";
    return simdi - baslangic >= KONUSMA_BEKLEME_MS ? "vazgec" : "dinle";
  };
}
