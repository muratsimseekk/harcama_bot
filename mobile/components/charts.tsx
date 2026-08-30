import { BarChart, PieChart } from "react-native-gifted-charts";
import { StyleSheet, View } from "react-native";
import { Metin as Text } from "@/components/Metin";
import { tutarKisa, yuzde } from "@/lib/format";
import { paletRenk, SP, T, useRenkler } from "@/lib/theme";

export interface Dilim {
  ad: string;
  tutar: number;
  oran: number;
  renk?: string | null;
}

export function PastaGrafik({ dilimler }: { dilimler: Dilim[] }) {
  const renk = useRenkler();
  const dolu = dilimler.filter((d) => d.tutar > 0);
  const veri = dolu.map((d, i) => ({ value: d.tutar, color: d.renk || paletRenk(i) }));
  const toplam = dolu.reduce((s, d) => s + d.tutar, 0);

  if (veri.length === 0) {
    return (
      <Text style={[T.body, { color: renk.textMuted, textAlign: "center", paddingVertical: SP.lg }]}>
        Bu dönemde gider yok.
      </Text>
    );
  }

  return (
    <View style={s.pastaSatir}>
      <PieChart
        data={veri}
        donut
        radius={74}
        innerRadius={52}
        innerCircleColor={renk.card}
        strokeWidth={2}
        strokeColor={renk.card}
        centerLabelComponent={() => (
          <View style={{ alignItems: "center" }}>
            <Text style={{ color: renk.text, fontSize: 15, fontWeight: "800" }}>{tutarKisa(toplam)}</Text>
            <Text style={{ color: renk.textFaint, fontSize: 10, fontWeight: "600" }}>₺ toplam</Text>
          </View>
        )}
      />
      <View style={s.lejant}>
        {dolu.slice(0, 6).map((d, i) => (
          <View key={`${d.ad}-${i}`} style={s.lejantSatir}>
            <View style={[s.nokta, { backgroundColor: d.renk || paletRenk(i) }]} />
            <Text style={[s.lejantAd, { color: renk.text }]} numberOfLines={1}>
              {d.ad}
            </Text>
            <Text style={[s.lejantOran, { color: renk.textMuted }]}>{yuzde(d.oran)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** İkili çubuk: her birim için gelir + gider yan yana */
export function IkiliCubukGrafik({
  etiketler,
  gelir,
  gider,
}: {
  etiketler: string[];
  gelir: number[];
  gider: number[];
}) {
  const renk = useRenkler();
  const hepsi = [...gelir, ...gider];
  if (hepsi.length === 0 || hepsi.every((v) => v === 0)) {
    return (
      <Text style={[T.body, { color: renk.textMuted, textAlign: "center", paddingVertical: SP.lg }]}>
        Bu dönemde veri yok.
      </Text>
    );
  }
  const enBuyuk = Math.max(...hepsi, 1);
  const n = etiketler.length;
  const data = etiketler.flatMap((et, i) => [
    { value: gelir[i] ?? 0, frontColor: renk.success, spacing: 3, label: "" },
    { value: gider[i] ?? 0, frontColor: renk.blue, spacing: n > 8 ? 8 : 16, label: et },
  ]);

  return (
    <BarChart
      data={data}
      barWidth={Math.max(5, Math.min(12, 150 / n))}
      initialSpacing={10}
      barBorderTopLeftRadius={3}
      barBorderTopRightRadius={3}
      noOfSections={3}
      maxValue={enBuyuk * 1.15}
      yAxisThickness={0}
      xAxisThickness={1}
      xAxisColor={renk.border}
      xAxisLabelTextStyle={{ color: renk.textMuted, fontSize: 9 }}
      yAxisTextStyle={{ color: renk.textFaint, fontSize: 9 }}
      formatYLabel={(l: string) => tutarKisa(Number(l))}
      rulesType="dashed"
      rulesColor={renk.hairline}
      dashWidth={3}
      dashGap={6}
      isAnimated
      animationDuration={500}
    />
  );
}

const s = StyleSheet.create({
  pastaSatir: { flexDirection: "row", alignItems: "center", gap: SP.lg },
  lejant: { flex: 1, gap: SP.sm },
  lejantSatir: { flexDirection: "row", alignItems: "center", gap: SP.sm },
  nokta: { width: 9, height: 9, borderRadius: 3 },
  lejantAd: { flex: 1, fontSize: 13, fontWeight: "500" },
  lejantOran: { fontSize: 12.5, fontWeight: "700" },
});
