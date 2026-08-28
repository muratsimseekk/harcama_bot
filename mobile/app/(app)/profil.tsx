import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DEV_NOAUTH } from "@/app/_layout";
import { Kart } from "@/components/ui";
import { useCategories, useMe } from "@/lib/queries";
import { supabase } from "@/lib/supabase";
import { useRenkler } from "@/lib/theme";

export default function Profil() {
  const renk = useRenkler();
  const router = useRouter();
  const me = useMe();
  const kategoriler = useCategories();

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: renk.bg }]} edges={["top"]}>
      <ScrollView contentContainerStyle={s.icerik}>
        <Text style={[s.baslik, { color: renk.text }]}>Profil</Text>

        <Kart style={{ gap: 4 }}>
          <Text style={[s.plan, { color: renk.text }]}>
            {DEV_NOAUTH ? "Yönetici" : me.data?.plan === "pro" ? "Pro" : "Ücretsiz"}
          </Text>
          <Text style={{ color: renk.textMuted }}>
            Bu ay {me.data?.ay_kayit ?? "…"} kayıt · toplam {me.data?.toplam_kayit ?? "…"}
          </Text>
        </Kart>

        <Pressable onPress={() => router.navigate("/kategoriler")}>
          <Kart style={s.satirKart}>
            <View>
              <Text style={[s.satirBaslik, { color: renk.text }]}>Kategoriler</Text>
              <Text style={{ color: renk.textMuted, fontSize: 13 }}>
                {kategoriler.data?.length ?? "…"} kategori · düzenle
              </Text>
            </View>
            <Text style={{ color: renk.textMuted, fontSize: 20 }}>›</Text>
          </Kart>
        </Pressable>

        <Kart style={{ gap: 6 }}>
          <Text style={{ color: renk.textMuted, fontSize: 13 }}>
            Kayıtların Telegram botuyla aynı veritabanında tutulur.
          </Text>
          <Text style={{ color: renk.textMuted, fontSize: 12 }}>
            Sürüm {Constants.expoConfig?.version ?? "0.1.0"}
          </Text>
        </Kart>

        {!DEV_NOAUTH && (
          <Pressable
            style={[s.cikis, { borderColor: renk.danger }]}
            onPress={() => supabase.auth.signOut()}
          >
            <Text style={{ color: renk.danger, fontWeight: "700" }}>Çıkış yap</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  icerik: { padding: 16, gap: 14 },
  baslik: { fontSize: 26, fontWeight: "800" },
  plan: { fontSize: 22, fontWeight: "800" },
  satirKart: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  satirBaslik: { fontSize: 16, fontWeight: "700" },
  cikis: { borderWidth: 1, borderRadius: 12, padding: 16, alignItems: "center", marginTop: 8 },
});
