import { Tabs } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { useRenkler } from "@/lib/theme";

function Ikon({ isim, color }: { isim: string; color: string }) {
  return <Text style={{ fontSize: 21, color }}>{isim}</Text>;
}

export default function AppLayout() {
  const renk = useRenkler();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: renk.primary,
        tabBarInactiveTintColor: renk.textMuted,
        tabBarStyle: {
          backgroundColor: renk.card,
          borderTopColor: renk.border,
          height: 60,
          paddingBottom: 6,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Özet", tabBarIcon: ({ color }) => <Ikon isim="◉" color={color} /> }}
      />
      <Tabs.Screen
        name="rapor"
        options={{ title: "Rapor", tabBarIcon: ({ color }) => <Ikon isim="▤" color={color} /> }}
      />
      <Tabs.Screen
        name="ekle"
        options={{
          title: "",
          tabBarIcon: () => (
            <View style={[s.fab, { backgroundColor: renk.primary, borderColor: renk.card }]}>
              <Text style={{ fontSize: 26, color: "#fff", marginTop: -2 }}>＋</Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="gecmis"
        options={{ title: "Geçmiş", tabBarIcon: ({ color }) => <Ikon isim="≣" color={color} /> }}
      />
      <Tabs.Screen
        name="profil"
        options={{ title: "Profil", tabBarIcon: ({ color }) => <Ikon isim="⬤" color={color} /> }}
      />
    </Tabs>
  );
}

const s = StyleSheet.create({
  fab: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 4,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -22,
  },
});
