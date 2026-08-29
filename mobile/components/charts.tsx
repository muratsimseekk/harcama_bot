import { BarChart, LineChart, PieChart } from "react-native-gifted-charts";
import { StyleSheet, View } from "react-native";
import { Metin as Text } from "@/components/Metin";
import { tutarKisa, turkceTutar, yuzde } from "@/lib/format";
import { paletRenk, R, SP, T, useRenkler } from "@/lib/theme";

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

export function CubukGrafik({ etiketler, degerler }: { etiketler: string[]; degerler: number[] }) {
  const renk = useRenkler();
  if (degerler.length === 0 || degerler.every((v) => v === 0)) {
    return (
      <Text style={[T.body, { color: renk.textMuted, textAlign: "center", paddingVertical: SP.lg }]}>
        Bu dönemde veri yok.
      </Text>
    );
  }
  const enBuyuk = Math.max(...degerler, 1);
  const data = degerler.map((v, i) => ({
    value: v,
    label: etiketler[i],
    frontColor: v === enBuyuk ? renk.primary : `${renk.primary}8A`,
  }));
  return (
    <BarChart
      data={data}
      barWidth={Math.max(6, Math.min(18, 230 / data.length))}
      spacing={Math.max(3, Math.min(12, 110 / data.length))}
      initialSpacing={8}
      barBorderTopLeftRadius={4}
      barBorderTopRightRadius={4}
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
      dashGap={5}
      isAnimated
      animationDuration={500}
    />
  );
}

/** FinWise ikili çubuk: her birim için gelir (yeşil) + gider (mavi) yan yana */
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
    { value: gelir[i] ?? 0, frontColor: renk.green, spacing: 3, label: "" },
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
      xAxisColor={renk.text}
      xAxisLabelTextStyle={{ color: renk.textMuted, fontSize: 9 }}
      yAxisTextStyle={{ color: renk.blueSoft, fontSize: 9 }}
      formatYLabel={(l: string) => tutarKisa(Number(l))}
      rulesType="dashed"
      rulesColor={renk.blueSoft}
      dashWidth={3}
      dashGap={6}
      isAnimated
      animationDuration={500}
    />
  );
}

/** İnce trend çizgisi (hero altı) */
export function Sparkline({
  degerler,
  renk: c,
  yukseklik = 40,
}: {
  degerler: number[];
  renk: string;
  yukseklik?: number;
}) {
  if (degerler.length < 2) return null;
  return (
    <LineChart
      data={degerler.map((v) => ({ value: v }))}
      height={yukseklik}
      width={230}
      hideDataPoints
      hideAxesAndRules
      hideYAxisText
      curved
      thickness={2}
      color={c}
      areaChart
      startFillColor={c}
      endFillColor={c}
      startOpacity={0.28}
      endOpacity={0.02}
      initialSpacing={0}
      endSpacing={0}
      adjustToWidth
      disableScroll
      isAnimated
      animationDuration={600}
    />
  );
}

/** Tek yatay yığın bar — tür oranları */
export function YiginBar({ dilimler }: { dilimler: Dilim[] }) {
  const renk = useRenkler();
  const toplam = dilimler.reduce((s, d) => s + d.tutar, 0) || 1;
  return (
    <View style={{ gap: SP.md }}>
      <View style={[s.yiginZemin, { backgroundColor: renk.hairline }]}>
        {dilimler
          .filter((d) => d.tutar > 0)
          .map((d, i) => (
            <View
              key={`${d.ad}-${i}`}
              style={{ width: `${(d.tutar / toplam) * 100}%`, backgroundColor: d.renk || paletRenk(i) }}
            />
          ))}
      </View>
      <View style={{ gap: SP.sm }}>
        {dilimler.map((d, i) => (
          <View key={`${d.ad}-${i}`} style={s.yiginSatir}>
            <View style={[s.nokta, { backgroundColor: d.renk || paletRenk(i) }]} />
            <Text style={{ color: renk.text, flex: 1, fontSize: 14, fontWeight: "500" }}>{d.ad}</Text>
            <Text style={{ color: renk.textFaint, fontSize: 12.5, width: 42 }}>{yuzde(d.oran)}</Text>
            <Text style={{ color: renk.text, fontSize: 13.5, fontWeight: "700" }}>
              {turkceTutar(d.tutar)} ₺
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function KategoriBar({ dilimler }: { dilimler: Dilim[] }) {
  const renk = useRenkler();
  const enBuyuk = Math.max(...dilimler.map((d) => d.tutar), 1);
  return (
    <View style={{ gap: SP.md }}>
      {dilimler.map((d, i) => (
        <View key={`${d.ad}-${i}`} style={{ gap: 6 }}>
          <View style={s.katUst}>
            <Text style={[s.katAd, { color: renk.text }]} numberOfLines={1}>
              {d.ad}
            </Text>
            <Text style={[s.katTutar, { color: renk.textMuted }]}>{turkceTutar(d.tutar)} ₺</Text>
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
  lejantAd: { flex: 1, fontSize: 13, fontWeight: "500" },
  lejantOran: { fontSize: 12.5, fontWeight: "700" },
  katUst: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  katAd: { fontSize: 14, flex: 1, fontWeight: "500" },
  katTutar: { fontSize: 13, fontWeight: "600" },
  katBarZemin: { height: 8, borderRadius: R.pill, overflow: "hidden" },
  katBar: { height: 8, borderRadius: R.pill },
  yiginZemin: { height: 12, borderRadius: R.pill, overflow: "hidden", flexDirection: "row" },
  yiginSatir: { flexDirection: "row", alignItems: "center", gap: SP.sm },
});
