import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Metin as Text } from "@/components/Metin";
import { R, SP, useRenkler } from "@/lib/theme";

/**
 * Ekranın altında birkaç saniye görünen bildirim çubuğu ("Kayıt silindi · Geri al").
 * Her yerden `altBildirim({...})` ile çağrılır; kökte tek <AltBildirim /> durur.
 */
export type AltBildirimIcerik = {
  mesaj: string;
  ikon?: keyof typeof Ionicons.glyphMap;
  eylem?: { yazi: string; onPress: () => void | Promise<void> };
  sure?: number; // ms
};

type Durum = (AltBildirimIcerik & { no: number }) | null;

let durum: Durum = null;
let sayac = 0;
const dinleyiciler = new Set<() => void>();
const yayinla = () => dinleyiciler.forEach((f) => f());

export function altBildirim(icerik: AltBildirimIcerik) {
  durum = { ...icerik, no: ++sayac };
  yayinla();
}

function kapat(no: number) {
  if (durum?.no === no) {
    durum = null;
    yayinla();
  }
}

function abone(f: () => void) {
  dinleyiciler.add(f);
  return () => {
    dinleyiciler.delete(f);
  };
}

/** Alt sekme çubuğunun üstünde kalsın diye (AltNav ~ 64 + güvenli alan). */
const ALT_BOSLUK = 84;

export function AltBildirim() {
  const renk = useRenkler();
  const ins = useSafeAreaInsets();
  const d = useSyncExternalStore(abone, () => durum, () => durum);
  const gorunurluk = useRef(new Animated.Value(0)).current;
  const sonIcerik = useRef<Durum>(null);
  if (d) sonIcerik.current = d;
  const g = sonIcerik.current;

  useEffect(() => {
    Animated.timing(gorunurluk, { toValue: d ? 1 : 0, duration: 200, useNativeDriver: true }).start();
    if (!d) return;
    const t = setTimeout(() => kapat(d.no), d.sure ?? 5000);
    return () => clearTimeout(t);
  }, [d, gorunurluk]);

  if (!g) return null;
  return (
    <Animated.View
      pointerEvents={d ? "box-none" : "none"}
      style={[
        s.sar,
        { bottom: ALT_BOSLUK + ins.bottom },
        {
          opacity: gorunurluk,
          transform: [{ translateY: gorunurluk.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
        },
      ]}
    >
      <View style={[s.cubuk, { backgroundColor: renk.text }]}>
        {g.ikon && <Ionicons name={g.ikon} size={18} color={renk.bg} />}
        <Text style={[s.mesaj, { color: renk.bg }]} numberOfLines={2}>
          {g.mesaj}
        </Text>
        {g.eylem && (
          <Pressable
            hitSlop={10}
            onPress={async () => {
              const e = g.eylem!;
              kapat(g.no);
              await e.onPress();
            }}
            style={s.eylem}
          >
            <Text style={{ color: renk.aksan, fontWeight: "800", fontSize: 14.5 }}>{g.eylem.yazi}</Text>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  sar: { position: "absolute", left: SP.lg, right: SP.lg, alignItems: "center", zIndex: 1000, elevation: 20 },
  cubuk: {
    flexDirection: "row",
    alignItems: "center",
    gap: SP.sm,
    alignSelf: "stretch",
    borderRadius: R.md,
    paddingLeft: SP.lg,
    paddingRight: SP.sm,
    minHeight: 50,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  mesaj: { flex: 1, fontSize: 14, fontWeight: "600", paddingVertical: SP.sm },
  eylem: { paddingHorizontal: SP.md, paddingVertical: SP.sm },
});
