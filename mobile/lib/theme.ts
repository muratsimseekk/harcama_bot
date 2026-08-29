import { Platform, type TextStyle, type ViewStyle } from "react-native";
import { useEtkinSema } from "./tema";

// "Sıcak & Sakin" — sıcak krem zemin, adaçayı + amber vurgular
const light = {
  bg: "#F6F4EF",
  bgAlt: "#FBFAF6",
  card: "#FFFFFF",
  cardAlt: "#F4F1EA",
  border: "#E7E2D6",
  hairline: "#EDEAE0",
  text: "#23201B",
  textMuted: "#6E685C",
  textFaint: "#A79F8E",
  primary: "#2E7D5B",
  primarySoft: "#E3EFE8",
  primaryText: "#FFFFFF",
  accent: "#E8A44C",
  accentSoft: "#FBEEDA",
  danger: "#C1553D",
  dangerSoft: "#F6E6E0",
  success: "#2E7D5B",
  successSoft: "#E3EFE8",
  warn: "#B67514",
  warnSoft: "#FBEEDA",
  gider: "#C1553D",
  gelir: "#2E7D5B",
  kisisel: "#2E7D5B",
  isletme: "#4A6FA5",
  yatirim: "#8A6BB0",
  golgeRenk: "#2A2115",
};

const dark: typeof light = {
  bg: "#14181A",
  bgAlt: "#171C1E",
  card: "#1E2427",
  cardAlt: "#242B2E",
  border: "#2C3438",
  hairline: "#232A2D",
  text: "#ECEAE3",
  textMuted: "#9AA09B",
  textFaint: "#6E7570",
  primary: "#4FAE84",
  primarySoft: "#182A22",
  primaryText: "#0B1010",
  accent: "#F0B45E",
  accentSoft: "#2C2313",
  danger: "#D97961",
  dangerSoft: "#2E1B16",
  success: "#4FAE84",
  successSoft: "#182A22",
  warn: "#E8A44C",
  warnSoft: "#2C2313",
  gider: "#D97961",
  gelir: "#4FAE84",
  kisisel: "#4FAE84",
  isletme: "#7DA0D4",
  yatirim: "#B79BDB",
  golgeRenk: "#000000",
};

export type Renkler = typeof light;

export function useRenkler(): Renkler {
  return useEtkinSema() === "dark" ? dark : light;
}

export function useKaranlik(): boolean {
  return useEtkinSema() === "dark";
}

/** Boşluk ölçeği (8pt tabanlı) */
export const SP = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 36 } as const;

/** Köşe yarıçapı — yumuşak, sakin */
export const R = { sm: 10, md: 14, lg: 18, xl: 26, pill: 999 } as const;

/** Yazı tipi ailesi — fontWeight → PlusJakartaSans dosyası */
export const FONT: Record<string, string> = {
  "400": "PlusJakartaSans_400Regular",
  "500": "PlusJakartaSans_500Medium",
  "600": "PlusJakartaSans_600SemiBold",
  "700": "PlusJakartaSans_700Bold",
  "800": "PlusJakartaSans_800ExtraBold",
};

/** Tip ölçeği — kullanımı: <Text style={T.title}> */
export const T: Record<string, TextStyle> = {
  display: { fontFamily: FONT["800"], fontSize: 34, letterSpacing: -0.6 },
  title: { fontFamily: FONT["800"], fontSize: 24, letterSpacing: -0.4 },
  heading: { fontFamily: FONT["700"], fontSize: 17, letterSpacing: -0.2 },
  body: { fontFamily: FONT["500"], fontSize: 15 },
  bodyBold: { fontFamily: FONT["700"], fontSize: 15 },
  label: { fontFamily: FONT["600"], fontSize: 13 },
  caption: { fontFamily: FONT["500"], fontSize: 12 },
  overline: {
    fontFamily: FONT["700"],
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  para: { fontFamily: FONT["800"], fontVariant: ["tabular-nums"], letterSpacing: -0.4 },
};

/** Kart/yüzey gölgesi — sıcak, yumuşak */
export function golge(seviye: 1 | 2 | 3 = 1): ViewStyle {
  if (Platform.OS === "android") return { elevation: seviye === 1 ? 1 : seviye === 2 ? 4 : 9 };
  const cfg = {
    1: { o: 0.05, r: 10, y: 3 },
    2: { o: 0.09, r: 20, y: 8 },
    3: { o: 0.14, r: 32, y: 16 },
  }[seviye];
  return {
    shadowColor: light.golgeRenk,
    shadowOpacity: cfg.o,
    shadowRadius: cfg.r,
    shadowOffset: { width: 0, height: cfg.y },
  };
}

export const PALET = [
  "#2E7D5B", "#4A6FA5", "#8A6BB0", "#E8A44C", "#C1553D", "#3E8E7E",
  "#B07C4F", "#7C8B3E", "#A85C7A", "#5B7B9A", "#C99A3E", "#6B9E6E",
];

export function paletRenk(i: number): string {
  return PALET[i % PALET.length];
}
