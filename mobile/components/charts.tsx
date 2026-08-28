import { BarChart, PieChart } from "react-native-gifted-charts";
import { StyleSheet, Text, View } from "react-native";
import { tutarKisa, turkceTutar, yuzde } from "@/lib/format";
import { paletRenk, useRenkler } from "@/lib/theme";

export interface Dilim {
  ad: string;
  tutar: number;
  oran: number;
  renk?: string | null;
}

export function PastaGrafik({ dilimler }: { dilimler: Dilim[] }) {
  const renk = useRenkler();
  const veri = dilimler
    .filter((d) => d.tutar > 0)
    .map((d, i) => ({ value: d.tutar, color: d.renk || paletRenk(i) }));

  if (veri.length === 0) {
    return <Text style={{ color: renk.textMuted, textAlign: "center" }}>Bu dönemde gider yok.</Text>;
  }

  return (
    <View style={s.pastaSatir}>
      <PieChart
        data={veri}
        donut
        radius={78}
        innerRadius={48}
        innerCircleColor={renk.card}
        centerLabelComponent={() => (
          <Text style={{ color: renk.textMuted, fontSize: 11 }}>{veri.length} kategori</Text>
        )}
      />
      <View style={s.lejant}>
        {dilimler
          .filter((d) => d.tutar > 0)
          .slice(0, 6)
          .map((d, i) => (
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
  if (degerler.every((v) => v === 0)) {
    return <Text style={{ color: renk.textMuted, textAlign: "center" }}>Veri yok.</Text>;
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
      barWidth={Math.max(6, Math.min(22, 260 / data.length))}
      spacing={Math.max(4, Math.min(14, 120 / data.length))}
      initialSpacing={8}
      noOfSections={3}
      maxValue={enBuyuk * 1.15}
      yAxisThickness={0}
      xAxisThickness={0}
      xAxisLabelTextStyle={{ color: renk.textMuted, fontSize: 9 }}
      yAxisTextStyle={{ color: renk.textMuted, fontSize: 9 }}
      formatYLabel={(l: string) => tutarKisa(Number(l))}
      hideRules={false}
      rulesColor={renk.border}
      isAnimated
    />
  );
}

export function KategoriListesi({ dilimler }: { dilimler: Dilim[] }) {
  const renk = useRenkler();
  const enBuyuk = Math.max(...dilimler.map((d) => d.tutar), 1);
  return (
    <View style={{ gap: 10 }}>
      {dilimler.map((d, i) => (
        <View key={d.ad} style={s.katSatir}>
          <View style={s.katUst}>
            <Text style={[s.katAd, { color: renk.text }]} numberOfLines={1}>
              {d.ad}
            </Text>
            <Text style={[s.katTutar, { color: renk.text }]}>{turkceTutar(d.tutar)} ₺</Text>
          </View>
          <View style={[s.katBarZemin, { backgroundColor: renk.border }]}>
            <View
              style={[
                s.katBar,
                { width: `${(d.tutar / enBuyuk) * 100}%`, backgroundColor: d.renk || paletRenk(i) },
              ]}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  pastaSatir: { flexDirection: "row", alignItems: "center", gap: 16 },
  lejant: { flex: 1, gap: 7 },
  lejantSatir: { flexDirection: "row", alignItems: "center", gap: 7 },
  nokta: { width: 10, height: 10, borderRadius: 5 },
  lejantAd: { flex: 1, fontSize: 13 },
  lejantOran: { fontSize: 12, fontWeight: "600" },
  katSatir: { gap: 5 },
  katUst: { flexDirection: "row", justifyContent: "space-between" },
  katAd: { fontSize: 14, flex: 1 },
  katTutar: { fontSize: 14, fontWeight: "600" },
  katBarZemin: { height: 6, borderRadius: 3, overflow: "hidden" },
  katBar: { height: 6, borderRadius: 3 },
});
