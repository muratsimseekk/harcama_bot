import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { BarChart, PieChart } from "react-native-gifted-charts";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { Metin as Text } from "@/components/Metin";
import { tutarKisa, yuzde } from "@/lib/format";
import { kategoriIkon } from "@/lib/kategoriIkon";
import { DIGER_ADI, useDagilimRenkleri, useDigerRenk } from "@/lib/kategoriRenk";
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
  const digerRenk = useDigerRenk();
  const dolu = dilimler.filter((d) => d.tutar > 0);
  const paleti = renkDizi(dolu.length);
  let hueIdx = 0;
  const parcalar = dolu.map((d) => ({
    ...d,
    c: d.renk || (d.ad === DIGER_ADI ? digerRenk : paleti[hueIdx++]),
  }));
  const toplam = parcalar.reduce((s, d) => s + d.tutar, 0);
  const veri = parcalar.map((d) => ({ value: d.tutar, color: d.c }));

  // Giriş animasyonu: veri gelince halka büyüyerek belirir, lejant satırları
  // sırayla aşağıdan kayarak oturur. Tek sürücü, satır başına gecikme aralıkla.
  const giris = useRef(new Animated.Value(0)).current;
  const imza = `${parcalar.length}:${toplam}`;
  useEffect(() => {
    giris.setValue(0);
    const a = Animated.timing(giris, {
      toValue: 1,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    a.start();
    return () => a.stop();
  }, [giris, imza]);

  if (veri.length === 0) {
    return (
      <Text style={[T.body, { color: renk.textMuted, textAlign: "center", paddingVertical: SP.lg }]}>
        Bu dönemde gider yok.
      </Text>
    );
  }

  return (
    <View style={{ gap: SP.lg }}>
      <Animated.View
        style={{
          alignItems: "center",
          opacity: giris.interpolate({ inputRange: [0, 0.45], outputRange: [0, 1], extrapolate: "clamp" }),
          transform: [
            {
              scale: giris.interpolate({
                inputRange: [0, 1],
                outputRange: [0.82, 1],
                extrapolate: "clamp",
              }),
            },
          ],
        }}
      >
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
      </Animated.View>

      <View style={{ gap: 2 }}>
        {parcalar.map((d, i) => {
          const bas = Math.min(0.35 + i * 0.07, 0.85);
          const son = Math.min(bas + 0.3, 1);
          return (
            <Animated.View
              key={`${d.ad}-${i}`}
              style={[
                s.satir,
                {
                  opacity: giris.interpolate({ inputRange: [bas, son], outputRange: [0, 1], extrapolate: "clamp" }),
                  transform: [
                    {
                      translateY: giris.interpolate({
                        inputRange: [bas, son],
                        outputRange: [10, 0],
                        extrapolate: "clamp",
                      }),
                    },
                  ],
                },
              ]}
            >
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
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

export interface Donem {
  etiket: string;
  gelir: number;
  gider: number;
}

/** Y ekseninin bölüm başına "yuvarlak" adımı — 15.638 yerine 4.000/8.000/12.000/16.000. */
function guzelAdim(enBuyuk: number, bolum: number): number {
  const ham = enBuyuk / bolum;
  if (ham <= 0) return 1;
  const us = 10 ** Math.floor(Math.log10(ham));
  const n = ham / us;
  const kat = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 4 ? 4 : n <= 5 ? 5 : 10;
  return kat * us;
}

/**
 * İkili çubuk: her dönem için gelir + gider yan yana.
 * Çubuğa dokununca `onSec(index)` çağrılır; seçili değilse diğerleri soluklaşır.
 */
export function IkiliCubukGrafik({
  donemler,
  secili,
  onSec,
}: {
  donemler: Donem[];
  secili: number | null;
  onSec: (i: number | null) => void;
}) {
  const renk = useRenkler();
  const hepsi = donemler.flatMap((d) => [d.gelir, d.gider]);
  if (hepsi.length === 0 || hepsi.every((v) => v === 0)) {
    return (
      <Text style={[T.body, { color: renk.textMuted, textAlign: "center", paddingVertical: SP.lg }]}>
        Bu dönemde veri yok.
      </Text>
    );
  }

  const BOLUM = 4;
  const adim = guzelAdim(Math.max(...hepsi, 1), BOLUM);
  const n = donemler.length;

  const data = donemler.flatMap((d, i) => {
    const sonuk = secili !== null && secili !== i;
    const bas = (c: string) => (sonuk ? c + "44" : c);
    const dokun = () => onSec(secili === i ? null : i);
    return [
      { value: d.gelir, frontColor: bas(renk.success), spacing: 3, label: "", onPress: dokun },
      {
        value: d.gider,
        frontColor: bas(renk.blue),
        spacing: n > 8 ? 8 : 18,
        label: d.etiket,
        onPress: dokun,
      },
    ];
  });

  return (
    <BarChart
      data={data}
      barWidth={Math.max(6, Math.min(18, 220 / n))}
      initialSpacing={12}
      barBorderTopLeftRadius={4}
      barBorderTopRightRadius={4}
      noOfSections={BOLUM}
      maxValue={adim * BOLUM}
      stepValue={adim}
      yAxisThickness={0}
      xAxisThickness={1}
      xAxisColor={renk.border}
      xAxisLabelTextStyle={{ color: renk.textMuted, fontSize: 11 }}
      yAxisTextStyle={{ color: renk.textFaint, fontSize: 10 }}
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
