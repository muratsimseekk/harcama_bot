import { Ionicons } from "@expo/vector-icons";
import {
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Metin as Text } from "@/components/Metin";
import { AyarGrup, AyarSatir } from "@/components/base";
import { type TemaMod, useTemaMod } from "@/lib/tema";
import { SP, useRenkler } from "@/lib/theme";

const SECENEKLER: { mod: TemaMod; baslik: string; ikon: keyof typeof Ionicons.glyphMap }[] = [
  { mod: "system", baslik: "Sistem ayarını kullan", ikon: "phone-portrait-outline" },
  { mod: "light", baslik: "Açık", ikon: "sunny-outline" },
  { mod: "dark", baslik: "Koyu", ikon: "moon-outline" },
];

export default function Gorunum() {
  const renk = useRenkler();
  const { mod, setMod } = useTemaMod();

  return (
    <ScrollView style={{ backgroundColor: renk.bg }} contentContainerStyle={s.icerik}>
      <AyarGrup baslik="TEMA">
        {SECENEKLER.map((o, i) => (
          <AyarSatir
            key={o.mod}
            ikon={o.ikon}
            baslik={o.baslik}
            son={i === SECENEKLER.length - 1}
            onPress={() => setMod(o.mod)}
            sag={
              mod === o.mod ? (
                <Ionicons name="checkmark-circle" size={20} color={renk.aksan} />
              ) : (
                <View style={[s.bosDaire, { borderColor: renk.border }]} />
              )
            }
          />
        ))}
      </AyarGrup>
      <Text style={[s.not, { color: renk.textFaint }]}>
        "Sistem" seçiliyken uygulama telefonunun açık/koyu tercihine uyar.
      </Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  icerik: { padding: SP.lg, gap: SP.md },
  bosDaire: { width: 20, height: 20, borderRadius: 10, borderWidth: 2 },
  not: { fontSize: 13, marginHorizontal: 4, lineHeight: 18 },
});
