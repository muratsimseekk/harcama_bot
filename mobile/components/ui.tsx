import { Pressable, StyleSheet, Text, View } from "react-native";
import { kiyas } from "@/lib/format";
import { useRenkler } from "@/lib/theme";

export function Segment<T extends string>({
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
    <View style={[s.seg, { backgroundColor: renk.bg, borderColor: renk.border }]}>
      {secenekler.map((o) => {
        const aktif = o === secili;
        return (
          <Pressable
            key={o}
            onPress={() => onSec(o)}
            style={[s.segItem, aktif && { backgroundColor: renk.primary }]}
          >
            <Text style={{ color: aktif ? "#fff" : renk.textMuted, fontWeight: "600", fontSize: 13 }}>
              {etiket(o)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Kart({ children, style }: { children: React.ReactNode; style?: object }) {
  const renk = useRenkler();
  return (
    <View style={[s.kart, { backgroundColor: renk.card, borderColor: renk.border }, style]}>
      {children}
    </View>
  );
}

export function KiyasRozet({ bu, onceki }: { bu: number; onceki: number }) {
  const renk = useRenkler();
  const { yazi, yon } = kiyas(bu, onceki);
  const c = yon === 1 ? renk.danger : yon === -1 ? renk.success : renk.textMuted;
  return (
    <View style={[s.rozet, { backgroundColor: c + "22" }]}>
      <Text style={{ color: c, fontSize: 12, fontWeight: "700" }}>
        {yazi} {yon !== 0 ? "geçen döneme göre" : ""}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  seg: { flexDirection: "row", borderRadius: 10, borderWidth: 1, padding: 3, gap: 3 },
  segItem: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center" },
  kart: { borderWidth: 1, borderRadius: 14, padding: 14 },
  rozet: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
});
