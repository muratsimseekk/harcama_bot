import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/inter";
import {
  Newsreader_500Medium,
  Newsreader_600SemiBold,
  Newsreader_700Bold,
} from "@expo-google-fonts/newsreader";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Sentry from "@sentry/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as Linking from "expo-linking";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Giris } from "@/components/Giris";
import { HataSiniri } from "@/components/HataSiniri";
import { api } from "@/lib/api";
import { AuthProvider, useAuth } from "@/lib/auth";
import { izinVeToken, platformAdi } from "@/lib/bildirim";
import { supabase } from "@/lib/supabase";
import { TemaProvider, useEtkinSema } from "@/lib/tema";
import { useRenkler } from "@/lib/theme";

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
if (SENTRY_DSN) {
  Sentry.init({ dsn: SENTRY_DSN, tracesSampleRate: 0.1, sendDefaultPii: false });
}

SplashScreen.preventAutoHideAsync().catch(() => {});
// Ne olursa olsun splash'i 3 sn içinde kaldır (beyaz ekranda kalma).
setTimeout(() => SplashScreen.hideAsync().catch(() => {}), 3000);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60_000, // sayfa geçişlerinde gereksiz arkaplan refetch'i azalt
    },
  },
});

// Şimdilik giriş/kayıt akışı kapalı — herkes yönetici olarak girer.
// Auth testine dönmek için mobile/.env'de EXPO_PUBLIC_DEV_NOAUTH=0 yap.
export const DEV_NOAUTH = process.env.EXPO_PUBLIC_DEV_NOAUTH !== "0";
const ONBOARD_ANAHTAR = "onboard.goruldu";

export async function onboardTamamla() {
  await AsyncStorage.setItem(ONBOARD_ANAHTAR, "1");
}

function Kapi() {
  const { session, yukleniyor } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const renk = useRenkler();
  const [onboardGoruldu, setOnboardGoruldu] = useState<boolean | null>(DEV_NOAUTH ? true : null);

  useEffect(() => {
    if (DEV_NOAUTH) return;
    AsyncStorage.getItem(ONBOARD_ANAHTAR)
      .then((v) => setOnboardGoruldu(v === "1"))
      .catch(() => setOnboardGoruldu(true));
  }, []);

  useEffect(() => {
    // Yönetici modu: expo-router kökü ilk grup olan (auth)'a bağlıyor; uygulamaya geç.
    if (DEV_NOAUTH) {
      if (segments[0] === "(auth)") router.replace("/(app)");
      return;
    }
    if (yukleniyor || onboardGoruldu === null) return;
    const grup = segments[0];
    if (!onboardGoruldu && grup !== "(auth)") router.replace("/(auth)/onboard");
    else if (onboardGoruldu && !session && grup !== "(auth)") router.replace("/(auth)/giris");
    else if (session && grup === "(auth)") router.replace("/(app)");
  }, [session, yukleniyor, segments, onboardGoruldu]);

  // Şifre sıfırlama bağlantısıyla dönüşte yeni şifre ekranına git
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((olay) => {
      if (olay === "PASSWORD_RECOVERY") router.replace("/(auth)/sifre-yenile");
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Şifre sıfırlama e-postasındaki derin bağlantıyı işle (harcama://sifre-yenile?code=... )
  useEffect(() => {
    async function isle(url: string | null) {
      if (!url) return;
      const parcalar = Linking.parse(url);
      const code = parcalar.queryParams?.code as string | undefined;
      const kurtarma =
        parcalar.path?.includes("sifre-yenile") ||
        (parcalar.queryParams?.type as string | undefined) === "recovery";
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error && kurtarma) router.replace("/(auth)/sifre-yenile");
      }
    }
    Linking.getInitialURL().then(isle);
    const sub = Linking.addEventListener("url", (e) => isle(e.url));
    return () => sub.remove();
  }, []);

  // Push token'ı kaydet (oturum açıkken ya da yönetici modunda)
  useEffect(() => {
    if (!DEV_NOAUTH && !session) return;
    (async () => {
      const token = await izinVeToken();
      if (token) {
        try {
          await api.pushTokenKaydet(token, platformAdi);
        } catch {
          /* sessiz */
        }
      }
    })();
  }, [session]);

  if (!DEV_NOAUTH && (yukleniyor || onboardGoruldu === null)) return <Giris />;

  const baslik = {
    headerShown: true,
    headerStyle: { backgroundColor: renk.card },
    headerTintColor: renk.text,
    headerShadowVisible: false,
    headerBackButtonDisplayMode: "minimal",
    headerBackTitle: "",
  } as const;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: renk.bg } }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(app)" />
      <Stack.Screen name="confirm" options={{ ...baslik, presentation: "modal", title: "Onayla" }} />
      <Stack.Screen name="islem-form" options={{ presentation: "modal" }} />
      <Stack.Screen name="bildirimler" />
      <Stack.Screen name="ara" options={{ presentation: "modal" }} />
      <Stack.Screen name="kategori-yonet" options={{ ...baslik, title: "Kategoriler" }} />
      <Stack.Screen name="hane/index" options={{ ...baslik, title: "Hane" }} />
      <Stack.Screen name="yasal" options={{ ...baslik, title: "Yasal" }} />
      <Stack.Screen name="uyelik" options={{ ...baslik, title: "Üyelik" }} />
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

function RootLayout() {
  useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Newsreader_500Medium,
    Newsreader_600SemiBold,
    Newsreader_700Bold,
  });

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <HataSiniri>
        <SafeAreaProvider>
          <TemaProvider>
            <QueryClientProvider client={queryClient}>
              <AuthProvider>
                <TemaliDurumCubugu />
                <View style={{ flex: 1 }}>
                  <Kapi />
                </View>
              </AuthProvider>
            </QueryClientProvider>
          </TemaProvider>
        </SafeAreaProvider>
      </HataSiniri>
    </GestureHandlerRootView>
  );
}

export default SENTRY_DSN ? Sentry.wrap(RootLayout) : RootLayout;
