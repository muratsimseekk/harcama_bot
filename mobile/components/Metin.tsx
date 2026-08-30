import { forwardRef } from "react";
import { StyleSheet, Text as RNText, type TextProps, type TextStyle } from "react-native";
import { FONT } from "@/lib/theme";

/**
 * Text sarmalayıcı: style'da açık fontFamily yoksa fontWeight'e göre doğru Inter
 * ailesini enjekte eder. fontWeight verilmezse 500 (Medium) varsayılır.
 * Serif başlıklar T.display/title/heading içinde fontFamily'yi doğrudan verir.
 */
const ESLE: Record<string, string> = { normal: "400", bold: "700", "800": "700", "900": "700" };

export const Metin = forwardRef<RNText, TextProps>(function Metin({ style, ...rest }, ref) {
  const d = StyleSheet.flatten(style) as TextStyle | undefined;
  let w = d?.fontWeight ? String(d.fontWeight) : d?.fontFamily ? "" : "500";
  w = ESLE[w] ?? w;
  const aile = w && FONT[w] ? { fontFamily: FONT[w] } : null;
  return <RNText ref={ref} style={[aile, style]} {...rest} />;
});

export default Metin;
