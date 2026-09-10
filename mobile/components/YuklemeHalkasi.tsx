import { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { Metin as Text } from "@/components/Metin";
import { SP, useRenkler } from "@/lib/theme";

/**
 * Tam ekran / boş alan yüklenme göstergesi: iç içe dönen halkalar + yörünge noktası.
 *
 * Not: Kart içindeki içerik yüklenirken `Yukleniyor` (iskelet çizgiler) tercih edilir —
 * iskelet düzeni gösterdiği için daha hızlı hissettirir. Bu bileşen ekranın tamamı
 * boşken (ilk açılış, hane, bildirimler, paywall) kullanılır.
 */

const DONGU = ["Yükleniyor", "Veriler alınıyor", "Eşitleniyor", "İşleniyor", "Hazırlanıyor"];
const ILK_YAZI = "Başlatılıyor";

/** Sonsuz dönüş — native driver ile, JS thread'i meşgul etmez. */
function useDonus(sure: number, ters = false) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.loop(
      Animated.timing(v, {
        toValue: 1,
        duration: sure,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    a.start();
    return () => {
      a.stop();
      v.setValue(0);
    };
  }, [sure, v]);
  return v.interpolate({
    inputRange: [0, 1],
    outputRange: ters ? ["360deg", "0deg"] : ["0deg", "360deg"],
  });
}

/** Yumuşak nefes alma — parıltı ve merkez nokta için. */
function useNabiz(sure = 1600) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: sure / 2, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: sure / 2, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    a.start();
    return () => {
      a.stop();
      v.setValue(0);
    };
  }, [sure, v]);
  return v;
}

export function YuklemeHalkasi({
  boyut = 80,
  yazi,
  yukseklik,
}: {
  /** Halka çapı (px). */
  boyut?: number;
  /** Sabit metin. Verilmezse metin döngüye girer; `""` verilirse metin gizlenir. */
  yazi?: string;
  /** Kapsayıcı minimum yüksekliği. */
  yukseklik?: number;
}) {
  const renk = useRenkler();
  const [donguYazi, setDonguYazi] = useState(ILK_YAZI);

  const sabitYazi = yazi !== undefined;
  useEffect(() => {
    if (sabitYazi) return;
    let i = -1;
    const t = setInterval(() => {
      i = (i + 1) % DONGU.length;
      setDonguYazi(DONGU[i]);
    }, 1100);
    return () => clearInterval(t);
  }, [sabitYazi]);

  const anaDonus = useDonus(2000);
  const tersDonus = useDonus(3000, true);
  const hizliDonus = useDonus(1000);
  const yorunge = useDonus(4000);
  const disHalka = useDonus(10000);
  const nabiz = useNabiz();

  const nabizOpaklik = nabiz.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.9] });
  const nabizOlcek = nabiz.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.15] });

  const gosterilenYazi = sabitYazi ? yazi : donguYazi;
  const kenar = Math.max(2, Math.round(boyut * 0.032));
  const nokta = Math.max(4, Math.round(boyut * 0.055));

  return (
    <View style={[s.kap, yukseklik ? { minHeight: yukseklik } : null]}>
      <View style={{ width: boyut, height: boyut, alignItems: "center", justifyContent: "center" }}>
        {/* Parıltı — RN'de CSS blur yok, geniş ve soluk daireyle yaklaşıklanıyor */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: boyut,
              backgroundColor: renk.aksan,
              opacity: nabiz.interpolate({ inputRange: [0, 1], outputRange: [0.06, 0.14] }),
              transform: [{ scale: nabizOlcek }],
            },
          ]}
        />

        {/* Dış halka — yavaş, çok soluk */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            s.halka,
            {
              borderWidth: 1,
              borderColor: renk.aksan,
              borderRadius: boyut,
              opacity: 0.18,
              transform: [{ rotate: disHalka }],
            },
          ]}
        />

        {/* Ana yay — üst kenar */}
        <Animated.View
          style={[
            s.halka,
            {
              position: "absolute",
              inset: boyut * 0.05,
              borderWidth: kenar,
              borderColor: "transparent",
              borderTopColor: renk.aksan,
              borderRadius: boyut,
              transform: [{ rotate: anaDonus }],
            },
          ]}
        />

        {/* Ters yay — alt kenar */}
        <Animated.View
          style={[
            s.halka,
            {
              position: "absolute",
              inset: boyut * 0.16,
              borderWidth: kenar,
              borderColor: "transparent",
              borderBottomColor: renk.aksan,
              borderRadius: boyut,
              opacity: 0.55,
              transform: [{ rotate: tersDonus }],
            },
          ]}
        />

        {/* İç hızlı yay — sol kenar */}
        <Animated.View
          style={[
            s.halka,
            {
              position: "absolute",
              inset: boyut * 0.27,
              borderWidth: Math.max(1.5, kenar - 1),
              borderColor: "transparent",
              borderLeftColor: renk.aksan,
              borderRadius: boyut,
              opacity: 0.38,
              transform: [{ rotate: hizliDonus }],
            },
          ]}
        />

        {/* Yörünge noktası */}
        <Animated.View
          style={[StyleSheet.absoluteFill, { transform: [{ rotate: yorunge }] }]}
          pointerEvents="none"
        >
          <View
            style={{
              position: "absolute",
              top: 0,
              left: boyut / 2 - nokta / 2,
              width: nokta,
              height: nokta,
              borderRadius: nokta,
              backgroundColor: renk.aksan,
            }}
          />
        </Animated.View>

        {/* Merkez çekirdek */}
        <Animated.View
          style={{
            width: nokta + 2,
            height: nokta + 2,
            borderRadius: nokta,
            backgroundColor: renk.aksan,
            opacity: nabizOpaklik,
          }}
        />
      </View>

      {gosterilenYazi !== "" && (
        <Text style={[s.yazi, { color: renk.textFaint }]}>{gosterilenYazi}</Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  kap: { alignItems: "center", justifyContent: "center", gap: SP.lg, paddingVertical: SP.lg },
  halka: { borderStyle: "solid" },
  yazi: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2.4,
    textTransform: "uppercase",
  },
});
