import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useRenkler } from "@/lib/theme";

/** Dairesel ilerleme + merkezde ikon (FinWise "Savings On Goals") */
export function HedefHalkasi({
  oran,
  ikon = "car-outline",
  boyut = 96,
}: {
  oran: number; // 0–100
  ikon?: keyof typeof Ionicons.glyphMap;
  boyut?: number;
}) {
  const renk = useRenkler();
  const kalinlik = 5;
  const r = (boyut - kalinlik) / 2;
  const cevre = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, oran));

  return (
    <View style={{ width: boyut, height: boyut, alignItems: "center", justifyContent: "center" }}>
      <Svg width={boyut} height={boyut} style={{ position: "absolute" }}>
        <Circle cx={boyut / 2} cy={boyut / 2} r={r} stroke={renk.greenSoft} strokeWidth={kalinlik} fill="none" />
        <Circle
          cx={boyut / 2}
          cy={boyut / 2}
          r={r}
          stroke={renk.blue}
          strokeWidth={kalinlik}
          fill="none"
          strokeDasharray={cevre}
          strokeDashoffset={cevre * (1 - p / 100)}
          strokeLinecap="round"
          transform={`rotate(-90 ${boyut / 2} ${boyut / 2})`}
        />
      </Svg>
      <Ionicons name={ikon} size={boyut * 0.4} color={renk.text} />
    </View>
  );
}
