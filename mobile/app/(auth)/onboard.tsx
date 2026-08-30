import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { Dimensions, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { onboardTamamla } from "@/app/_layout";
import { Metin as Text } from "@/components/Metin";
import { R, SP, T, useRenkler } from "@/lib/theme";

const { width } = Dimensions.get("window");

const SLAYTLAR = [
  { ikon: "wallet-outline" as const, baslik: "Harcama Yöneticine\nHoş Geldin", metin: "Gelir ve giderlerini tek yerde, zahmetsizce takip et." },
  { ikon: "mic-outline" as const, baslik: "Konuş, Gerisini\nBırak", metin: "“Market 250, dün benzin 600” de — yapay zeka tutarı, kategoriyi ve tarihi ayıklasın." },
  { ikon: "flag-outline" as const, baslik: "Hedeflerine\nUlaş", metin: "Aylık bütçe ve yatırım hedefi koy; sınıra yaklaşınca sana haber verelim." },
];

export default function Onboard() {
  const renk = useRenkler();
  const router = useRouter();
  const ref = useRef<ScrollView>(null);
  const [i, setI] = useState(0);

  function ileri() {
    if (i < SLAYTLAR.length - 1) {
      ref.current?.scrollTo({ x: (i + 1) * width, animated: true });
    } else {
      onboardTamamla().then(() => router.replace("/(auth)/giris"));
    }
  }

  return (
    <View style={[s.kok, { backgroundColor: renk.bg }]}>
      <SafeAreaView edges={["top"]} style={s.ust}>
        <Text style={[T.title, { color: renk.text, textAlign: "center" }]}>
          {SLAYTLAR[i].baslik}
        </Text>
      </SafeAreaView>

      <View style={[s.mint, { backgroundColor: renk.bg }]}>
        <ScrollView
          ref={ref}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setI(Math.round(e.nativeEvent.contentOffset.x / width))}
        >
          {SLAYTLAR.map((sl, k) => (
            <View key={k} style={[s.slayt, { width }]}>
              <View style={[s.gorsel, { backgroundColor: renk.aksanSoft }]}>
                <Ionicons name={sl.ikon} size={92} color={renk.aksan} />
              </View>
              <Text style={[s.metin, { color: renk.textMuted }]}>{sl.metin}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={s.alt}>
          <Pressable onPress={ileri}>
            <Text style={[s.ileri, { color: renk.text }]}>
              {i === SLAYTLAR.length - 1 ? "Başla" : "İleri"}
            </Text>
          </Pressable>
          <View style={s.noktalar}>
            {SLAYTLAR.map((_, k) => (
              <View
                key={k}
                style={[s.nokta, { backgroundColor: k === i ? renk.aksan : renk.border }]}
              />
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  kok: { flex: 1 },
  ust: { paddingHorizontal: SP.xl, paddingVertical: SP.xxl, justifyContent: "center" },
  mint: { flex: 1.6, borderTopLeftRadius: R.xl, borderTopRightRadius: R.xl },
  slayt: { alignItems: "center", justifyContent: "center", padding: SP.xl, gap: SP.xl },
  gorsel: { width: 220, height: 220, borderRadius: 110, alignItems: "center", justifyContent: "center" },
  metin: { fontSize: 15, textAlign: "center", lineHeight: 22, maxWidth: 300 },
  alt: { alignItems: "center", gap: SP.lg, paddingBottom: SP.xxl },
  ileri: { fontSize: 22, fontWeight: "700" },
  noktalar: { flexDirection: "row", gap: 8 },
  nokta: { width: 10, height: 10, borderRadius: 5 },
});
