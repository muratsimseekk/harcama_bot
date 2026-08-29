import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { DEV_NOAUTH } from "@/app/_layout";
import { Baslik, Ekran, IkonDaire, Kart } from "@/components/base";
import { turkceTutar } from "@/lib/format";
import { useCategories, useMe, useSummary } from "@/lib/queries";
import { supabase } from "@/lib/supabase";
import { golge, R, SP, useRenkler } from "@/lib/theme";

export default function Profil() {
  const renk = useRenkler();
  const router = useRouter();
  const me = useMe();
  const kategoriler = useCategories();
  const yil = useSummary("year");

  const planYazi = DEV_NOAUTH ? "Yönetici" : me.data?.plan === "pro" ? "Pro üye" : "Ücretsiz";

  return (
    <Ekran onRefresh={() => { me.refetch(); yil.refetch(); }} refreshing={me.isRefetching}>
      <Baslik>Profil</Baslik>

      <Kart seviye={2} style={s.ust}>
        <IkonDaire ikon="person" renk={renk.primary} boyut={52} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: renk.text, fontSize: 18, fontWeight: "800" }}>{planYazi}</Text>
          <Text style={{ color: renk.textMuted, fontSize: 13 }}>
            Telegram botuyla aynı veritabanı
          </Text>
        </View>
      </Kart>

      <View style={s.istatSira}>
        <Istat etiket="Bu ay" deger={`${me.data?.ay_kayit ?? "…"}`} alt="kayıt" />
        <Istat etiket="Toplam" deger={`${me.data?.toplam_kayit ?? "…"}`} alt="kayıt" />
        <Istat
          etiket="Bu yıl"
          deger={yil.data ? turkceTutar(yil.data.bu_donem.toplam_gider) : "…"}
          alt="₺ gider"
        />
      </View>

      <Text style={[s.grupBaslik, { color: renk.textFaint }]}>YÖNETİM</Text>
      <Kart style={{ padding: 0 }}>
        <Satir
          ikon="pricetags-outline"
          baslik="Kategoriler"
          alt={`${kategoriler.data?.length ?? "…"} kategori`}
          onPress={() => router.navigate("/kategoriler")}
        />
      </Kart>

      <Text style={[s.grupBaslik, { color: renk.textFaint }]}>UYGULAMA</Text>
      <Kart style={{ padding: 0 }}>
        <Satir ikon="information-circle-outline" baslik="Sürüm" alt={Constants.expoConfig?.version ?? "0.1.0"} son />
      </Kart>

      {!DEV_NOAUTH && (
        <Pressable
          style={[s.cikis, { borderColor: renk.danger }]}
          onPress={() =>
            Alert.alert("Çıkış", "Çıkış yapılsın mı?", [
              { text: "Vazgeç", style: "cancel" },
              { text: "Çıkış", style: "destructive", onPress: () => supabase.auth.signOut() },
            ])
          }
        >
          <Ionicons name="log-out-outline" size={18} color={renk.danger} />
          <Text style={{ color: renk.danger, fontWeight: "700" }}>Çıkış yap</Text>
        </Pressable>
      )}
    </Ekran>
  );
}

function Istat({ etiket, deger, alt }: { etiket: string; deger: string; alt: string }) {
  const renk = useRenkler();
  return (
    <View style={[s.istat, { backgroundColor: renk.card, borderColor: renk.border }, golge(1)]}>
      <Text style={{ color: renk.textFaint, fontSize: 11, fontWeight: "600" }}>{etiket}</Text>
      <Text style={{ color: renk.text, fontSize: 17, fontWeight: "800" }} numberOfLines={1}>
        {deger}
      </Text>
      <Text style={{ color: renk.textFaint, fontSize: 10 }}>{alt}</Text>
    </View>
  );
}

function Satir({
  ikon,
  baslik,
  alt,
  onPress,
  son,
}: {
  ikon: keyof typeof Ionicons.glyphMap;
  baslik: string;
  alt?: string;
  onPress?: () => void;
  son?: boolean;
}) {
  const renk = useRenkler();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        s.satir,
        !son && { borderBottomColor: renk.hairline, borderBottomWidth: StyleSheet.hairlineWidth },
        pressed && { backgroundColor: renk.cardAlt },
      ]}
    >
      <Ionicons name={ikon} size={20} color={renk.textMuted} />
      <Text style={{ color: renk.text, flex: 1, fontSize: 15, fontWeight: "500" }}>{baslik}</Text>
      {alt && <Text style={{ color: renk.textFaint, fontSize: 13 }}>{alt}</Text>}
      {onPress && <Ionicons name="chevron-forward" size={18} color={renk.textFaint} />}
    </Pressable>
  );
}

const s = StyleSheet.create({
  ust: { flexDirection: "row", alignItems: "center", gap: SP.md },
  istatSira: { flexDirection: "row", gap: SP.sm },
  istat: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: R.md,
    padding: SP.md,
    gap: 2,
  },
  grupBaslik: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5, marginTop: SP.md, marginLeft: 4 },
  satir: { flexDirection: "row", alignItems: "center", gap: SP.md, paddingHorizontal: SP.lg, paddingVertical: 15 },
  cikis: {
    flexDirection: "row",
    gap: SP.sm,
    borderWidth: 1,
    borderRadius: R.md,
    padding: SP.lg,
    alignItems: "center",
    justifyContent: "center",
    marginTop: SP.lg,
  },
});
