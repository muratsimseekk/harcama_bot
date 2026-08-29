import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DEV_NOAUTH } from "@/app/_layout";
import { Metin as Text } from "@/components/Metin";
import { useMe } from "@/lib/queries";
import { supabase } from "@/lib/supabase";
import { golge, R, SP, T, useRenkler } from "@/lib/theme";

type Satir = {
  ikon: keyof typeof Ionicons.glyphMap;
  ad: string;
  git?: string;
  tehlike?: boolean;
  onPress?: () => void;
};

export default function Profil() {
  const renk = useRenkler();
  const router = useRouter();
  const me = useMe();

  const cikis = () =>
    Alert.alert("Çıkış", "Çıkış yapılsın mı?", [
      { text: "Vazgeç", style: "cancel" },
      { text: "Çıkış", style: "destructive", onPress: () => supabase.auth.signOut() },
    ]);

  const satirlar: Satir[] = [
    { ikon: "person-outline", ad: "Profili Düzenle", git: "/ayarlar/profil-duzenle" },
    { ikon: "shield-checkmark-outline", ad: "Güvenlik", git: "/ayarlar/guvenlik" },
    { ikon: "settings-outline", ad: "Ayarlar", git: "/ayarlar" },
    ...(DEV_NOAUTH ? [] : [{ ikon: "log-out-outline" as const, ad: "Çıkış", tehlike: true, onPress: cikis }]),
  ];

  return (
    <View style={[s.kok, { backgroundColor: renk.green }]}>
      <SafeAreaView edges={["top"]} style={s.ust}>
        <View style={s.baslikSatir}>
          <View style={{ width: 26 }} />
          <Text style={[T.title, { color: renk.onGreen }]}>Profil</Text>
          <Pressable onPress={() => router.navigate("/bildirimler")} style={[s.zil, { backgroundColor: renk.greenSoft }]}>
            <Ionicons name="notifications-outline" size={19} color={renk.text} />
          </Pressable>
        </View>
      </SafeAreaView>

      <View style={[s.avatarSar, { backgroundColor: renk.green }]}>
        <View style={[s.avatar, { backgroundColor: renk.greenSoft, borderColor: renk.bg }]}>
          <Ionicons name="person" size={44} color={renk.text} />
        </View>
      </View>

      <View style={[s.mint, { backgroundColor: renk.bg }]}>
        <Text style={[s.isim, { color: renk.text }]}>
          {DEV_NOAUTH ? "Yönetici" : me.data?.plan === "pro" ? "Pro Üye" : "Kullanıcı"}
        </Text>
        <Text style={[s.id, { color: renk.textMuted }]}>
          {me.data ? `${me.data.toplam_kayit} kayıt · bu ay ${me.data.ay_kayit}` : "…"}
        </Text>

        <View style={s.liste}>
          {satirlar.map((r) => (
            <Pressable
              key={r.ad}
              onPress={r.onPress ?? (() => r.git && router.navigate(r.git as never))}
              style={({ pressed }) => [s.satir, pressed && { opacity: 0.6 }]}
            >
              <View style={[s.ikonKutu, { backgroundColor: r.tehlike ? renk.dangerSoft : renk.blueSoft }]}>
                <Ionicons name={r.ikon} size={22} color={r.tehlike ? renk.danger : "#FFFFFF"} />
              </View>
              <Text style={[s.satirAd, { color: r.tehlike ? renk.danger : renk.text }]}>{r.ad}</Text>
              <Ionicons name="chevron-forward" size={18} color={renk.textFaint} />
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  kok: { flex: 1 },
  ust: { paddingHorizontal: SP.lg },
  baslikSatir: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: SP.sm },
  zil: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  avatarSar: { alignItems: "center", paddingTop: SP.sm, zIndex: 2 },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 5,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: -46,
  },
  mint: { flex: 1, borderTopLeftRadius: R.xl, borderTopRightRadius: R.xl, marginTop: SP.md, paddingTop: 58, alignItems: "center" },
  isim: { fontSize: 22, fontWeight: "800" },
  id: { fontSize: 13, marginTop: 2 },
  liste: { alignSelf: "stretch", padding: SP.lg, gap: SP.md, marginTop: SP.lg },
  satir: { flexDirection: "row", alignItems: "center", gap: SP.md },
  ikonKutu: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  satirAd: { flex: 1, fontSize: 16, fontWeight: "600" },
  _g: golge(1),
});
