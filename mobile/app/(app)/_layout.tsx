import { Tabs } from "expo-router";
import { AltNav } from "@/components/AltNav";

export default function AppLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <AltNav {...props} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="analiz" />
      <Tabs.Screen name="ekle" />
      <Tabs.Screen name="hedefler" />
      <Tabs.Screen name="profil" />
    </Tabs>
  );
}
