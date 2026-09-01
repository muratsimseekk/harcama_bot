import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Metin as Text } from "@/components/Metin";
import { useNotifications } from "@/lib/queries";
import { SP, T, useRenkler } from "@/lib/theme";

/**
 * Sade ekran iskeleti: sıcak krem zemin, üstte geri/başlık/zil satırı, altında
 * doğrudan krem üstünde akan içerik. Yapıyı Kart bileşenleri kurar.
 */
export function EkranBasligi({
  baslik,
  geri = false,
  zil = true,
  onZil,
  ustAlan,
  children,
  onRefresh,
  refreshing = false,
  icerikStil,
  kaydir = true,
}: {
  baslik?: string;
  geri?: boolean;
  zil?: boolean;
  onZil?: () => void;
  ustAlan?: React.ReactNode;
  children: React.ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
  icerikStil?: ViewStyle;
  kaydir?: boolean;
}) {
  const renk = useRenkler();
  const router = useRouter();
  const bildirim = useNotifications();
  const uyariVar =
    zil && (bildirim.data?.bildirimler ?? []).some((b) => b.tur === "uyari");

  const govde = (
    <View style={[s.icerik, !kaydir && s.icerikDolu, icerikStil]}>{children}</View>
  );

  return (
    <View style={[s.kok, { backgroundColor: renk.bg }]}>
      <SafeAreaView edges={["top"]} style={s.ust}>
        {(baslik || geri || zil) && (
          <View style={s.baslikSatir}>
            {geri ? (
              <Pressable onPress={() => router.back()} hitSlop={12}>
                <Ionicons name="chevron-back" size={26} color={renk.text} />
              </Pressable>
            ) : (
              <View style={{ width: 26 }} />
            )}
            <Text style={[T.title, { color: renk.text }]}>{baslik}</Text>
            {zil ? (
              <Pressable
                onPress={onZil ?? (() => router.navigate("/bildirimler"))}
                style={[s.zil, { backgroundColor: renk.cardAlt }]}
                hitSlop={8}
              >
                <Ionicons name="notifications-outline" size={19} color={renk.text} />
                {uyariVar && <View style={[s.nokta, { backgroundColor: renk.danger, borderColor: renk.bg }]} />}
              </Pressable>
            ) : (
              <View style={{ width: 36 }} />
            )}
          </View>
        )}
        {ustAlan && <View style={s.ustAlan}>{ustAlan}</View>}
      </SafeAreaView>

      <View style={[s.govde, { borderTopColor: renk.hairline }]}>
        {kaydir ? (
          <ScrollView
            contentContainerStyle={s.scroll}
            showsVerticalScrollIndicator={false}
            refreshControl={
              onRefresh ? (
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={renk.aksan} />
              ) : undefined
            }
          >
            {govde}
          </ScrollView>
        ) : (
          <View style={{ flex: 1 }}>{govde}</View>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  kok: { flex: 1 },
  ust: { paddingHorizontal: SP.lg },
  baslikSatir: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: SP.sm,
  },
  zil: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  nokta: { position: "absolute", top: 6, right: 6, width: 9, height: 9, borderRadius: 5, borderWidth: 1.5 },
  ustAlan: { paddingBottom: SP.md },
  govde: { flex: 1, borderTopWidth: StyleSheet.hairlineWidth },
  scroll: { paddingBottom: 40 },
  icerik: { padding: SP.lg, gap: SP.md },
  icerikDolu: { flex: 1 },
});
