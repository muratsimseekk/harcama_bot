import { Tabs } from "expo-router/js-tabs";
import { AltNav } from "@/components/AltNav";
import { ButceUyarici } from "@/components/ButceUyarici";

export default function AppLayout() {
  return (
    <>
      {/* Görünmez: bütçe %80 / %100 olunca uygulama içi uyarı */}
      <ButceUyarici />
      <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <AltNav {...props} />}>
        <Tabs.Screen name="index" />
        <Tabs.Screen name="analiz" />
        <Tabs.Screen name="ekle" />
        <Tabs.Screen name="hedefler" />
        <Tabs.Screen name="profil" />
      </Tabs>
    </>
  );
}
