import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DEV_NOAUTH } from "@/app/_layout";
import { Metin as Text } from "@/components/Metin";
import { PlanRozeti } from "@/components/PlanRozeti";
import { useMe, useNotifications } from "@/lib/queries";
import { supabase } from "@/lib/supabase";
import { golge, R, SERIF, SP, T, useRenkler } from "@/lib/theme";

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
  const bildirim = useNotifications();
  const uyariVar = (bildirim.data?.bildirimler ?? []).some((b) => b.tur === "uyari");

  const cikis = () =>
    Alert.alert("Çıkış", "Çıkış yapılsın mı?", [
      { text: "Vazgeç", style: "cancel" },
      { text: "Çıkış", style: "destructive", onPress: () => supabase.auth.signOut() },
    ]);

  const satirlar: Satir[] = [
    { ikon: "person-outline", ad: "Profili Düzenle", git: "/ayarlar/profil-duzenle" },
    { ikon: "star-outline", ad: "Üyelik", git: "/uyelik" },
    { ikon: "people-outline", ad: "Hane", git: "/hane" },
    { ikon: "pricetags-outline", ad: "Kategoriler", git: "/kategori-yonet" },
    { ikon: "shield-checkmark-outline", ad: "Güvenlik", git: "/ayarlar/guvenlik" },
    { ikon: "settings-outline", ad: "Ayarlar", git: "/ayarlar" },
    ...(DEV_NOAUTH ? [] : [{ ikon: "log-out-outline" as const, ad: "Çıkış", tehlike: true, onPress: cikis }]),
  ];

  return (
    <View style={[s.kok, { backgroundColor: renk.bg }]}>
      <SafeAreaView edges={["top"]} style={s.ust}>
        <View style={s.baslikSatir}>
          <View style={{ width: 26 }} />
          <Text style={[T.title, { color: renk.text }]}>Profil</Text>
          <Pressable onPress={() => router.navigate("/bildirimler")} style={[s.zil, { backgroundColor: renk.cardAlt }]}>
            <Ionicons name="notifications-outline" size={19} color={renk.text} />
            {uyariVar && <View style={[s.nokta, { backgroundColor: renk.danger, borderColor: renk.bg }]} />}
          </Pressable>
        </View>
      </SafeAreaView>

      <View style={s.avatarSar}>
        <View style={[s.avatar, { backgroundColor: renk.aksanSoft }]}>
          <Ionicons name="person" size={44} color={renk.aksan} />
        </View>
        <Text style={[s.isim, { color: renk.text }]}>
          {DEV_NOAUTH ? "Yönetici" : "Kullanıcı"}
        </Text>
        {!DEV_NOAUTH && <PlanRozeti ben={me.data} />}
        <Text style={[s.id, { color: renk.textMuted }]}>
          {me.data ? `${me.data.toplam_kayit} kayıt · bu ay ${me.data.ay_kayit} AI` : "…"}
        </Text>
      </View>

      <View style={s.liste}>
        {satirlar.map((r) => (
          <Pressable
            key={r.ad}
            onPress={r.onPress ?? (() => r.git && router.navigate(r.git as never))}
            style={({ pressed }) => [s.satir, { backgroundColor: renk.card }, golge(1), pressed && { opacity: 0.6 }]}
          >
            <View style={[s.ikonKutu, { backgroundColor: r.tehlike ? renk.dangerSoft : renk.aksanSoft }]}>
              <Ionicons name={r.ikon} size={20} color={r.tehlike ? renk.danger : renk.aksan} />
            </View>
            <Text style={[s.satirAd, { color: r.tehlike ? renk.danger : renk.text }]}>{r.ad}</Text>
            <Ionicons name="chevron-forward" size={18} color={renk.textFaint} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  kok: { flex: 1 },
  ust: { paddingHorizontal: SP.lg },
  baslikSatir: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: SP.sm },
  zil: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  nokta: { position: "absolute", top: 6, right: 6, width: 9, height: 9, borderRadius: 5, borderWidth: 1.5 },
  avatarSar: { alignItems: "center", paddingTop: SP.lg, paddingBottom: SP.xl, gap: 6 },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SP.sm,
  },
  isim: { fontSize: 22, fontFamily: SERIF["700"] },
  id: { fontSize: 13, marginTop: 2 },
  liste: { padding: SP.lg, gap: SP.sm },
  satir: { flexDirection: "row", alignItems: "center", gap: SP.md, padding: SP.md, borderRadius: R.md },
  ikonKutu: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  satirAd: { flex: 1, fontSize: 16, fontWeight: "600" },
});
