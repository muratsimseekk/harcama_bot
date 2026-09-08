import { useKaranlik } from "./theme";

// Kategorik palet — Claude "dataviz" yönergesinden, CVD/kontrast doğrulaması geçmiş
// 8 renk. Sıra sabittir, asla döngüye sokulmaz; 9.+ kategori "Diğer"e katlanır.
const SERI_ACIK = [
  "#2A78D6", // mavi
  "#EB6834", // turuncu
  "#1BAF7A", // deniz yeşili
  "#EDA100", // sarı
  "#E87BA4", // magenta
  "#008300", // yeşil
  "#4A3AA7", // mor
  "#E34948", // kırmızı
];
const SERI_KOYU = [
  "#3987E5", "#D95926", "#199E70", "#C98500",
  "#D55181", "#008300", "#9085E9", "#E66767",
];
const DIGER_ACIK = "#8F8B80";
const DIGER_KOYU = "#807C72";

function karma(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Kategori adından kalıcı, tutarlı bir renk (her yerde aynı görünür). */
export function kategoriRenk(ad: string, koyu: boolean): string {
  const p = koyu ? SERI_KOYU : SERI_ACIK;
  return p[karma(ad.trim().toLowerCase()) % p.length];
}

export function useKategoriRenk(): (ad: string) => string {
  const koyu = useKaranlik();
  return (ad: string) => kategoriRenk(ad, koyu);
}

/**
 * Dağılım (pasta/bar) için sıra bazlı renk dizisi: en büyük dilim slot 0.
 * Bitişik dilimler daima ayrık ve CVD-güvenli. 8+ dilim → hepsi "Diğer" grisi
 * (çağıran taraf zaten ilk 7 + "Diğer" olarak katlamalı).
 */
export function useDagilimRenkleri(): (adet: number) => string[] {
  const koyu = useKaranlik();
  const p = koyu ? SERI_KOYU : SERI_ACIK;
  const diger = koyu ? DIGER_KOYU : DIGER_ACIK;
  return (adet: number) =>
    Array.from({ length: adet }, (_, i) => (i < p.length ? p[i] : diger));
}
