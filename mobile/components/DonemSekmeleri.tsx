import { Pressable, StyleSheet, View } from "react-native";
import { Metin as Text } from "@/components/Metin";
import { golge, R, useRenkler } from "@/lib/theme";

/** FinWise Günlük/Haftalık/Aylık/Yıllık hap segment */
export function DonemSekmeleri<T extends string>({
  secenekler,
  etiket,
  secili,
  onSec,
}: {
  secenekler: readonly T[];
  etiket: (t: T) => string;
  secili: T;
  onSec: (t: T) => void;
}) {
  const renk = useRenkler();
  return (
    <View style={[s.kap, { backgroundColor: renk.greenSoft }]}>
      {secenekler.map((o) => {
        const aktif = o === secili;
        return (
          <Pressable
            key={o}
            onPress={() => onSec(o)}
            style={[s.oge, aktif && [{ backgroundColor: renk.green }, golge(1)]]}
          >
            <Text style={{ color: renk.text, fontSize: 13.5, fontWeight: aktif ? "700" : "500" }}>
              {etiket(o)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  kap: { flexDirection: "row", borderRadius: R.pill, padding: 5 },
  oge: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: R.pill },
});
