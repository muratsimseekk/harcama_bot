import Ionicons from "@expo/vector-icons/Ionicons";
import { View } from "react-native";
import { Metin as Text } from "@/components/Metin";
import type { Ben } from "@/lib/types";
import { R, useRenkler } from "@/lib/theme";

/** Yalnız Pro için rozet gösterir — Free katmanda günlük limit zaten ayrı bir
 * satırda yazıyor, burada tekrar "Free" yazmaya gerek yok. */
export function PlanRozeti({ ben }: { ben?: Ben }) {
  const renk = useRenkler();
  if (!ben || ben.plan !== "pro") return null;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        alignSelf: "center",
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: R.pill,
        backgroundColor: renk.aksan,
      }}
    >
      <Ionicons name="star" size={13} color={renk.aksanUstu} />
      <Text style={{ color: renk.aksanUstu, fontSize: 12.5, fontWeight: "700" }}>Pro</Text>
    </View>
  );
}
