import { router } from "expo-router";
import { useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { Buton } from "@/components/Buton";
import { Metin as Text } from "@/components/Metin";
import { sosyalGirisYap } from "@/lib/sosyalGiris";
import { SP, useRenkler } from "@/lib/theme";

/** Giriş ve kayıt ekranlarında ortak "veya" bölücü + Google/Apple butonları. */
export function SosyalGirisSatiri({ onHata }: { onHata: (mesaj: string) => void }) {
  const renk = useRenkler();
  const [yuklenen, setYuklenen] = useState<"google" | "apple" | null>(null);

  async function gir(saglayici: "google" | "apple") {
    setYuklenen(saglayici);
    const { hata } = await sosyalGirisYap(saglayici);
    setYuklenen(null);
    if (hata) onHata(hata);
  }

  return (
    <View style={{ gap: SP.md }}>
      <View style={s.bolucuSatir}>
        <View style={[s.cizgi, { backgroundColor: renk.border }]} />
        <Text style={[s.veya, { color: renk.textFaint }]}>veya</Text>
        <View style={[s.cizgi, { backgroundColor: renk.border }]} />
      </View>

      <Buton
        yazi="Google ile devam et"
        varyant="hayalet"
        onPress={() => gir("google")}
        yukleniyor={yuklenen === "google"}
        pasif={yuklenen !== null && yuklenen !== "google"}
      />
      {Platform.OS === "ios" && (
        <Buton
          yazi="Apple ile devam et"
          varyant="hayalet"
          onPress={() => gir("apple")}
          yukleniyor={yuklenen === "apple"}
          pasif={yuklenen !== null && yuklenen !== "apple"}
        />
      )}
      {/* Sosyal girişte onay kutusu yok — kayıt ekranındaki onayın karşılığı bu bilgilendirme */}
      <Text style={[s.not, { color: renk.textFaint }]}>
        Google{Platform.OS === "ios" ? " veya Apple" : ""} ile devam ederek{" "}
        <Text style={{ color: renk.aksan, fontWeight: "700" }} onPress={() => router.push("/yasal?belge=gizlilik")}>
          Gizlilik Politikası
        </Text>
        {" ve "}
        <Text style={{ color: renk.aksan, fontWeight: "700" }} onPress={() => router.push("/yasal?belge=kosullar")}>
          Kullanım Koşulları
        </Text>
        'nı kabul etmiş olursun.
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  bolucuSatir: { flexDirection: "row", alignItems: "center", gap: SP.sm, marginTop: SP.sm },
  cizgi: { flex: 1, height: 1 },
  veya: { fontSize: 12, fontWeight: "600" },
  not: { fontSize: 12, lineHeight: 17, textAlign: "center" },
});
