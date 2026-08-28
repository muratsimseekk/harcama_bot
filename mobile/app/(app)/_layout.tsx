import { Tabs } from "expo-router";
import { Text } from "react-native";
import { useRenkler } from "@/lib/theme";

export default function AppLayout() {
  const renk = useRenkler();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: renk.primary,
        tabBarInactiveTintColor: renk.textMuted,
        tabBarStyle: { backgroundColor: renk.card, borderTopColor: renk.border },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Ekle",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>➕</Text>,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "Geçmiş",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>📁</Text>,
        }}
      />
    </Tabs>
  );
}
