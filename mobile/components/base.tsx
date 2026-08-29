import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  Pressable,
  type PressableProps,
  RefreshControl,
  ScrollView,
  StyleSheet,
  type TextProps,
  View,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Metin as Text } from "@/components/Metin";
import { kiyas, turkceTutar } from "@/lib/format";
import { golge, R, SP, T, useRenkler } from "@/lib/theme";

/** 0'dan hedefe animasyonlu sayan para metni */
export function Sayac({ deger, sure = 650, style, ...rest }: { deger: number; sure?: number } & TextProps) {
  const [n, setN] = useState(0);
  const bas = useRef<number | null>(null);
  useEffect(() => {
    bas.current = null;
    let raf = 0;
    const adim = (t: number) => {
      if (bas.current === null) bas.current = t;
      const p = Math.min(1, (t - bas.current) / sure);
      setN(deger * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(adim);
    };
    raf = requestAnimationFrame(adim);
    return () => cancelAnimationFrame(raf);
  }, [deger, sure]);
  return (
    <Text style={style} {...rest}>
      {turkceTutar(n)}
    </Text>
  );
}

/** Sarmalayıcı (animasyon kaldırıldı — sadelik) */
export function Beliren({
  children,
  style,
}: {
  children: React.ReactNode;
  sira?: number;
  style?: ViewStyle;
}) {
  return <View style={style}>{children}</View>;
}

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
  const inner = <View style={pad ? s.padli : undefined}>{children}</View>;
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

export function Baslik({ children, alt, sag }: { children: string; alt?: string; sag?: React.ReactNode }) {
  const renk = useRenkler();
  return (
    <View style={s.baslikSatir}>
      <View style={{ flex: 1 }}>
        <Text style={[T.title, { color: renk.text }]}>{children}</Text>
        {alt && <Text style={[T.caption, { color: renk.textFaint, marginTop: 2 }]}>{alt}</Text>}
      </View>
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

export function KartBaslik({ children, ikon, sag }: { children: string; ikon?: keyof typeof Ionicons.glyphMap; sag?: React.ReactNode }) {
  const renk = useRenkler();
  return (
    <View style={s.kartBaslikSatir}>
      {ikon && <Ionicons name={ikon} size={15} color={renk.textFaint} />}
      <Text style={[T.overline, { color: renk.textFaint, flex: 1 }]}>{children}</Text>
      {sag}
    </View>
  );
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
  const ana = renkli || renk.primary;
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
      <Text style={{ color: aktif ? "#fff" : renk.textMuted, fontSize: 12.5, fontWeight: "600" }}>
        {yazi}
      </Text>
    </Pressable>
  );
}

export function Rozet({ yazi, renk: c, ikon }: { yazi: string; renk: string; ikon?: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={[s.rozet, { backgroundColor: c + "22" }]}>
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

export function BasilabilirSatir({
  children,
  style,
  ...rest
}: PressableProps & { children: React.ReactNode; style?: ViewStyle }) {
  return (
    <Pressable style={({ pressed }) => [style as ViewStyle, pressed && { opacity: 0.6 }]} {...rest}>
      {children}
    </Pressable>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  scrollIcerik: { paddingBottom: 48 },
  padli: { paddingHorizontal: SP.lg, paddingTop: SP.sm, gap: SP.md },
  baslikSatir: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: SP.sm,
    paddingBottom: SP.xs,
  },
  kart: { borderRadius: R.lg, padding: SP.lg },
  kartBaslikSatir: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: SP.md },
  bos: { alignItems: "center", justifyContent: "center", paddingVertical: SP.xl, gap: SP.md },
  bosDaire: { width: 60, height: 60, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  iskeletCizgi: { height: 14, borderRadius: 7 },
  seg: { flexDirection: "row", borderRadius: R.pill, padding: 4, gap: 4 },
  segItem: { flex: 1, paddingVertical: 9, borderRadius: R.pill, alignItems: "center" },
  cip: { borderWidth: 1, borderRadius: R.pill, paddingHorizontal: 13, paddingVertical: 7 },
  grupKart: { borderRadius: R.md, overflow: "hidden" },
  ayarSatir: { flexDirection: "row", alignItems: "center", gap: SP.md, paddingHorizontal: SP.lg, paddingVertical: 12 },
  ayarIkon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
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
