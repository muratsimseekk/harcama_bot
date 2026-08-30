import { Platform, type TextStyle, type ViewStyle } from "react-native";
import { useEtkinSema } from "./tema";

// Sıcak "krem zemin + mercan aksan + sade yüzey" paleti.
// aksan = marka aksanı (mercan/coral). Fontlar: Inter (gövde) + Newsreader (serif başlık).
const light = {
  bg: "#FAF9F5", // sıcak kırık beyaz zemin
  bgAlt: "#F0EEE6",
  aksan: "#D97757", // mercan — birincil aksan
  aksanSoft: "#F3E4DB", // soluk mercan yıkama
  aksanUstu: "#FFFFFF", // mercan zemin üstündeki metin
  card: "#FFFFFF",
  cardAlt: "#F0EEE6",
  border: "#E5E2D9",
  hairline: "#EBE8DF",
  text: "#141413", // sıcak neredeyse-siyah
  textMuted: "#5C5A54",
  textFaint: "#8F8B80",
  blue: "#61758A", // tutar/tarih — sakin arduvaz
  blueSoft: "#E3E5E4",
  danger: "#BF4D43",
  dangerSoft: "#F5E4E1",
  warn: "#B4843C",
  warnSoft: "#F3E7D3",
  success: "#5F8A6B",
  successSoft: "#E4EEE5",
  gelir: "#5F8A6B",
  kisisel: "#61758A",
  isletme: "#A56E5A",
  yatirim: "#7A9E7E",
  golgeRenk: "#3A2A20",
  // uyumluluk (eski adlar → aksan)
  primary: "#D97757",
  accent: "#61758A",
};

const dark: typeof light = {
  bg: "#1F1E1D",
  bgAlt: "#262624",
  aksan: "#E0866A",
  aksanSoft: "#3A2E28",
  aksanUstu: "#241A15",
  card: "#262624",
  cardAlt: "#302F2C",
  border: "#3A3934",
  hairline: "#34332F",
  text: "#F5F4EF",
  textMuted: "#B8B5AC",
  textFaint: "#807C72",
  blue: "#8AA0B4",
  blueSoft: "#313A38",
  danger: "#E0796C",
  dangerSoft: "#2E1A17",
  warn: "#D0A15E",
  warnSoft: "#2E2617",
  success: "#7FA98A",
  successSoft: "#1E2A20",
  gelir: "#7FA98A",
  kisisel: "#8AA0B4",
  isletme: "#C08E76",
  yatirim: "#93B79A",
  golgeRenk: "#000000",
  primary: "#E0866A",
  accent: "#8AA0B4",
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

/** fontWeight → Inter dosyası (gövde/UI) */
export const FONT: Record<string, string> = {
  "400": "Inter_400Regular",
  "500": "Inter_500Medium",
  "600": "Inter_600SemiBold",
  "700": "Inter_700Bold",
  "800": "Inter_800ExtraBold",
};

/** Newsreader (serif başlık) */
export const SERIF: Record<string, string> = {
  "500": "Newsreader_500Medium",
  "600": "Newsreader_600SemiBold",
  "700": "Newsreader_700Bold",
};

export const T: Record<string, TextStyle> = {
  display: { fontFamily: SERIF["700"], fontSize: 32, letterSpacing: -0.4 },
  title: { fontFamily: SERIF["700"], fontSize: 23, letterSpacing: -0.3 },
  heading: { fontFamily: SERIF["600"], fontSize: 18 },
  body: { fontFamily: FONT["500"], fontSize: 15 },
  bodyBold: { fontFamily: FONT["600"], fontSize: 15 },
  label: { fontFamily: FONT["600"], fontSize: 14 },
  caption: { fontFamily: FONT["400"], fontSize: 12.5 },
  overline: { fontFamily: FONT["600"], fontSize: 12.5, letterSpacing: 0.4 },
  para: { fontFamily: FONT["500"], letterSpacing: -0.1 },
};

export function golge(seviye: 1 | 2 | 3 = 1): ViewStyle {
  if (Platform.OS === "android") return { elevation: seviye === 1 ? 1 : seviye === 2 ? 3 : 7 };
  const cfg = { 1: { o: 0.05, r: 12, y: 4 }, 2: { o: 0.08, r: 20, y: 8 }, 3: { o: 0.13, r: 32, y: 15 } }[seviye];
  return {
    shadowColor: light.golgeRenk,
    shadowOpacity: cfg.o,
    shadowRadius: cfg.r,
    shadowOffset: { width: 0, height: cfg.y },
  };
}

export const PALET = [
  "#D97757", "#C15F3C", "#7A9E7E", "#61758A", "#C99A4E", "#9B8FB0",
  "#A56E5A", "#6E8B8A", "#B0894B", "#5F8A6B", "#8C6D9C", "#7C8B3E",
];

export function paletRenk(i: number): string {
  return PALET[i % PALET.length];
}
