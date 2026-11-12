import Ionicons from "@expo/vector-icons/Ionicons";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { Metin as Text } from "@/components/Metin";
import { R, SP, useRenkler } from "@/lib/theme";

/**
 * Yazılı "dışa aktar" butonu: küçük bir ikon diğer ikonların arasında kayboluyordu —
 * özellik görünür olsun diye tam genişlik, ne aktarılacağı (aralık) altında yazılı.
 */
export function DisaAktarButonu({
  yazi,
  aralik,
  aktariliyor,
  onPress,
}: {
  yazi: string;
  aralik?: string;
  aktariliyor?: boolean;
  onPress: () => void;
}) {
  const renk = useRenkler();
  return (
    <Pressable
      onPress={onPress}
      disabled={aktariliyor}
      accessibilityRole="button"
      style={({ pressed }) => [
        s.dugme,
        { borderColor: renk.aksan, backgroundColor: renk.card },
        pressed && { opacity: 0.7 },
      ]}
    >
      <View style={[s.ikon, { backgroundColor: renk.aksanSoft }]}>
        {aktariliyor ? (
          <ActivityIndicator size="small" color={renk.aksan} />
        ) : (
          <Ionicons name="download-outline" size={18} color={renk.aksan} />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: renk.text, fontSize: 15, fontWeight: "700" }} numberOfLines={1}>
          {aktariliyor ? "Hazırlanıyor…" : yazi}
        </Text>
        {aralik ? (
          <Text style={{ color: renk.textMuted, fontSize: 12.5, marginTop: 1 }} numberOfLines={1}>
            {aralik}
          </Text>
        ) : null}
      </View>
      <Text style={{ color: renk.aksan, fontSize: 12.5, fontWeight: "800" }}>Excel · PDF</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  dugme: {
    flexDirection: "row",
    alignItems: "center",
    gap: SP.md,
    borderWidth: 1.5,
    borderRadius: R.md,
    paddingHorizontal: SP.md,
    paddingVertical: SP.md,
  },
  ikon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
});
