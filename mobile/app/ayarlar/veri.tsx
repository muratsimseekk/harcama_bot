import { ScrollView, StyleSheet, Text, View } from "react-native";
import { AyarGrup, AyarSatir } from "@/components/base";
import { useMe } from "@/lib/queries";
import { SP, useRenkler } from "@/lib/theme";

export default function Veri() {
  const renk = useRenkler();
  const me = useMe();

  return (
    <ScrollView style={{ backgroundColor: renk.bg }} contentContainerStyle={s.icerik}>
      <AyarGrup baslik="KAYITLARIM">
        <AyarSatir baslik="Toplam işlem" deger={`${me.data?.toplam_kayit ?? "…"}`} />
        <AyarSatir baslik="Bu ay eklenen" deger={`${me.data?.ay_kayit ?? "…"}`} son />
      </AyarGrup>

      <View style={[s.bilgi, { backgroundColor: renk.card, borderColor: renk.border }]}>
        <Text style={{ color: renk.text, fontWeight: "700", marginBottom: 4 }}>
          Telegram botu ile ortak
        </Text>
        <Text style={{ color: renk.textMuted, fontSize: 13, lineHeight: 19 }}>
          Bu uygulamadan ve Telegram botundan eklediğin kayıtlar aynı veritabanında tutulur.
          Birinden eklediğin diğerinde de görünür.
        </Text>
      </View>

      <AyarGrup baslik="DIŞA AKTARMA">
        <AyarSatir baslik="Excel / CSV olarak indir" deger="yakında" son />
      </AyarGrup>

      <Text style={[s.not, { color: renk.textFaint }]}>
        Verilerin yalnızca senin hesabına bağlıdır. Ses kayıtları çözümlendikten sonra silinir.
      </Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  icerik: { padding: SP.lg, gap: SP.md },
  bilgi: { borderWidth: 1, borderRadius: 12, padding: SP.lg },
  not: { fontSize: 12, marginHorizontal: 4, lineHeight: 18 },
});
