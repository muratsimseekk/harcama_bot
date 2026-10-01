// Alt yoldan tek tek import: paket kökünden (@expo-google-fonts/inter) import
// edilince tüm ağırlıklar + italikler (18 + 14 dosya) pakete giriyordu.
import { Inter_400Regular } from "@expo-google-fonts/inter/400Regular";
import { Inter_500Medium } from "@expo-google-fonts/inter/500Medium";
import { Inter_600SemiBold } from "@expo-google-fonts/inter/600SemiBold";
import { Inter_700Bold } from "@expo-google-fonts/inter/700Bold";
import { Inter_800ExtraBold } from "@expo-google-fonts/inter/800ExtraBold";
import { Newsreader_500Medium } from "@expo-google-fonts/newsreader/500Medium";
import { Newsreader_600SemiBold } from "@expo-google-fonts/newsreader/600SemiBold";
import { Newsreader_700Bold } from "@expo-google-fonts/newsreader/700Bold";
import { useFonts } from "expo-font";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Sentry from "@sentry/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as Linking from "expo-linking";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Giris } from "@/components/Giris";
import { HataSiniri } from "@/components/HataSiniri";
import { UyariProvider, useUyari } from "@/components/Uyari";
import { api } from "@/lib/api";
import { AuthProvider, useAuth } from "@/lib/auth";
import { izinVeToken, platformAdi } from "@/lib/bildirim";
import { baslat as rcBaslat } from "@/lib/satinalma";
import { koduOturumaCevir, supabase } from "@/lib/supabase";
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
  const uyari = useUyari();
  const [onboardGoruldu, setOnboardGoruldu] = useState<boolean | null>(DEV_NOAUTH ? true : null);
  const karsilamaYonlendi = useRef(false);

  useEffect(() => {
    if (DEV_NOAUTH) return;
    // Karşılama yalnız uygulamanın İLK açılışında: onboard ekranı açıldığı an "görüldü"
    // yazar — yarıda kapatılsa da, sonradan çıkış yapılsa da bir daha çıkmaz.
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
    // Oturum varsa karşılama durumu önemsiz: onboardGoruldu açılışta bir kez okunuyor,
    // yeni kullanıcı karşılamayı bitirip giriş yapınca hâlâ false — önce kontrol edilirse
    // (app) ↔ onboard arasında sonsuz yönlendirme döngüsü oluşuyordu.
    if (session) {
      // Şifre yenileme oturum açıkken (kurtarma oturumu) gösterilmeli, atlanmamalı.
      const sifreYenile = (segments as string[])[1] === "sifre-yenile";
      if (grup === "(auth)" && !sifreYenile) router.replace("/(app)");
      return;
    }
    // Bu açılışta da bir kez yeter: çıkış yapınca karşılamaya değil girişe dönülsün.
    // (state değil ref — setState efekti yönlendirme tamamlanmadan yeniden tetikleyip
    // karşılamayı atlatabilirdi)
    // İlk replace navigasyon hazır olmadan gelirse yok sayılabiliyor → karşılamaya fiilen
    // ulaşılana kadar tekrar dene, ulaşınca işaretle.
    if (!onboardGoruldu && !karsilamaYonlendi.current) {
      if ((segments as string[])[1] === "onboard") karsilamaYonlendi.current = true;
      else router.replace("/(auth)/onboard");
      return;
    }
    if (grup !== "(auth)") router.replace("/(auth)/giris");
  }, [session, yukleniyor, segments, onboardGoruldu]);

  // Şifre sıfırlama bağlantısıyla dönüşte yeni şifre ekranına git
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((olay) => {
      if (olay === "PASSWORD_RECOVERY") router.replace("/(auth)/sifre-yenile");
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Şifre sıfırlama e-postasındaki derin bağlantıyı işle (paraizi://sifre-yenile?code=... )
  useEffect(() => {
    async function isle(url: string | null) {
      if (!url) return;
      const parcalar = Linking.parse(url);
      const code = parcalar.queryParams?.code as string | undefined;
      const kurtarma =
        parcalar.path?.includes("sifre-yenile") ||
        (parcalar.queryParams?.type as string | undefined) === "recovery";
      if (code) {
        const { hata } = await koduOturumaCevir(code);
        if (!hata && kurtarma) router.replace("/(auth)/sifre-yenile");
        else if (hata && kurtarma) {
          // PKCE: bağlantı yalnız sıfırlamanın istendiği cihazdaki uygulamada çalışır.
          router.replace("/(auth)/giris");
          uyari(
            "Bağlantı bu cihazda açılamadı",
            "Şifre sıfırlama bağlantısını, sıfırlamayı istediğin telefonda aç ya da buradan yeniden iste.",
          );
        }
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

  // RevenueCat'i kullanıcı kimliğiyle başlat (dev build'de aktif, Expo Go'da no-op)
  useEffect(() => {
    const uid = session?.user?.id;
    if (uid) rcBaslat(uid);
  }, [session?.user?.id]);

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
      {/* Bu ikisi native modal DEĞİL: iOS'ta native modal olarak sunulan bir
          ekranın üstüne uygulama-içi uyarı katmanı çizilemiyordu. */}
      <Stack.Screen name="confirm" options={{ ...baslik, title: "Onayla" }} />
      <Stack.Screen name="islem-form" />
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
  const [fontHazir, fontHata] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Newsreader_500Medium,
    Newsreader_600SemiBold,
    Newsreader_700Bold,
  });

  const [fontZamanAsimi, setFontZamanAsimi] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setFontZamanAsimi(true), 2500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (fontHazir || fontHata || fontZamanAsimi) SplashScreen.hideAsync().catch(() => {});
  }, [fontHazir, fontHata, fontZamanAsimi]);

  // Fontlar yüklenene kadar bekle — yoksa yedek font geniş metrikleriyle
  // metinlerin son harfleri kırpılıyor (İşlem→İşle, Haftalık→Haftalı).
  if (!fontHazir && !fontHata && !fontZamanAsimi) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <HataSiniri>
        <SafeAreaProvider>
          <TemaProvider>
            <QueryClientProvider client={queryClient}>
              <AuthProvider>
                <TemaliDurumCubugu />
                <UyariProvider>
                  <View style={{ flex: 1 }}>
                    <Kapi />
                  </View>
                </UyariProvider>
              </AuthProvider>
            </QueryClientProvider>
          </TemaProvider>
        </SafeAreaProvider>
      </HataSiniri>
    </GestureHandlerRootView>
  );
}

export default SENTRY_DSN ? Sentry.wrap(RootLayout) : RootLayout;
