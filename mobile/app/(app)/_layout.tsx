import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Platform, StyleSheet, View } from "react-native";
import { golge, useRenkler } from "@/lib/theme";

export default function AppLayout() {
  const renk = useRenkler();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: renk.primary,
        tabBarInactiveTintColor: renk.textFaint,
        tabBarStyle: {
          backgroundColor: renk.card,
          borderTopColor: renk.hairline,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: Platform.OS === "ios" ? 86 : 64,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 10.5, fontWeight: "600", marginTop: 2 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Özet",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "pie-chart" : "pie-chart-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="rapor"
        options={{
          title: "Rapor",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "bar-chart" : "bar-chart-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="ekle"
        options={{
          title: "",
          tabBarIcon: () => (
            <View style={[s.fab, { backgroundColor: renk.primary, borderColor: renk.card }, golge(2)]}>
              <Ionicons name="add" size={30} color="#fff" />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="gecmis"
        options={{
          title: "Geçmiş",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "receipt" : "receipt-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profil"
        options={{
          title: "Profil",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "person-circle" : "person-circle-outline"} size={23} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const s = StyleSheet.create({
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 4,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -24,
  },
});
