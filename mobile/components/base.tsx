import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Pressable,
  type PressableProps,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  type TextStyle,
  View,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { kiyas } from "@/lib/format";
import { golge, R, SP, useRenkler } from "@/lib/theme";

/** Sayfa iskeleti: SafeAreaView + kaydırılabilir içerik + opsiyonel yenileme. */
export function Ekran({
  children,
  onRefresh,
  refreshing = false,
  scroll = true,
  pad = true,
}: {
  children: React.ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
  scroll?: boolean;
  pad?: boolean;
}) {
  const renk = useRenkler();
  const inner = (
    <View style={pad ? s.padli : undefined}>{children}</View>
  );
  return (
    <SafeAreaView style={[s.safe, { backgroundColor: renk.bg }]} edges={["top"]}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={s.scrollIcerik}
          showsVerticalScrollIndicator={false}
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={renk.primary} />
            ) : undefined
          }
        >
          {inner}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>{inner}</View>
      )}
    </SafeAreaView>
  );
}

export function Baslik({ children, sag }: { children: string; sag?: React.ReactNode }) {
  const renk = useRenkler();
  return (
    <View style={s.baslikSatir}>
      <Text style={[s.baslik, { color: renk.text }]}>{children}</Text>
      {sag}
    </View>
  );
}

export function Kart({
  children,
  style,
  seviye = 1,
  onPress,
}: {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  seviye?: 1 | 2;
  onPress?: () => void;
}) {
  const renk = useRenkler();
  const stil = [
    s.kart,
    { backgroundColor: renk.card, borderColor: renk.border },
    golge(seviye),
    style,
  ];
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [stil, pressed && { opacity: 0.7 }]}>
        {children}
      </Pressable>
    );
  }
  return <View style={stil}>{children}</View>;
}

export function KartBaslik({ children, ikon }: { children: string; ikon?: keyof typeof Ionicons.glyphMap }) {
  const renk = useRenkler();
  return (
    <View style={s.kartBaslikSatir}>
      {ikon && <Ionicons name={ikon} size={16} color={renk.textMuted} />}
      <Text style={[s.kartBaslik, { color: renk.textMuted }]}>{children}</Text>
    </View>
  );
}

export function Yukleniyor({ yukseklik = 120 }: { yukseklik?: number }) {
  const renk = useRenkler();
  return (
    <View style={{ height: yukseklik, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator color={renk.primary} />
    </View>
  );
}

export function BosDurum({
  ikon = "documents-outline",
  yazi,
}: {
  ikon?: keyof typeof Ionicons.glyphMap;
  yazi: string;
}) {
  const renk = useRenkler();
  return (
    <View style={s.bos}>
      <Ionicons name={ikon} size={34} color={renk.textFaint} />
      <Text style={[s.bosYazi, { color: renk.textMuted }]}>{yazi}</Text>
    </View>
  );
}

export function Sekmeli<T extends string>({
  secenekler,
  etiket,
  secili,
  onSec,
  kucuk = false,
}: {
  secenekler: readonly T[];
  etiket: (t: T) => string;
  secili: T;
  onSec: (t: T) => void;
  kucuk?: boolean;
}) {
  const renk = useRenkler();
  return (
    <View style={[s.seg, { backgroundColor: renk.cardAlt, borderColor: renk.border }]}>
      {secenekler.map((o) => {
        const aktif = o === secili;
        return (
          <Pressable
            key={o}
            onPress={() => onSec(o)}
            style={[
              s.segItem,
              kucuk && { paddingVertical: 6 },
              aktif && [{ backgroundColor: renk.card }, golge(1)],
            ]}
          >
            <Text
              style={{
                color: aktif ? renk.text : renk.textMuted,
                fontWeight: aktif ? "700" : "500",
                fontSize: kucuk ? 12 : 13,
              }}
            >
              {etiket(o)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Cip({
  yazi,
  aktif,
  renkli,
  onPress,
}: {
  yazi: string;
  aktif: boolean;
  renkli?: string;
  onPress: () => void;
}) {
  const renk = useRenkler();
  const ana = renkli || renk.primary;
  return (
    <Pressable
      onPress={onPress}
      style={[
        s.cip,
        {
          borderColor: aktif ? ana : renk.border,
          backgroundColor: aktif ? ana : "transparent",
        },
      ]}
    >
      <Text style={{ color: aktif ? "#fff" : renk.textMuted, fontSize: 12.5, fontWeight: "600" }}>
        {yazi}
      </Text>
    </Pressable>
  );
}

export function Rozet({ yazi, renk: c, ikon }: { yazi: string; renk: string; ikon?: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={[s.rozet, { backgroundColor: c + "1F" }]}>
      {ikon && <Ionicons name={ikon} size={12} color={c} />}
      <Text style={{ color: c, fontSize: 12, fontWeight: "700" }}>{yazi}</Text>
    </View>
  );
}

export function KiyasRozet({ bu, onceki }: { bu: number; onceki: number }) {
  const renk = useRenkler();
  const { yazi, yon } = kiyas(bu, onceki);
  if (yon === 0 && yazi === "—") return null;
  const c = yon === 1 ? renk.danger : yon === -1 ? renk.success : renk.textMuted;
  const ikon = yon === 1 ? "trending-up" : yon === -1 ? "trending-down" : "remove";
  return <Rozet yazi={`${yazi} geçen döneme göre`} renk={c} ikon={ikon} />;
}

export function IkonDaire({
  ikon,
  renk: c,
  boyut = 38,
}: {
  ikon: keyof typeof Ionicons.glyphMap;
  renk: string;
  boyut?: number;
}) {
  return (
    <View
      style={{
        width: boyut,
        height: boyut,
        borderRadius: boyut / 2,
        backgroundColor: c + "1F",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ionicons name={ikon} size={boyut * 0.5} color={c} />
    </View>
  );
}

export function AyarGrup({ baslik, children }: { baslik?: string; children: React.ReactNode }) {
  const renk = useRenkler();
  return (
    <View style={{ gap: SP.sm }}>
      {baslik && <Text style={[s.grupBaslik, { color: renk.textFaint }]}>{baslik}</Text>}
      <View
        style={[
          s.grupKart,
          { backgroundColor: renk.card, borderColor: renk.border },
          golge(1),
        ]}
      >
        {children}
      </View>
    </View>
  );
}

export function AyarSatir({
  ikon,
  baslik,
  deger,
  onPress,
  son,
  tehlike,
  sag,
}: {
  ikon?: keyof typeof Ionicons.glyphMap;
  baslik: string;
  deger?: string;
  onPress?: () => void;
  son?: boolean;
  tehlike?: boolean;
  sag?: React.ReactNode;
}) {
  const renk = useRenkler();
  const anaRenk = tehlike ? renk.danger : renk.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        s.ayarSatir,
        !son && { borderBottomColor: renk.hairline, borderBottomWidth: StyleSheet.hairlineWidth },
        pressed && onPress ? { backgroundColor: renk.cardAlt } : null,
      ]}
    >
      {ikon && <Ionicons name={ikon} size={20} color={tehlike ? renk.danger : renk.textMuted} />}
      <Text style={{ color: anaRenk, flex: 1, fontSize: 15, fontWeight: "500" }}>{baslik}</Text>
      {deger && <Text style={{ color: renk.textFaint, fontSize: 14 }}>{deger}</Text>}
      {sag}
      {onPress && !sag && <Ionicons name="chevron-forward" size={18} color={renk.textFaint} />}
    </Pressable>
  );
}

export function BasilabilirSatir({
  children,
  style,
  ...rest
}: PressableProps & { children: React.ReactNode; style?: ViewStyle }) {
  return (
    <Pressable
      style={({ pressed }) => [style as ViewStyle, pressed && { opacity: 0.6 }]}
      {...rest}
    >
      {children}
    </Pressable>
  );
}

export const yazi = StyleSheet.create({
  buyukSayi: { fontSize: 34, fontWeight: "800", letterSpacing: -0.5 } as TextStyle,
  ortaSayi: { fontSize: 18, fontWeight: "700" } as TextStyle,
});

const s = StyleSheet.create({
  safe: { flex: 1 },
  scrollIcerik: { paddingBottom: 40 },
  padli: { paddingHorizontal: SP.lg, paddingTop: SP.md, gap: SP.md },
  baslikSatir: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: SP.sm,
    paddingBottom: SP.xs,
  },
  baslik: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  kart: { borderWidth: StyleSheet.hairlineWidth, borderRadius: R.lg, padding: SP.lg },
  kartBaslikSatir: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: SP.md },
  kartBaslik: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  bos: { alignItems: "center", justifyContent: "center", paddingVertical: SP.xl, gap: SP.sm },
  bosYazi: { fontSize: 14 },
  seg: { flexDirection: "row", borderRadius: R.md, borderWidth: StyleSheet.hairlineWidth, padding: 4, gap: 4 },
  segItem: { flex: 1, paddingVertical: 8, borderRadius: R.sm, alignItems: "center" },
  cip: {
    borderWidth: 1,
    borderRadius: R.pill,
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  grupBaslik: { fontSize: 11, fontWeight: "700", letterSpacing: 0.6, marginLeft: 4 },
  grupKart: { borderWidth: StyleSheet.hairlineWidth, borderRadius: R.md, overflow: "hidden" },
  ayarSatir: {
    flexDirection: "row",
    alignItems: "center",
    gap: SP.md,
    paddingHorizontal: SP.lg,
    paddingVertical: 14,
  },
  rozet: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: R.pill,
  },
});
