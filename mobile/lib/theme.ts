import { Platform, type TextStyle, type ViewStyle } from "react-native";
import { useEtkinSema } from "./tema";

// FinWise — yeşil finans paleti (Figma UI kit)
const light = {
  bg: "#F1FFF3", // mint içerik zemini
  bgAlt: "#F8FFF9",
  green: "#00D09E", // ana yeşil
  greenSoft: "#DFF7E2", // açık yeşil
  greenDeep: "#0E3E3E",
  card: "#FFFFFF",
  cardAlt: "#F1FFF3",
  border: "#D6EFDC",
  hairline: "#E4F3E7",
  text: "#093030", // koyu metin/ikon
  textMuted: "#4A6B63",
  textFaint: "#8AA79E",
  onGreen: "#093030", // yeşil zemin üstündeki metin (koyu)
  blue: "#0068FF", // tutar/tarih mavisi
  blueSoft: "#6DB6FE",
  blueDeep: "#3299FF",
  danger: "#E2493B",
  dangerSoft: "#FBE7E4",
  gider: "#0068FF", // FinWise'da gider tutarı mavi
  gelir: "#093030",
  kisisel: "#3299FF",
  isletme: "#0068FF",
  yatirim: "#6DB6FE",
  golgeRenk: "#0B3B2E",
  // uyumluluk (eski adlar)
  primary: "#00D09E",
  primarySoft: "#DFF7E2",
  primaryText: "#093030",
  accent: "#0068FF",
  accentSoft: "#E4F0FF",
  success: "#00D09E",
  successSoft: "#DFF7E2",
  warn: "#B67514",
  warnSoft: "#FBEEDA",
};

const dark: typeof light = {
  bg: "#031314",
  bgAlt: "#052120",
  green: "#00D09E",
  greenSoft: "#0E3E3E",
  greenDeep: "#0E3E3E",
  card: "#052926",
  cardAlt: "#0A302C",
  border: "#124039",
  hairline: "#0E332F",
  text: "#EAFBF3",
  textMuted: "#8FB3AB",
  textFaint: "#5E7E77",
  onGreen: "#052926",
  blue: "#4D93FF",
  blueSoft: "#3B6FB8",
  blueDeep: "#4D93FF",
  danger: "#F0705F",
  dangerSoft: "#2C1512",
  gider: "#4D93FF",
  gelir: "#EAFBF3",
  kisisel: "#4D93FF",
  isletme: "#6DB6FE",
  yatirim: "#8FC7FF",
  golgeRenk: "#000000",
  primary: "#00D09E",
  primarySoft: "#0E3E3E",
  primaryText: "#052926",
  accent: "#4D93FF",
  accentSoft: "#12283F",
  success: "#00D09E",
  successSoft: "#0E3E3E",
  warn: "#E8A44C",
  warnSoft: "#2C2313",
};

export type Renkler = typeof light;

export function useRenkler(): Renkler {
  return useEtkinSema() === "dark" ? dark : light;
}

export function useKaranlik(): boolean {
  return useEtkinSema() === "dark";
}

export const SP = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 36 } as const;
export const R = { sm: 10, md: 16, lg: 22, xl: 30, pill: 999 } as const;

/** fontWeight → Poppins dosyası */
export const FONT: Record<string, string> = {
  "400": "Poppins_400Regular",
  "500": "Poppins_500Medium",
  "600": "Poppins_600SemiBold",
  "700": "Poppins_700Bold",
  "800": "Poppins_700Bold",
};

export const T: Record<string, TextStyle> = {
  display: { fontFamily: FONT["700"], fontSize: 32, letterSpacing: -0.5 },
  title: { fontFamily: FONT["700"], fontSize: 22, letterSpacing: -0.3 },
  heading: { fontFamily: FONT["600"], fontSize: 17 },
  body: { fontFamily: FONT["500"], fontSize: 15 },
  bodyBold: { fontFamily: FONT["600"], fontSize: 15 },
  label: { fontFamily: FONT["600"], fontSize: 14 },
  caption: { fontFamily: FONT["400"], fontSize: 12.5 },
  overline: { fontFamily: FONT["600"], fontSize: 13 },
  para: { fontFamily: FONT["700"], letterSpacing: -0.3 },
};

export function golge(seviye: 1 | 2 | 3 = 1): ViewStyle {
  if (Platform.OS === "android") return { elevation: seviye === 1 ? 1 : seviye === 2 ? 4 : 9 };
  const cfg = { 1: { o: 0.06, r: 12, y: 4 }, 2: { o: 0.1, r: 22, y: 9 }, 3: { o: 0.16, r: 34, y: 17 } }[seviye];
  return {
    shadowColor: light.golgeRenk,
    shadowOpacity: cfg.o,
    shadowRadius: cfg.r,
    shadowOffset: { width: 0, height: cfg.y },
  };
}

export const PALET = [
  "#0068FF", "#3299FF", "#6DB6FE", "#00D09E", "#2EC4B6", "#4A6FA5",
  "#8A6BB0", "#E8A44C", "#E2493B", "#3E8E7E", "#5B7B9A", "#7C8B3E",
];

export function paletRenk(i: number): string {
  return PALET[i % PALET.length];
}
