import Ionicons from "@expo/vector-icons/Ionicons";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { Metin as Text } from "@/components/Metin";
import { YuklemeHalkasi } from "@/components/YuklemeHalkasi";
import { SP, useRenkler } from "@/lib/theme";

/**
 * Kaydetme/silme gibi işlemler sırasında ekranı kaplayan geri bildirim katmanı:
 * önce "bekleyen" (dönen halka), iş bitince kısa bir "başarılı" onayı.
 * Hata durumunda katman kapanır — çağıran gerçek hata mesajını `useUyari` ile gösterir.
 */

export const BASARI_MS = 700;

export type KatmanDurum = null | { tip: "bekleyen" | "basari"; yazi: string };

export function useIslemKatmani() {
  const [durum, setDurum] = useState<KatmanDurum>(null);

  /** İşi çalıştırır, başarıda onayı gösterip `sonra`yı çağırır. Hata olduğu gibi fırlar. */
  const calistir = useCallback(
    async (o: { bekleyen: string; basarili: string; is: () => Promise<unknown>; sonra?: () => void }) => {
      setDurum({ tip: "bekleyen", yazi: o.bekleyen });
      try {
        await o.is();
      } catch (e) {
        setDurum(null);
        throw e;
      }
      setDurum({ tip: "basari", yazi: o.basarili });
      await new Promise((r) => setTimeout(r, BASARI_MS));
      setDurum(null);
      o.sonra?.();
    },
    [],
  );

  return { durum, calistir };
}

export function IslemKatmani({ durum }: { durum: KatmanDurum }) {
  const renk = useRenkler();
  if (!durum) return null;

  return (
    <View style={[s.katman, { backgroundColor: renk.bg + "F2" }]}>
      {durum.tip === "bekleyen" ? (
        <YuklemeHalkasi yazi={durum.yazi} />
      ) : (
        <BasariIsareti yazi={durum.yazi} />
      )}
    </View>
  );
}

function BasariIsareti({ yazi }: { yazi: string }) {
  const renk = useRenkler();
  const v = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    v.setValue(0);
    const a = Animated.timing(v, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.back(2)),
      useNativeDriver: true,
    });
    a.start();
    return () => a.stop();
  }, [v]);

  return (
    <View style={s.basari}>
      <Animated.View
        style={[
          s.daire,
          {
            backgroundColor: renk.success + "22",
            opacity: v.interpolate({ inputRange: [0, 0.35], outputRange: [0, 1], extrapolate: "clamp" }),
            transform: [
              { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1], extrapolate: "clamp" }) },
            ],
          },
        ]}
      >
        <Ionicons name="checkmark" size={40} color={renk.success} />
      </Animated.View>
      <Animated.View
        style={{
          opacity: v.interpolate({ inputRange: [0.3, 0.8], outputRange: [0, 1], extrapolate: "clamp" }),
          transform: [
            { translateY: v.interpolate({ inputRange: [0.3, 1], outputRange: [8, 0], extrapolate: "clamp" }) },
          ],
        }}
      >
        <Text style={[s.yazi, { color: renk.textMuted }]}>{yazi}</Text>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  katman: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  basari: { alignItems: "center", gap: SP.lg },
  daire: { width: 76, height: 76, borderRadius: 38, alignItems: "center", justifyContent: "center" },
  yazi: { fontSize: 11, fontWeight: "700", letterSpacing: 2.4, textTransform: "uppercase" },
});
