import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { SP, useRenkler } from "@/lib/theme";

/** Uygulama-içi markalı açılış görünümü (font yüklenirken / oturum kontrolünde). */
export function Giris() {
  const renk = useRenkler();
  return (
    <View style={[s.kap, { backgroundColor: renk.bg }]}>
      <Animated.View entering={FadeIn.duration(400)} style={s.orta}>
        <View style={[s.marka, { backgroundColor: renk.primary }]}>
          <Ionicons name="wallet" size={40} color="#fff" />
        </View>
        <ActivityIndicator color={renk.textFaint} style={{ marginTop: SP.xl }} />
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  kap: { flex: 1, alignItems: "center", justifyContent: "center" },
  orta: { alignItems: "center" },
  marka: {
    width: 88,
    height: 88,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
});
