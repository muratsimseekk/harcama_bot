import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { Kart } from "@/components/base";
import { Buton } from "@/components/Buton";
import { Metin as Text } from "@/components/Metin";
import { PlanRozeti, denemeGunKalan } from "@/components/PlanRozeti";
import { useMe } from "@/lib/queries";
import { SATINALMA_MEVCUT, satinAl } from "@/lib/satinalma";
import { golge, R, SP, T, useRenkler } from "@/lib/theme";

const OZELLIKLER: { ad: string; base: boolean; pro: boolean }[] = [
  { ad: "Elle işlem ekleme", base: true, pro: true },
  { ad: "Bütçe, hedef, özet & analiz", base: true, pro: true },
  { ad: "Aylık AI (sesli/yazılı) kayıt", base: false, pro: true }, // base: sınırlı
  { ad: "Sınırsız AI kayıt", base: false, pro: true },
  { ad: "Hane / aile paylaşımı", base: false, pro: true },
];

export default function Uyelik() {
  const renk = useRenkler();
  const router = useRouter();
  const me = useMe();
  const deneme = me.data?.ham_plan === "trial" ? denemeGunKalan(me.data.trial_bitis) : null;

  async function gec(paket: string) {
    if (!SATINALMA_MEVCUT) {
      Alert.alert(
        "Yakında",
        "Mağaza üzerinden abonelik bir sonraki güncellemede açılacak. " +
          "Şu an tüm özellikler deneme süresinde açık.",
      );
      return;
    }
    const ok = await satinAl(paket);
    if (ok) {
      await me.refetch();
      Alert.alert("Tamam", "Üyeliğin güncellendi.");
      router.back();
    } else {
      Alert.alert("Tamamlanamadı", "Satın alma iptal edildi veya başarısız oldu.");
    }
  }

  return (
    <ScrollView style={{ backgroundColor: renk.bg }} contentContainerStyle={s.icerik}>
      <View style={{ alignItems: "center", gap: SP.sm }}>
        <PlanRozeti ben={me.data} />
        {deneme != null && (
          <Text style={{ color: renk.textMuted, fontSize: 13 }}>
            Deneme sürene {deneme} gün kaldı. Sonra Base'e geçersin.
          </Text>
        )}
      </View>

      <Kart>
        <View style={s.tablo}>
          <View style={s.satir}>
            <Text style={[s.hucreAd, { color: renk.textFaint }]} />
            <Text style={[s.hucreBaslik, { color: renk.textMuted }]}>Base</Text>
            <Text style={[s.hucreBaslik, { color: renk.aksan }]}>Pro</Text>
          </View>
          {OZELLIKLER.map((o) => (
            <View key={o.ad} style={s.satir}>
              <Text style={[s.hucreAd, { color: renk.text }]}>{o.ad}</Text>
              <Isaret var={o.base} renk={renk} />
              <Isaret var={o.pro} renk={renk} />
            </View>
          ))}
        </View>
      </Kart>

      <Text style={{ color: renk.textFaint, fontSize: 12, textAlign: "center" }}>
        Base: aylık {me.data?.ai_limit ?? 100} AI kaydı · Pro: sınırsız + hane
      </Text>

      <View style={{ gap: SP.sm }}>
        <Buton yazi="Pro'ya Geç" onPress={() => gec("pro_aylik")} />
        <Buton yazi="Base'e Geç" varyant="ikincil" onPress={() => gec("base_aylik")} />
      </View>

      <Text style={s.kucukYazi}>
        Ödemeler yalnızca App Store / Google Play üzerinden alınır. Abonelik dönem sonunda
        otomatik yenilenir; iptal, cihazının mağaza hesabı ayarlarından yapılır.{" "}
        <Text style={{ color: renk.aksan }} onPress={() => router.push("/yasal?belge=kosullar")}>
          Kullanım Koşulları
        </Text>
      </Text>
    </ScrollView>
  );
}

function Isaret({ var: v, renk }: { var: boolean; renk: ReturnType<typeof useRenkler> }) {
  return (
    <View style={s.hucre}>
      <Ionicons
        name={v ? "checkmark-circle" : "remove"}
        size={18}
        color={v ? renk.success : renk.textFaint}
      />
    </View>
  );
}

const s = StyleSheet.create({
  icerik: { padding: SP.lg, gap: SP.lg, paddingBottom: 60 },
  tablo: { gap: 2 },
  satir: { flexDirection: "row", alignItems: "center", paddingVertical: 8 },
  hucreAd: { flex: 1, fontSize: 13.5, fontWeight: "500" },
  hucreBaslik: { width: 56, textAlign: "center", fontSize: 13, fontWeight: "800" },
  hucre: { width: 56, alignItems: "center" },
  kucukYazi: { color: "#8F8B80", fontSize: 11, lineHeight: 16, textAlign: "center" },
});
