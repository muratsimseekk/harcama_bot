import { useColorScheme } from "react-native";

const light = {
  bg: "#F8FAFC",
  card: "#FFFFFF",
  border: "#E2E8F0",
  text: "#0F172A",
  textMuted: "#64748B",
  primary: "#2563EB",
  primaryText: "#FFFFFF",
  danger: "#DC2626",
  success: "#16A34A",
  warnBg: "#FEF3C7",
  warnText: "#92400E",
};

const dark: typeof light = {
  bg: "#0B1120",
  card: "#111827",
  border: "#1F2937",
  text: "#F1F5F9",
  textMuted: "#94A3B8",
  primary: "#3B82F6",
  primaryText: "#FFFFFF",
  danger: "#F87171",
  success: "#4ADE80",
  warnBg: "#3F2D0B",
  warnText: "#FCD34D",
};

export type Renkler = typeof light;

export function useRenkler(): Renkler {
  return useColorScheme() === "dark" ? dark : light;
}
