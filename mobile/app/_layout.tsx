import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "@/lib/auth";
import { useRenkler } from "@/lib/theme";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 15_000 } },
});

function Kapi() {
  const { session, yukleniyor } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const renk = useRenkler();

  useEffect(() => {
    if (yukleniyor) return;
    const authGrubunda = segments[0] === "(auth)";
    if (!session && !authGrubunda) router.replace("/(auth)/login");
    else if (session && authGrubunda) router.replace("/(app)");
  }, [session, yukleniyor, segments]);

  if (yukleniyor) {
    return (
      <View style={{ flex: 1, justifyContent: "center", backgroundColor: renk.bg }}>
        <ActivityIndicator size="large" color={renk.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: renk.bg } }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(app)" />
      <Stack.Screen
        name="confirm"
        options={{ presentation: "modal", headerShown: true, title: "Onayla" }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <StatusBar style="auto" />
            <Kapi />
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
