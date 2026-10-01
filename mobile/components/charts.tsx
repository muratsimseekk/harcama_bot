import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useRef, useState } from "react";
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

/** Ekseni yuvarlak değerlere oturtur: 3 bölme, adım 1/2/2,5/5 × 10^k (51.749 gibi değil). */
function yuvarlakAdim(enBuyuk: number, bolme: number): number {
  const ham = Math.max(enBuyuk, 1) / bolme;
  const us = 10 ** Math.floor(Math.log10(ham));
  const f = ham / us;
  const carpan = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return carpan * us;
}

/** Eksen etiketi: 20.000 → "20 B", 1.500.000 → "1,5 Mn" (dar eksene sığsın). */
function eksenEtiketi(x: number): string {
  if (x >= 1_000_000) return `${(x / 1_000_000).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} Mn`;
  if (x >= 1_000) return `${(x / 1_000).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} B`;
  return tutarKisa(x);
}

const BOLME = 3;
const Y_EKSEN = 40; // gifted-charts y ekseni etiket alanı
const BASLANGIC = 8;

/** İkili çubuk: her birim için gelir + gider yan yana. Tüm birimler kartın genişliğine
 * sığdırılır (yıllıkta 12 ay yana kaymasın, Ekim ekran dışında kalmasın). */
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
  const [genislik, setGenislik] = useState(0);
  const hepsi = [...gelir, ...gider];
  if (hepsi.length === 0 || hepsi.every((v) => v === 0)) {
    return (
      <Text style={[T.body, { color: renk.textMuted, textAlign: "center", paddingVertical: SP.lg }]}>
        Bu dönemde veri yok.
      </Text>
    );
  }
  const adim = yuvarlakAdim(Math.max(...hepsi) * 1.05, BOLME);
  const n = etiketler.length;
  // Birim başına: gelir + iç boşluk + gider + birim arası boşluk. Çok birimde (aylık ~31 gün)
  // boşluklar daralır ki hepsi tek ekrana sığsın.
  const icAra = n > 20 ? 0 : 2;
  const birimArasi = n > 20 ? 3 : n > 8 ? 6 : 14;
  const SON = 16; // son etiket ("Ara", "Paz") kenarda kesilmesin
  // `width` = y ekseni hariç çizim alanı; içine başlangıç + çubuklar + son boşluk sığmalı
  const cizimAlani = Math.max(0, genislik - Y_EKSEN);
  const cubukAlani = cizimAlani - BASLANGIC - SON - n * (icAra + birimArasi);
  const barWidth = genislik ? Math.max(2, Math.min(14, cubukAlani / (2 * n))) : 0;
  const data = etiketler.flatMap((et, i) => [
    { value: gelir[i] ?? 0, frontColor: renk.success, spacing: icAra, label: "" },
    {
      value: gider[i] ?? 0,
      frontColor: renk.blue,
      spacing: birimArasi,
      label: et,
      // Etiket iki çubuğun ortasına, birimin tamamı genişliğinde ("O…", "Ş…" diye kesilmesin)
      labelWidth: 2 * barWidth + icAra + birimArasi,
      labelTextStyle: {
        color: renk.textMuted,
        fontSize: 9,
        textAlign: "center" as const,
        marginLeft: -(barWidth + icAra),
      },
    },
  ]);

  return (
    <View onLayout={(e) => setGenislik(e.nativeEvent.layout.width)}>
      {genislik > 0 && (
        <BarChart
          // Görünüm (gün/hafta/ay/yıl) değişince sıfırdan çiz: kütüphane aynı örnekte
          // çubuk sayısı değişince eski çubukları yerinde bırakıyordu (yıllıkta "Oca"
          // sütununda aylık görünümün çubukları kalıyordu).
          key={`${n}-${etiketler.join("|")}`}
          data={data}
          width={cizimAlani}
          barWidth={barWidth}
          initialSpacing={BASLANGIC}
          endSpacing={SON}
          disableScroll
          barBorderTopLeftRadius={3}
          barBorderTopRightRadius={3}
          noOfSections={BOLME}
          stepValue={adim}
          maxValue={adim * BOLME}
          yAxisLabelWidth={Y_EKSEN}
          yAxisThickness={0}
          xAxisThickness={1}
          xAxisColor={renk.border}
          xAxisLabelTextStyle={{ color: renk.textMuted, fontSize: 9 }}
          yAxisTextStyle={{ color: renk.textFaint, fontSize: 9 }}
          formatYLabel={(l: string) => eksenEtiketi(Number(l))}
          rulesType="dashed"
          rulesColor={renk.hairline}
          dashWidth={3}
          dashGap={6}
          isAnimated
          animationDuration={500}
        />
      )}
    </View>
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
