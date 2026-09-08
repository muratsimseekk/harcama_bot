import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "expo-router/js-tabs";
import { Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { golge, SP, useRenkler } from "@/lib/theme";

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
    <SafeAreaView edges={["bottom"]} style={[s.kap, { backgroundColor: renk.card, borderTopColor: renk.hairline }]}>
      <View style={s.bar}>
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
                <View style={[s.fab, { backgroundColor: renk.aksan }, golge(2)]}>
                  <Ionicons name="add" size={28} color={renk.aksanUstu} />
                </View>
              ) : (
                <View style={[s.kutu, odakli && { backgroundColor: renk.aksanSoft }]}>
                  <Ionicons
                    name={odakli ? ik.acik : ik.kapali}
                    size={23}
                    color={odakli ? renk.aksan : renk.textFaint}
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
  kap: { paddingHorizontal: SP.sm, borderTopWidth: StyleSheet.hairlineWidth },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SP.sm,
    paddingHorizontal: SP.xs,
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
