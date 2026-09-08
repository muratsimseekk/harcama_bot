import { Ionicons } from "@expo/vector-icons";
import { BarChart, PieChart } from "react-native-gifted-charts";
import { StyleSheet, View } from "react-native";
import { Metin as Text } from "@/components/Metin";
import { tutarKisa, yuzde } from "@/lib/format";
import { kategoriIkon } from "@/lib/kategoriIkon";
import { useDagilimRenkleri } from "@/lib/kategoriRenk";
import { R, SP, T, useRenkler } from "@/lib/theme";

export interface Dilim {
  ad: string;
  tutar: number;
  oran: number;
  renk?: string | null;
}

export function PastaGrafik({ dilimler }: { dilimler: Dilim[] }) {
  const renk = useRenkler();
  const renkDizi = useDagilimRenkleri();
  const dolu = dilimler.filter((d) => d.tutar > 0);
  const paleti = renkDizi(dolu.length);
  const parcalar = dolu.map((d, i) => ({ ...d, c: d.renk || paleti[i] }));
  const toplam = parcalar.reduce((s, d) => s + d.tutar, 0);
  const veri = parcalar.map((d) => ({ value: d.tutar, color: d.c }));

  if (veri.length === 0) {
    return (
      <Text style={[T.body, { color: renk.textMuted, textAlign: "center", paddingVertical: SP.lg }]}>
        Bu dönemde gider yok.
      </Text>
    );
  }

  return (
    <View style={{ gap: SP.lg }}>
      <View style={{ alignItems: "center" }}>
        <PieChart
          data={veri}
          donut
          radius={82}
          innerRadius={56}
          innerCircleColor={renk.card}
          strokeWidth={3}
          strokeColor={renk.card}
          centerLabelComponent={() => (
            <View style={{ alignItems: "center" }}>
              <Text style={{ color: renk.textFaint, fontSize: 10, fontWeight: "700", letterSpacing: 0.3 }}>
                TOPLAM
              </Text>
              <Text style={{ color: renk.text, fontSize: 17, fontWeight: "800", letterSpacing: -0.3 }}>
                {tutarKisa(toplam)} ₺
              </Text>
            </View>
          )}
        />
      </View>

      <View style={{ gap: 2 }}>
        {parcalar.map((d, i) => (
          <View key={`${d.ad}-${i}`} style={s.satir}>
            <View style={[s.ikonKutu, { backgroundColor: d.c + "22" }]}>
              <Ionicons name={kategoriIkon(d.ad)} size={15} color={d.c} />
            </View>
            <Text style={[s.ad, { color: renk.text }]} numberOfLines={1}>
              {d.ad}
            </Text>
            <Text style={[s.oran, { color: renk.textFaint }]}>{yuzde(d.oran)}</Text>
            <Text style={[s.tutar, { color: renk.text }]} numberOfLines={1}>
              {tutarKisa(d.tutar)} ₺
            </Text>
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
  satir: { flexDirection: "row", alignItems: "center", gap: SP.sm, paddingVertical: 7 },
  ikonKutu: { width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  ad: { flex: 1, fontSize: 14, fontWeight: "600" },
  oran: { fontSize: 12.5, fontWeight: "600", width: 40, textAlign: "right" },
  tutar: { fontSize: 13.5, fontWeight: "700", width: 92, textAlign: "right", fontVariant: ["tabular-nums"] },
  _r: { borderRadius: R.sm },
});
