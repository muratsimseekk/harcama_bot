import { BarChart, PieChart } from "react-native-gifted-charts";
import { StyleSheet, Text, View } from "react-native";
import { tutarKisa, turkceTutar, yuzde } from "@/lib/format";
import { paletRenk, R, SP, useRenkler } from "@/lib/theme";

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
    return <Text style={{ color: renk.textMuted, textAlign: "center", paddingVertical: SP.lg }}>Bu dönemde gider yok.</Text>;
  }

  return (
    <View style={s.pastaSatir}>
      <PieChart
        data={veri}
        donut
        radius={76}
        innerRadius={50}
        innerCircleColor={renk.card}
        centerLabelComponent={() => (
          <View style={{ alignItems: "center" }}>
            <Text style={{ color: renk.text, fontSize: 15, fontWeight: "800" }}>
              {tutarKisa(toplam)}
            </Text>
            <Text style={{ color: renk.textFaint, fontSize: 10 }}>₺ toplam</Text>
          </View>
        )}
      />
      <View style={s.lejant}>
        {dolu.slice(0, 6).map((d, i) => (
          <View key={d.ad} style={s.lejantSatir}>
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

export function CubukGrafik({
  etiketler,
  degerler,
}: {
  etiketler: string[];
  degerler: number[];
}) {
  const renk = useRenkler();
  if (degerler.length === 0 || degerler.every((v) => v === 0)) {
    return <Text style={{ color: renk.textMuted, textAlign: "center", paddingVertical: SP.lg }}>Bu dönemde veri yok.</Text>;
  }
  const data = degerler.map((v, i) => ({
    value: v,
    label: etiketler[i],
    frontColor: renk.primary,
  }));
  const enBuyuk = Math.max(...degerler, 1);
  return (
    <BarChart
      data={data}
      barWidth={Math.max(6, Math.min(20, 240 / data.length))}
      spacing={Math.max(3, Math.min(12, 110 / data.length))}
      initialSpacing={10}
      barBorderRadius={3}
      noOfSections={3}
      maxValue={enBuyuk * 1.15}
      yAxisThickness={0}
      xAxisThickness={0}
      xAxisLabelTextStyle={{ color: renk.textFaint, fontSize: 8.5 }}
      yAxisTextStyle={{ color: renk.textFaint, fontSize: 9 }}
      formatYLabel={(l: string) => tutarKisa(Number(l))}
      rulesType="dashed"
      rulesColor={renk.hairline}
      dashWidth={3}
      dashGap={4}
      isAnimated
      animationDuration={450}
    />
  );
}

export function KategoriBar({ dilimler }: { dilimler: Dilim[] }) {
  const renk = useRenkler();
  const enBuyuk = Math.max(...dilimler.map((d) => d.tutar), 1);
  return (
    <View style={{ gap: SP.md }}>
      {dilimler.map((d, i) => (
        <View key={d.ad} style={{ gap: 6 }}>
          <View style={s.katUst}>
            <Text style={[s.katAd, { color: renk.text }]} numberOfLines={1}>
              {d.ad}
            </Text>
            <Text style={[s.katTutar, { color: renk.textMuted }]}>
              {turkceTutar(d.tutar)} ₺
            </Text>
          </View>
          <View style={[s.katBarZemin, { backgroundColor: renk.hairline }]}>
            <View
              style={[
                s.katBar,
                {
                  width: `${Math.max(3, (d.tutar / enBuyuk) * 100)}%`,
                  backgroundColor: d.renk || paletRenk(i),
                },
              ]}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  pastaSatir: { flexDirection: "row", alignItems: "center", gap: SP.lg },
  lejant: { flex: 1, gap: SP.sm },
  lejantSatir: { flexDirection: "row", alignItems: "center", gap: SP.sm },
  nokta: { width: 9, height: 9, borderRadius: 3 },
  lejantAd: { flex: 1, fontSize: 13 },
  lejantOran: { fontSize: 12.5, fontWeight: "700" },
  katUst: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  katAd: { fontSize: 14, flex: 1, fontWeight: "500" },
  katTutar: { fontSize: 13, fontWeight: "600" },
  katBarZemin: { height: 8, borderRadius: R.pill, overflow: "hidden" },
  katBar: { height: 8, borderRadius: R.pill },
});
