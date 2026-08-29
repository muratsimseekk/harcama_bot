import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  useFonts,
} from "@expo-google-fonts/poppins";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Giris } from "@/components/Giris";
import { HataSiniri } from "@/components/HataSiniri";
import { AuthProvider, useAuth } from "@/lib/auth";
import { TemaProvider, useEtkinSema } from "@/lib/tema";
import { useRenkler } from "@/lib/theme";

SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 15_000 } },
});

export const DEV_NOAUTH = process.env.EXPO_PUBLIC_DEV_NOAUTH === "1";
const ONBOARD_ANAHTAR = "onboard.goruldu";

function Kapi() {
  const { session, yukleniyor } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const renk = useRenkler();
  const [onboardGoruldu, setOnboardGoruldu] = useState<boolean | null>(DEV_NOAUTH ? true : null);

  useEffect(() => {
    if (DEV_NOAUTH) return;
    AsyncStorage.getItem(ONBOARD_ANAHTAR).then((v) => setOnboardGoruldu(v === "1"));
  }, []);

  useEffect(() => {
    if (DEV_NOAUTH || yukleniyor || onboardGoruldu === null) return;
    const grup = segments[0];
    if (!onboardGoruldu && grup !== "(auth)") {
      router.replace("/(auth)/onboard");
    } else if (onboardGoruldu && !session && grup !== "(auth)") {
      router.replace("/(auth)/giris");
    } else if (session && grup === "(auth)") {
      router.replace("/(app)");
    }
  }, [session, yukleniyor, segments, onboardGoruldu]);

  if (!DEV_NOAUTH && (yukleniyor || onboardGoruldu === null)) return <Giris />;

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
      <Stack.Screen name="bildirimler" />
      <Stack.Screen name="ara" options={{ presentation: "modal" }} />
      <Stack.Screen name="ayarlar/index" options={{ ...baslik, title: "Ayarlar" }} />
      <Stack.Screen name="ayarlar/profil-duzenle" options={{ ...baslik, title: "Profili Düzenle" }} />
      <Stack.Screen name="ayarlar/guvenlik" options={{ ...baslik, title: "Güvenlik" }} />
      <Stack.Screen name="ayarlar/gorunum" options={{ ...baslik, title: "Görünüm" }} />
    </Stack>
  );
}

function TemaliDurumCubugu() {
  const koyu = useEtkinSema() === "dark";
  return <StatusBar style={koyu ? "light" : "dark"} />;
}

export async function onboardTamamla() {
  await AsyncStorage.setItem(ONBOARD_ANAHTAR, "1");
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
                <HataSiniri>{fontHazir ? <Kapi /> : <Giris />}</HataSiniri>
              </View>
            </AuthProvider>
          </QueryClientProvider>
        </TemaProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
