import { Children, forwardRef, isValidElement, type ReactNode } from "react";
import { StyleSheet, Text as RNText, type TextProps, type TextStyle } from "react-native";
import { FONT } from "@/lib/theme";
import { tutarMaskele, useGizli } from "@/lib/tutarGizle";

/** Gizleme açıkken metin çocuklarındaki tutarları maskeler (iç içe Metin kendi işini yapar). */
function maskele(c: ReactNode): ReactNode {
  if (typeof c === "string") return tutarMaskele(c);
  if (typeof c === "number") return tutarMaskele(String(c));
  if (Array.isArray(c)) {
    // "{tutar} {sembol}" gibi parçaları birleştir ki sembolün önündeki sayı da yakalansın
    if (c.every((x) => typeof x === "string" || typeof x === "number")) return tutarMaskele(c.join(""));
    return Children.map(c, (x) => (isValidElement(x) ? x : maskele(x)));
  }
  return c;
}

type MetinProps = TextProps & {
  /** true: gizleme modunda bile maskelenmez (döviz kuru gibi kişisel olmayan sayılar). */
  gizlenmez?: boolean;
};

/**
 * Text sarmalayıcı: style'da açık fontFamily yoksa fontWeight'e göre doğru Inter
 * ailesini enjekte eder. fontWeight verilmezse 500 (Medium) varsayılır.
 * Serif başlıklar T.display/title/heading içinde fontFamily'yi doğrudan verir.
 */
const ESLE: Record<string, string> = { normal: "400", bold: "700", "800": "700", "900": "700" };

export const Metin = forwardRef<RNText, MetinProps>(function Metin({ style, gizlenmez, children, ...rest }, ref) {
  const gizli = useGizli();
  const d = StyleSheet.flatten(style) as TextStyle | undefined;
  let w = d?.fontWeight ? String(d.fontWeight) : d?.fontFamily ? "" : "500";
  w = ESLE[w] ?? w;
  const aile = w && FONT[w] ? { fontFamily: FONT[w] } : null;
  return (
    <RNText ref={ref} style={[aile, style]} {...rest}>
      {gizli && !gizlenmez ? maskele(children) : children}
    </RNText>
  );
});

export default Metin;
