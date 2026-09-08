import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";
import { Metin as Text } from "@/components/Metin";
import type { Ben } from "@/lib/types";
import { R, useRenkler } from "@/lib/theme";

export function denemeGunKalan(trialBitis?: string | null): number | null {
  if (!trialBitis) return null;
  const bitis = new Date(trialBitis).getTime();
  if (Number.isNaN(bitis)) return null;
  const gun = Math.ceil((bitis - Date.now()) / 86_400_000);
  return gun > 0 ? gun : null;
}

export function PlanRozeti({ ben }: { ben?: Ben }) {
  const renk = useRenkler();
  if (!ben) return null;

  const deneme = ben.ham_plan === "trial" ? denemeGunKalan(ben.trial_bitis) : null;

  let yazi: string;
  let ikon: keyof typeof Ionicons.glyphMap;
  let zemin: string;
  let renkli: string;

  if (deneme != null) {
    yazi = `Deneme · ${deneme} gün`;
    ikon = "time-outline";
    zemin = renk.aksanSoft;
    renkli = renk.aksan;
  } else if (ben.plan === "pro") {
    yazi = "Pro";
    ikon = "star";
    zemin = renk.aksan;
    renkli = renk.aksanUstu;
  } else {
    yazi = "Base";
    ikon = "person-outline";
    zemin = renk.cardAlt;
    renkli = renk.textMuted;
  }

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
        backgroundColor: zemin,
      }}
    >
      <Ionicons name={ikon} size={13} color={renkli} />
      <Text style={{ color: renkli, fontSize: 12.5, fontWeight: "700" }}>{yazi}</Text>
    </View>
  );
}
