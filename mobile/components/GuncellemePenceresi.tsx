import Ionicons from "@expo/vector-icons/Ionicons";
import * as Application from "expo-application";
import { useEffect, useRef, useState } from "react";
import { AppState, Linking, Modal, Platform, StyleSheet, View } from "react-native";
import { Buton } from "@/components/Buton";
import { Metin as Text } from "@/components/Metin";
import { api } from "@/lib/api";
import { golge, R, SP, T, useRenkler } from "@/lib/theme";

const PAKET = "com.paraizi.app";
// Arka planda bu kadar kalıp dönen uygulama "yeniden açılmış" sayılır → bir kez daha sorulur.
const YENIDEN_ACILIS_MS = 30 * 60 * 1000;

/**
 * Açılışta mağazada daha yeni bir build varsa (sunucu `/v1/surum`) ekranın büyük kısmını
 * kaplayan "Yeni güncelleme var" penceresi. "Daha sonra" yalnız bu açılış için kapatır —
 * uygulama her yeni açılışta (soğuk başlangıç ya da 30 dk+ arka plandan dönüş) bir kez
 * daha sorar. Sunucuya ulaşılamazsa sessizce gösterilmez.
 */
export function GuncellemePenceresi() {
  const renk = useRenkler();
  const [acik, setAcik] = useState(false);
  const arkaPlanaGecis = useRef<number | null>(null);

  useEffect(() => {
    const mevcut = Number(Application.nativeBuildVersion ?? 0);
    if (!mevcut || (Platform.OS !== "android" && Platform.OS !== "ios")) return;
    const kontrol = () =>
      api
        .surum()
        .then((s) => {
          const son = Platform.OS === "android" ? s.android : s.ios;
          if (son > mevcut) setAcik(true);
        })
        .catch(() => {});
    kontrol();
    const abone = AppState.addEventListener("change", (durum) => {
      if (durum === "background") {
        arkaPlanaGecis.current = Date.now();
      } else if (durum === "active" && arkaPlanaGecis.current !== null) {
        const sure = Date.now() - arkaPlanaGecis.current;
        arkaPlanaGecis.current = null;
        if (sure >= YENIDEN_ACILIS_MS) kontrol();
      }
    });
    return () => abone.remove();
  }, []);

  async function guncelle() {
    setAcik(false);
    // iOS mağaza kaydı açılınca App Store bağlantısı eklenecek.
    try {
      await Linking.openURL(`market://details?id=${PAKET}`);
    } catch {
      await Linking.openURL(`https://play.google.com/store/apps/details?id=${PAKET}`).catch(() => {});
    }
  }

  return (
    <Modal visible={acik} transparent animationType="fade" onRequestClose={() => setAcik(false)} statusBarTranslucent>
      <View style={s.kok}>
        <View style={[s.kart, { backgroundColor: renk.card }, golge(3)]}>
          <View style={s.ust}>
            <View style={[s.ikon, { backgroundColor: renk.aksanSoft }]}>
              <Ionicons name="rocket-outline" size={56} color={renk.aksan} />
            </View>
            <Text style={[T.title, { color: renk.text, textAlign: "center" }]}>Yeni güncelleme var</Text>
            <Text style={[T.body, { color: renk.textMuted, textAlign: "center", lineHeight: 22 }]}>
              Paraİzi'nin yeni sürümü hazır. Yeni özellikler ve düzeltmeler için uygulamayı
              güncellemeni öneririz.
            </Text>
          </View>
          <View style={s.butonlar}>
            <Buton yazi="Güncelle" onPress={guncelle} />
            <Buton yazi="Daha sonra" varyant="hayalet" onPress={() => setAcik(false)} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  kok: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    padding: SP.lg,
  },
  kart: {
    minHeight: "72%",
    borderRadius: R.xl,
    padding: SP.xl,
    justifyContent: "space-between",
  },
  ust: { flex: 1, alignItems: "center", justifyContent: "center", gap: SP.md },
  ikon: {
    width: 116,
    height: 116,
    borderRadius: 58,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SP.sm,
  },
  butonlar: { gap: SP.sm, marginTop: SP.xl },
});
