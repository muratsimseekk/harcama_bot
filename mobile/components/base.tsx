import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { Metin as Text } from "@/components/Metin";
import { golge, R, SP, T, useRenkler } from "@/lib/theme";

export function Kart({
  children,
  style,
  seviye = 1,
  onPress,
}: {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  seviye?: 1 | 2 | 3;
  onPress?: () => void;
}) {
  const renk = useRenkler();
  const stil = [s.kart, { backgroundColor: renk.card }, golge(seviye), style];
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [stil, pressed && { opacity: 0.8 }]}>
        {children}
      </Pressable>
    );
  }
  return <View style={stil}>{children}</View>;
}

export function Yukleniyor({ yukseklik = 120 }: { yukseklik?: number }) {
  const renk = useRenkler();
  return (
    <View style={{ height: yukseklik, gap: SP.sm, justifyContent: "center" }}>
      <View style={[s.iskeletCizgi, { backgroundColor: renk.cardAlt, width: "55%", height: 26 }]} />
      <View style={[s.iskeletCizgi, { backgroundColor: renk.cardAlt, width: "80%" }]} />
      <View style={[s.iskeletCizgi, { backgroundColor: renk.cardAlt, width: "70%" }]} />
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
      <View style={[s.bosDaire, { backgroundColor: renk.cardAlt }]}>
        <Ionicons name={ikon} size={26} color={renk.textFaint} />
      </View>
      <Text style={[T.body, { color: renk.textMuted, textAlign: "center" }]}>{yazi}</Text>
    </View>
  );
}

/** Hap segmentli seçici (Günlük/Haftalık… veya Kişisel/İşletme/Yatırım). */
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
    <View style={[s.seg, { backgroundColor: renk.cardAlt }]}>
      {secenekler.map((o) => {
        const aktif = o === secili;
        return (
          <Pressable
            key={o}
            onPress={() => onSec(o)}
            style={[s.segItem, kucuk && { paddingVertical: 7 }, aktif && [{ backgroundColor: renk.card }, golge(1)]]}
          >
            <Text
              style={{
                color: aktif ? renk.text : renk.textMuted,
                fontWeight: aktif ? "700" : "600",
                fontSize: kucuk ? 12.5 : 13.5,
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
  const ana = renkli || renk.aksan;
  return (
    <Pressable
      onPress={onPress}
      style={[
        s.cip,
        {
          borderColor: aktif ? ana : renk.border,
          backgroundColor: aktif ? ana : renk.card,
        },
      ]}
    >
      <Text style={{ color: aktif ? renk.aksanUstu : renk.textMuted, fontSize: 12.5, fontWeight: "600" }}>
        {yazi}
      </Text>
    </Pressable>
  );
}

export function IkonDaire({
  ikon,
  renk: c,
  boyut = 40,
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
        borderRadius: boyut * 0.32,
        backgroundColor: c + "22",
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
      {baslik && <Text style={[T.overline, { color: renk.textFaint, marginLeft: SP.xs }]}>{baslik}</Text>}
      <View style={[s.grupKart, { backgroundColor: renk.card }, golge(1)]}>{children}</View>
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
      {ikon && (
        <View style={[s.ayarIkon, { backgroundColor: (tehlike ? renk.danger : renk.textMuted) + "1A" }]}>
          <Ionicons name={ikon} size={17} color={tehlike ? renk.danger : renk.textMuted} />
        </View>
      )}
      <Text style={{ color: anaRenk, flex: 1, fontSize: 15, fontWeight: "600" }}>{baslik}</Text>
      {deger && <Text style={{ color: renk.textFaint, fontSize: 14, fontWeight: "500" }}>{deger}</Text>}
      {sag}
      {onPress && !sag && <Ionicons name="chevron-forward" size={17} color={renk.textFaint} />}
    </Pressable>
  );
}

const s = StyleSheet.create({
  kart: { borderRadius: R.lg, padding: SP.lg },
  bos: { alignItems: "center", justifyContent: "center", paddingVertical: SP.xl, gap: SP.md },
  bosDaire: { width: 60, height: 60, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  iskeletCizgi: { height: 14, borderRadius: 7 },
  seg: { flexDirection: "row", borderRadius: R.pill, padding: 4, gap: 4 },
  segItem: { flex: 1, paddingVertical: 9, borderRadius: R.pill, alignItems: "center" },
  cip: { borderWidth: 1, borderRadius: R.pill, paddingHorizontal: 13, paddingVertical: 7 },
  grupKart: { borderRadius: R.md, overflow: "hidden" },
  ayarSatir: { flexDirection: "row", alignItems: "center", gap: SP.md, paddingHorizontal: SP.lg, paddingVertical: 12 },
  ayarIkon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
});
