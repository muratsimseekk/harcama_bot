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
import { R, SP, T, useRenkler } from "@/lib/theme";

/**
 * FinWise ekran iskeleti: üstte yeşil başlık alanı → altta mint içerik büyük
 * üst-yarıçaplı eğriyle başlar.
 */
export function EkranBasligi({
  baslik,
  geri = false,
  zil = true,
  onZil,
  yesilAlan,
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
  yesilAlan?: React.ReactNode;
  children: React.ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
  icerikStil?: ViewStyle;
  kaydir?: boolean;
}) {
  const renk = useRenkler();
  const router = useRouter();

  const govde = <View style={[s.icerik, icerikStil]}>{children}</View>;

  return (
    <View style={[s.kok, { backgroundColor: renk.green }]}>
      <SafeAreaView edges={["top"]} style={s.ust}>
        {(baslik || geri || zil) && (
          <View style={s.baslikSatir}>
            {geri ? (
              <Pressable onPress={() => router.back()} hitSlop={12}>
                <Ionicons name="chevron-back" size={26} color={renk.onGreen} />
              </Pressable>
            ) : (
              <View style={{ width: 26 }} />
            )}
            <Text style={[T.title, { color: renk.onGreen }]}>{baslik}</Text>
            {zil ? (
              <Pressable
                onPress={onZil ?? (() => router.navigate("/bildirimler"))}
                style={[s.zil, { backgroundColor: renk.greenSoft }]}
                hitSlop={8}
              >
                <Ionicons name="notifications-outline" size={19} color={renk.text} />
              </Pressable>
            ) : (
              <View style={{ width: 36 }} />
            )}
          </View>
        )}
        {yesilAlan}
      </SafeAreaView>

      <View style={[s.mint, { backgroundColor: renk.bg }]}>
        {kaydir ? (
          <ScrollView
            contentContainerStyle={s.scroll}
            showsVerticalScrollIndicator={false}
            refreshControl={
              onRefresh ? (
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={renk.green} />
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
  mint: {
    flex: 1,
    borderTopLeftRadius: R.xl,
    borderTopRightRadius: R.xl,
    marginTop: SP.md,
    overflow: "hidden",
  },
  scroll: { paddingBottom: 40 },
  icerik: { padding: SP.lg, gap: SP.md },
});
