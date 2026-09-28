import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useRef } from "react";
import { Animated, BackHandler, Easing, Modal, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Metin as Text } from "@/components/Metin";
import { YuklemeHalkasi } from "@/components/YuklemeHalkasi";
import { golge, R, SP, T, useRenkler } from "@/lib/theme";
import type { Ben } from "@/lib/types";

/**
 * Ekle / Elle gir ekranlarının üstünde duran, günlük kayıt hakkını gösteren küçük
 * rozet. Dokununca `EnerjiSheet` açılır — reklam izleyip ek hak kazanmak ya da
 * Pro'ya geçmek için tek giriş noktası.
 */
export function EnerjiRozeti({ ben, onPress }: { ben?: Ben; onPress: () => void }) {
  const renk = useRenkler();
  if (!ben) return null;

  const pro = ben.plan === "pro";
  const oran = pro ? 0 : Math.min(1, ben.gun_kayit / Math.max(1, ben.gunluk_limit));
  const dolu = !pro && ben.gun_kayit >= ben.gunluk_limit;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.rozet,
        { backgroundColor: renk.card },
        golge(1),
        pressed && { opacity: 0.8 },
      ]}
    >
      <View style={[s.ikonKutu, { backgroundColor: pro ? renk.aksan : dolu ? renk.dangerSoft : renk.aksanSoft }]}>
        <Ionicons
          name={pro ? "star" : "flash"}
          size={16}
          color={pro ? renk.aksanUstu : dolu ? renk.danger : renk.aksan}
        />
      </View>
      <View style={s.metinSar}>
        <Text style={{ color: renk.text, fontSize: 13, fontWeight: "700" }}>
          {pro ? "Sınırsız kayıt hakkı" : `Bugün ${ben.gun_kayit}/${ben.gunluk_limit} kayıt hakkı`}
        </Text>
        {!pro && (
          <View style={[s.bar, { backgroundColor: renk.border }]}>
            <View
              style={[
                s.barDolu,
                { backgroundColor: dolu ? renk.danger : renk.aksan, width: `${oran * 100}%` },
              ]}
            />
          </View>
        )}
      </View>
      <Ionicons name="chevron-forward" size={16} color={renk.textFaint} />
    </Pressable>
  );
}

/** `EnerjiSheet`'in reklam akışındaki geçici durumu — normal görünümün yerini alır. */
export type EnerjiSheetDurum =
  | null
  | { tip: "yukleniyor"; yazi: string }
  | { tip: "basarili"; yazi: string };

function BasariliGoster({ yazi }: { yazi: string }) {
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
    <View style={s.isleniyor}>
      <Animated.View
        style={[
          s.ikonBuyuk,
          {
            backgroundColor: renk.success + "22",
            opacity: v.interpolate({ inputRange: [0, 0.35], outputRange: [0, 1], extrapolate: "clamp" }),
            transform: [
              { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1], extrapolate: "clamp" }) },
            ],
          },
        ]}
      >
        <Ionicons name="checkmark-circle" size={40} color={renk.success} />
      </Animated.View>
      <Animated.View
        style={{
          opacity: v.interpolate({ inputRange: [0.3, 0.8], outputRange: [0, 1], extrapolate: "clamp" }),
          transform: [
            { translateY: v.interpolate({ inputRange: [0.3, 1], outputRange: [8, 0], extrapolate: "clamp" }) },
          ],
        }}
      >
        <Text style={[T.heading, { color: renk.success, textAlign: "center" }]}>{yazi}</Text>
      </Animated.View>
    </View>
  );
}

/**
 * Alttan yukarı kayan, günlük kayıt hakkı için tek elden panel. Hem proaktif
 * (rozete dokunarak) hem reaktif (kayıt hakkı bitince) aynı bileşen açılır.
 * `durum` doluysa (yükleniyor/başarılı) arka plana dokununca kapanmaz — yanlışlıkla
 * akışı yarıda kesmesin.
 */
export function EnerjiSheet({
  acik,
  onKapat,
  ben,
  reklamGosterilebilir,
  durum,
  onReklamIzle,
  onProGec,
}: {
  acik: boolean;
  onKapat: () => void;
  ben?: Ben;
  reklamGosterilebilir: boolean;
  durum?: EnerjiSheetDurum;
  onReklamIzle: () => void;
  onProGec: () => void;
}) {
  const renk = useRenkler();

  useEffect(() => {
    if (!acik) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!durum) onKapat();
      return true;
    });
    return () => sub.remove();
  }, [acik, durum, onKapat]);

  const pro = ben?.plan === "pro";
  const dolu = !!ben && !pro && ben.gun_kayit >= ben.gunluk_limit;

  return (
    <Modal visible={acik} transparent animationType="slide" onRequestClose={onKapat} statusBarTranslucent>
      <View style={s.kok}>
        <Pressable style={StyleSheet.absoluteFill} onPress={durum ? undefined : onKapat} />
        <View style={s.altSar} pointerEvents="box-none">
          <SafeAreaView
            edges={["bottom"]}
            style={[s.sheet, { backgroundColor: renk.card }]}
          >
            <View style={[s.tutamac, { backgroundColor: renk.border }]} />

            {durum?.tip === "yukleniyor" ? (
              <View style={s.isleniyor}>
                <YuklemeHalkasi boyut={64} yazi={durum.yazi} />
              </View>
            ) : durum?.tip === "basarili" ? (
              <BasariliGoster yazi={durum.yazi} />
            ) : (
              <>
                <View
                  style={[
                    s.ikonBuyuk,
                    { backgroundColor: pro ? renk.aksan : dolu ? renk.dangerSoft : renk.aksanSoft },
                  ]}
                >
                  <Ionicons
                    name={pro ? "star" : dolu ? "battery-dead-outline" : "flash"}
                    size={30}
                    color={pro ? renk.aksanUstu : dolu ? renk.danger : renk.aksan}
                  />
                </View>

                <Text style={[T.title, { color: renk.text, textAlign: "center" }]}>
                  {pro ? "Pro üyesin 🎉" : dolu ? "Kayıt hakkın bitti" : "Kayıt Hakkın"}
                </Text>

                {!!ben && !pro && (
                  <Text style={[T.body, { color: renk.textMuted, textAlign: "center", lineHeight: 21 }]}>
                    Bugün {ben.gun_kayit}/{ben.gunluk_limit} kayıt hakkını kullandın. Reklam izleyerek
                    hemen ek hak kazanabilir ya da Pro'ya geçip sınırı tamamen kaldırabilirsin.
                  </Text>
                )}
                {pro && (
                  <Text style={[T.body, { color: renk.textMuted, textAlign: "center" }]}>
                    Günlük kayıt sınırın yok, istediğin kadar ekleyebilirsin.
                  </Text>
                )}

                {!pro && (
                  <View style={s.butonlar}>
                    {reklamGosterilebilir && (
                      <Pressable
                        onPress={onReklamIzle}
                        style={({ pressed }) => [
                          s.buton,
                          { backgroundColor: renk.aksan },
                          pressed && { opacity: 0.85 },
                        ]}
                      >
                        <Ionicons name="play-circle" size={19} color={renk.aksanUstu} />
                        <Text style={{ color: renk.aksanUstu, fontSize: 15.5, fontWeight: "800" }}>
                          Reklam İzle (+{ben?.reklam_kredi_adet ?? 2} limit)
                        </Text>
                      </Pressable>
                    )}
                    <Pressable
                      onPress={onProGec}
                      style={({ pressed }) => [
                        s.buton,
                        s.butonIkincil,
                        { borderColor: renk.aksan },
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <Ionicons name="star" size={19} color={renk.aksan} />
                      <Text style={{ color: renk.aksan, fontSize: 15.5, fontWeight: "800" }}>
                        Pro'ya Geç — Sınırsız
                      </Text>
                    </Pressable>
                  </View>
                )}

                <Pressable onPress={onKapat} hitSlop={8} style={s.kapat}>
                  <Text style={{ color: renk.textFaint, fontSize: 13.5, fontWeight: "700" }}>Kapat</Text>
                </Pressable>
              </>
            )}
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  rozet: {
    flexDirection: "row",
    alignItems: "center",
    gap: SP.sm,
    padding: SP.sm,
    borderRadius: R.lg,
  },
  ikonKutu: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  metinSar: { flex: 1, gap: 5 },
  bar: { height: 4, borderRadius: 2, overflow: "hidden" },
  barDolu: { height: 4, borderRadius: 2 },

  kok: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  altSar: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: SP.xl,
    paddingBottom: SP.md,
    alignItems: "center",
    gap: SP.sm,
  },
  tutamac: { width: 40, height: 4, borderRadius: 2, marginTop: SP.sm, marginBottom: SP.sm },
  ikonBuyuk: { width: 68, height: 68, borderRadius: 34, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  isleniyor: { paddingVertical: SP.xxl * 1.4, alignItems: "center", gap: SP.md },
  butonlar: { alignSelf: "stretch", gap: SP.sm, marginTop: SP.md },
  buton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: R.pill,
    paddingVertical: 15,
  },
  butonIkincil: { backgroundColor: "transparent", borderWidth: 1.5 },
  kapat: { paddingVertical: 12, marginTop: 2 },
});
