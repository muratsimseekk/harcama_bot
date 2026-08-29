import Constants from "expo-constants";
import { Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { AyarGrup, AyarSatir, IkonDaire } from "@/components/base";
import { SP, useRenkler } from "@/lib/theme";

export default function Hakkinda() {
  const renk = useRenkler();
  const surum = Constants.expoConfig?.version ?? "0.1.0";

  return (
    <ScrollView style={{ backgroundColor: renk.bg }} contentContainerStyle={s.icerik}>
      <View style={s.logo}>
        <IkonDaire ikon="wallet" renk={renk.primary} boyut={64} />
        <Text style={{ color: renk.text, fontSize: 20, fontWeight: "800" }}>Harcama</Text>
        <Text style={{ color: renk.textFaint, fontSize: 13 }}>Sürüm {surum}</Text>
      </View>

      <Text style={[s.aciklama, { color: renk.textMuted }]}>
        Harcama ve gelirlerini sesle ya da yazıyla, tek cümlede kaydet. Yapay zeka tutarı,
        kategoriyi ve tarihi ayıklar; sen sadece onaylarsın.
      </Text>

      <AyarGrup baslik="BİLGİ">
        <AyarSatir baslik="Sürüm" deger={surum} />
        <AyarSatir baslik="Yapay zeka" deger="Groq · gpt-oss / Whisper" />
        <AyarSatir baslik="Veri" deger="Supabase" son />
      </AyarGrup>

      <AyarGrup baslik="YASAL">
        <AyarSatir
          baslik="Gizlilik politikası"
          onPress={() => Linking.openURL("https://example.com/gizlilik")}
        />
        <AyarSatir
          baslik="Kullanım koşulları"
          onPress={() => Linking.openURL("https://example.com/kosullar")}
          son
        />
      </AyarGrup>

      <Text style={[s.dipnot, { color: renk.textFaint }]}>
        Ses ve fotoğraf dosyaları işlendikten sonra saklanmaz.
      </Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  icerik: { padding: SP.lg, gap: SP.lg },
  logo: { alignItems: "center", gap: SP.sm, paddingVertical: SP.md },
  aciklama: { fontSize: 14, lineHeight: 21, textAlign: "center", paddingHorizontal: SP.sm },
  dipnot: { fontSize: 12, textAlign: "center", marginTop: SP.sm },
});
