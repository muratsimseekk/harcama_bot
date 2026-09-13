import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, View } from "react-native";
import { YuklemeHalkasi } from "@/components/YuklemeHalkasi";
import { SP, useRenkler } from "@/lib/theme";

/** Uygulama-içi markalı açılış görünümü (font yüklenirken / oturum kontrolünde). */
export function Giris() {
  const renk = useRenkler();
  return (
    <View style={[s.kap, { backgroundColor: renk.bg }]}>
      <View style={s.orta}>
        <View style={[s.marka, { backgroundColor: renk.aksan }]}>
          <Ionicons name="wallet" size={40} color={renk.aksanUstu} />
        </View>
        <View style={{ marginTop: SP.lg }}>
          <YuklemeHalkasi boyut={60} yazi="Başlatılıyor" />
        </View>
      </View>
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
