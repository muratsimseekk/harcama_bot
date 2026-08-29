import { Tabs } from "expo-router";
import { AltNav } from "@/components/AltNav";

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: "transparent" } }}
      tabBar={(props) => <AltNav {...props} />}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="analiz" />
      <Tabs.Screen name="ekle" />
      <Tabs.Screen name="kategori" />
      <Tabs.Screen name="profil" />
    </Tabs>
  );
}
