import { forwardRef } from "react";
import { StyleSheet, Text as RNText, type TextProps, type TextStyle } from "react-native";
import { FONT } from "@/lib/theme";

/**
 * Text sarmalayıcı: style'daki fontWeight'e göre doğru Plus Jakarta Sans ailesini enjekte eder.
 * fontWeight verilmezse 500 (Medium) varsayılır.
 */
const ESLE: Record<string, string> = { normal: "400", bold: "700" };

export const Metin = forwardRef<RNText, TextProps>(function Metin({ style, ...rest }, ref) {
  const d = StyleSheet.flatten(style) as TextStyle | undefined;
  let w = d?.fontWeight ? String(d.fontWeight) : d?.fontFamily ? "" : "500";
  w = ESLE[w] ?? w;
  const aile = w && FONT[w] ? { fontFamily: FONT[w] } : null;
  return <RNText ref={ref} style={[aile, style]} {...rest} />;
});

export default Metin;
