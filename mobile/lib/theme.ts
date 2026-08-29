import { Platform, useColorScheme, type ViewStyle } from "react-native";

const light = {
  bg: "#F3F4F7",
  card: "#FFFFFF",
  cardAlt: "#F7F8FA",
  border: "#E6E8EC",
  hairline: "#EDEEF1",
  text: "#0B1220",
  textMuted: "#697386",
  textFaint: "#9AA1AE",
  primary: "#2F6BFF",
  primarySoft: "#E9F0FF",
  primaryText: "#FFFFFF",
  danger: "#E5484D",
  dangerSoft: "#FBECEC",
  success: "#11A150",
  successSoft: "#E4F5EA",
  warn: "#B45309",
  warnSoft: "#FEF1D6",
  gider: "#E5484D",
  gelir: "#11A150",
  // tür renkleri
  kisisel: "#2F6BFF",
  isletme: "#11A150",
  yatirim: "#8B5CF6",
};

const dark: typeof light = {
  bg: "#0A0E17",
  card: "#141A24",
  cardAlt: "#1B222E",
  border: "#242C39",
  hairline: "#1E2530",
  text: "#EEF1F6",
  textMuted: "#98A2B3",
  textFaint: "#6B7688",
  primary: "#5B8DEF",
  primarySoft: "#17233C",
  primaryText: "#FFFFFF",
  danger: "#F2555A",
  dangerSoft: "#2A1618",
  success: "#3ECF7C",
  successSoft: "#13251C",
  warn: "#F0B45E",
  warnSoft: "#2B2110",
  gider: "#F2555A",
  gelir: "#3ECF7C",
  kisisel: "#5B8DEF",
  isletme: "#3ECF7C",
  yatirim: "#A78BFA",
};

export type Renkler = typeof light;

export function useRenkler(): Renkler {
  return useColorScheme() === "dark" ? dark : light;
}

export function useKaranlik(): boolean {
  return useColorScheme() === "dark";
}

/** Boşluk ölçeği (8pt tabanlı) */
export const SP = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

/** Köşe yarıçapı */
export const R = { sm: 8, md: 12, lg: 16, xl: 22, pill: 999 } as const;

/** Kart/yüzey gölgesi (tema-duyarlı çağır) */
export function golge(seviye: 1 | 2 = 1): ViewStyle {
  if (Platform.OS === "android") return { elevation: seviye === 1 ? 2 : 5 };
  return {
    shadowColor: "#0B1220",
    shadowOpacity: seviye === 1 ? 0.06 : 0.12,
    shadowRadius: seviye === 1 ? 8 : 16,
    shadowOffset: { width: 0, height: seviye === 1 ? 2 : 6 },
  };
}

/** Kategori grafiği renk paleti (API rengi yoksa buradan sırayla). */
export const PALET = [
  "#2F6BFF", "#8B5CF6", "#EC4899", "#F97316", "#F59E0B", "#11A150",
  "#06B6D4", "#EF4444", "#A855F7", "#84CC16", "#14B8A6", "#F43F5E",
];

export function paletRenk(i: number): string {
  return PALET[i % PALET.length];
}
