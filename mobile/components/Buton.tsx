import * as Haptics from "expo-haptics";
import { ActivityIndicator, Pressable, StyleSheet, type ViewStyle } from "react-native";
import { Metin as Text } from "@/components/Metin";
import { R, SP, useRenkler } from "@/lib/theme";

export function Buton({
  yazi,
  onPress,
  varyant = "birincil",
  yukleniyor = false,
  pasif = false,
  style,
}: {
  yazi: string;
  onPress: () => void;
  varyant?: "birincil" | "ikincil" | "hayalet";
  yukleniyor?: boolean;
  pasif?: boolean;
  style?: ViewStyle;
}) {
  const renk = useRenkler();
  const zemin =
    varyant === "birincil" ? renk.aksan : varyant === "ikincil" ? renk.aksanSoft : "transparent";
  const metin = varyant === "hayalet" ? renk.aksan : renk.aksanUstu;

  return (
    <Pressable
      onPress={() => {
        if (pasif || yukleniyor) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [
        s.b,
        { backgroundColor: zemin },
        varyant === "hayalet" && { borderWidth: 1.5, borderColor: renk.aksan },
        (pasif || yukleniyor) && { opacity: 0.55 },
        pressed && { opacity: 0.8 },
        style,
      ]}
    >
      {yukleniyor ? (
        <ActivityIndicator color={metin} />
      ) : (
        <Text style={{ color: metin, fontSize: 16, fontWeight: "700" }}>{yazi}</Text>
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  b: {
    borderRadius: R.pill,
    paddingVertical: 15,
    paddingHorizontal: SP.xl,
    alignItems: "center",
    justifyContent: "center",
  },
});
