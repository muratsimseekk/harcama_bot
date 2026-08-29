import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";
import { Metin as Text } from "@/components/Metin";
import { kategoriIkon } from "@/lib/kategoriIkon";
import { R, SP, useRenkler } from "@/lib/theme";

/** FinWise kategori kutucuğu: mavi yuvarlak-kare ikon + altında etiket (3 sütun grid) */
export function KategoriKutucuk({
  ad,
  renkli,
  vurgu = false,
  ekle = false,
  onPress,
}: {
  ad: string;
  renkli?: string | null;
  vurgu?: boolean;
  ekle?: boolean;
  onPress?: () => void;
}) {
  const renk = useRenkler();
  const zemin = ekle ? renk.blueSoft : renkli || (vurgu ? renk.blue : renk.blueSoft);
  return (
    <Pressable onPress={onPress} style={s.kap}>
      <View style={[s.kutu, { backgroundColor: zemin }]}>
        <Ionicons name={ekle ? "add" : kategoriIkon(ad)} size={34} color="#FFFFFF" />
      </View>
      <Text style={[s.ad, { color: renk.text }]} numberOfLines={1}>
        {ekle ? "Yeni" : ad}
      </Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  kap: { alignItems: "center", gap: SP.sm, width: "31%" },
  kutu: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: R.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  ad: { fontSize: 13.5, fontWeight: "600" },
});
