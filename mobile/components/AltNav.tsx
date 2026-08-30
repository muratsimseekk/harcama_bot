import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { golge, R, SP, useRenkler } from "@/lib/theme";

const IKON: Record<string, { acik: keyof typeof Ionicons.glyphMap; kapali: keyof typeof Ionicons.glyphMap }> = {
  index: { acik: "home", kapali: "home-outline" },
  analiz: { acik: "stats-chart", kapali: "stats-chart-outline" },
  ekle: { acik: "add", kapali: "add" },
  hedefler: { acik: "flag", kapali: "flag-outline" },
  profil: { acik: "person", kapali: "person-outline" },
};

export function AltNav({ state, navigation }: BottomTabBarProps) {
  const renk = useRenkler();
  return (
    <SafeAreaView edges={["bottom"]} style={[s.kap, { backgroundColor: renk.bg }]}>
      <View style={[s.bar, { backgroundColor: renk.greenSoft }, golge(2)]}>
        {state.routes.map((route, i) => {
          const odakli = state.index === i;
          const ik = IKON[route.name] ?? IKON.index;
          const merkez = route.name === "ekle";

          const bas = () => {
            const ev = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
            if (!odakli && !ev.defaultPrevented) navigation.navigate(route.name);
          };

          return (
            <Pressable key={route.key} onPress={bas} style={s.oge} hitSlop={6}>
              {merkez ? (
                <View style={[s.fab, { backgroundColor: renk.green }, golge(2)]}>
                  <Ionicons name="add" size={28} color={renk.onGreen} />
                </View>
              ) : (
                <View style={[s.kutu, odakli && { backgroundColor: renk.green }]}>
                  <Ionicons
                    name={odakli ? ik.acik : ik.kapali}
                    size={23}
                    color={odakli ? renk.onGreen : renk.text}
                  />
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  kap: { paddingHorizontal: SP.lg },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: R.xl,
    paddingVertical: SP.sm,
    paddingHorizontal: SP.xs,
    marginBottom: SP.sm,
  },
  oge: { flex: 1, alignItems: "center", justifyContent: "center" },
  kutu: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  fab: {
    width: 52,
    height: 52,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -18,
  },
});
