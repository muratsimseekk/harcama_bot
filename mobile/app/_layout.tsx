import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  useFonts,
} from "@expo-google-fonts/poppins";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Giris } from "@/components/Giris";
import { AuthProvider, useAuth } from "@/lib/auth";
import { TemaProvider, useEtkinSema } from "@/lib/tema";
import { useRenkler } from "@/lib/theme";

SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 15_000 } },
});

export const DEV_NOAUTH = process.env.EXPO_PUBLIC_DEV_NOAUTH === "1";

function Kapi() {
  const { session, yukleniyor } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const renk = useRenkler();

  useEffect(() => {
    if (DEV_NOAUTH || yukleniyor) return;
    const authGrubunda = segments[0] === "(auth)";
    if (!session && !authGrubunda) router.replace("/(auth)/login");
    else if (session && authGrubunda) router.replace("/(app)");
  }, [session, yukleniyor, segments]);

  if (!DEV_NOAUTH && yukleniyor) return <Giris />;

  const baslik = {
    headerShown: true,
    headerStyle: { backgroundColor: renk.card },
    headerTintColor: renk.text,
    headerTitleStyle: { fontFamily: "Poppins_700Bold" },
    headerShadowVisible: false,
  } as const;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: renk.bg } }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(app)" />
      <Stack.Screen name="confirm" options={{ ...baslik, presentation: "modal", title: "Onayla" }} />
      <Stack.Screen name="kategoriler" options={{ ...baslik, title: "Kategoriler" }} />
      <Stack.Screen name="ayarlar/gorunum" options={{ ...baslik, title: "Görünüm" }} />
      <Stack.Screen name="ayarlar/hakkinda" options={{ ...baslik, title: "Hakkında" }} />
      <Stack.Screen name="ayarlar/veri" options={{ ...baslik, title: "Veri & Gizlilik" }} />
    </Stack>
  );
}

function TemaliDurumCubugu() {
  return <StatusBar style={useEtkinSema() === "dark" ? "light" : "dark"} />;
}

export default function RootLayout() {
  const [fontHazir] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  const yerlesimHazir = useCallback(async () => {
    if (fontHazir) await SplashScreen.hideAsync().catch(() => {});
  }, [fontHazir]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <TemaProvider>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <TemaliDurumCubugu />
              <View style={{ flex: 1 }} onLayout={yerlesimHazir}>
                {fontHazir ? <Kapi /> : <Giris />}
              </View>
            </AuthProvider>
          </QueryClientProvider>
        </TemaProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
