import * as Linking from "expo-linking";
import { useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, StyleSheet } from "react-native";
import { Metin as Text } from "@/components/Metin";
import { SP, useRenkler } from "@/lib/theme";
import { GIZLILIK_METNI, KOSULLAR_METNI, YASAL_URL } from "@/lib/yasal";

export default function Yasal() {
  const renk = useRenkler();
  const { belge } = useLocalSearchParams<{ belge?: string }>();
  const kosullar = belge === "kosullar";
  const metin = kosullar ? KOSULLAR_METNI : GIZLILIK_METNI;
  const url = kosullar ? YASAL_URL.kosullar : YASAL_URL.gizlilik;

  return (
    <ScrollView style={{ backgroundColor: renk.bg }} contentContainerStyle={s.icerik}>
      <Text style={{ color: renk.text, fontSize: 14, lineHeight: 21 }}>{metin}</Text>
      <Pressable onPress={() => Linking.openURL(url)} style={{ paddingVertical: SP.md }}>
        <Text style={{ color: renk.aksan, fontSize: 13, fontWeight: "700" }}>
          Güncel sürümü web'de aç →
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  icerik: { padding: SP.lg, paddingBottom: 60 },
});
