import { StyleSheet, View } from "react-native";
import { Metin as Text } from "@/components/Metin";
import { turkceTutar } from "@/lib/format";
import { R, SP, useRenkler } from "@/lib/theme";

/** FinWise ilerleme çubuğu: solda koyu hap (%), beyaz ray, sağda hedef tutar */
export function IlerlemeCubugu({
  oran,
  hedef,
}: {
  oran: number; // 0–100
  hedef?: number;
}) {
  const renk = useRenkler();
  const p = Math.max(0, Math.min(100, oran));
  const asti = p >= 100;

  return (
    <View style={[s.ray, { backgroundColor: renk.cardAlt }]}>
      <View
        style={[
          s.dolu,
          {
            width: `${Math.max(14, p)}%`,
            backgroundColor: asti ? renk.danger : renk.text,
          },
        ]}
      >
        <Text style={[s.yuzde, { color: renk.card }]}>%{Math.round(p)}</Text>
      </View>
      {hedef != null && (
        <Text style={[s.hedef, { color: renk.text }]} numberOfLines={1}>
          {turkceTutar(hedef)} ₺
        </Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  ray: {
    height: 32,
    borderRadius: R.pill,
    flexDirection: "row",
    alignItems: "center",
    paddingRight: SP.md,
    overflow: "hidden",
  },
  dolu: {
    height: "100%",
    borderRadius: R.pill,
    justifyContent: "center",
    paddingHorizontal: SP.md,
    minWidth: 56,
  },
  yuzde: { fontSize: 13, fontWeight: "700" },
  hedef: { flex: 1, textAlign: "right", fontSize: 13.5, fontWeight: "700", fontStyle: "italic" },
});
