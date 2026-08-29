import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { Alert, Linking, StyleSheet, Text, View } from "react-native";
import { DEV_NOAUTH } from "@/app/_layout";
import { AyarGrup, AyarSatir, Baslik, Ekran, IkonDaire, Kart } from "@/components/base";
import { turkceTutar } from "@/lib/format";
import { useCategories, useMe, useSummary } from "@/lib/queries";
import { supabase } from "@/lib/supabase";
import { useTemaMod } from "@/lib/tema";
import { golge, R, SP, useRenkler } from "@/lib/theme";

const TEMA_ETIKET = { system: "Sistem", light: "Açık", dark: "Koyu" } as const;

export default function Profil() {
  const renk = useRenkler();
  const router = useRouter();
  const me = useMe();
  const kategoriler = useCategories();
  const yil = useSummary("year");
  const { mod } = useTemaMod();

  const planYazi = DEV_NOAUTH ? "Yönetici" : me.data?.plan === "pro" ? "Pro üye" : "Ücretsiz";

  return (
    <Ekran onRefresh={() => { me.refetch(); yil.refetch(); }} refreshing={me.isRefetching}>
      <Baslik>Profil</Baslik>

      <Kart seviye={2} style={s.ust}>
        <IkonDaire ikon="person" renk={renk.primary} boyut={52} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: renk.text, fontSize: 18, fontWeight: "800" }}>{planYazi}</Text>
          <Text style={{ color: renk.textMuted, fontSize: 13 }}>
            Telegram botuyla aynı veritabanı
          </Text>
        </View>
      </Kart>

      <View style={s.istatSira}>
        <Istat etiket="Bu ay" deger={`${me.data?.ay_kayit ?? "…"}`} alt="kayıt" />
        <Istat etiket="Toplam" deger={`${me.data?.toplam_kayit ?? "…"}`} alt="kayıt" />
        <Istat
          etiket="Bu yıl"
          deger={yil.data ? turkceTutar(yil.data.bu_donem.toplam_gider) : "…"}
          alt="₺ gider"
        />
      </View>

      <AyarGrup baslik="GENEL">
        <AyarSatir
          ikon="pricetags-outline"
          baslik="Kategoriler"
          deger={`${kategoriler.data?.length ?? "…"}`}
          onPress={() => router.navigate("/kategoriler")}
        />
        <AyarSatir
          ikon="color-palette-outline"
          baslik="Görünüm"
          deger={TEMA_ETIKET[mod]}
          onPress={() => router.navigate("/ayarlar/gorunum")}
        />
        <AyarSatir ikon="cash-outline" baslik="Para birimi" deger="₺ TRY" son />
      </AyarGrup>

      <AyarGrup baslik="VERİ">
        <AyarSatir
          ikon="shield-checkmark-outline"
          baslik="Veri & Gizlilik"
          onPress={() => router.navigate("/ayarlar/veri")}
          son
        />
      </AyarGrup>

      <AyarGrup baslik="UYGULAMA">
        <AyarSatir
          ikon="information-circle-outline"
          baslik="Hakkında"
          deger={Constants.expoConfig?.version ?? "0.1.0"}
          onPress={() => router.navigate("/ayarlar/hakkinda")}
        />
        <AyarSatir
          ikon="mail-outline"
          baslik="Destek / geri bildirim"
          onPress={() => Linking.openURL("mailto:muratsimseekk@gmail.com?subject=Harcama%20uygulaması")}
          son
        />
      </AyarGrup>

      {!DEV_NOAUTH && (
        <AyarGrup>
          <AyarSatir
            ikon="log-out-outline"
            baslik="Çıkış yap"
            tehlike
            son
            onPress={() =>
              Alert.alert("Çıkış", "Çıkış yapılsın mı?", [
                { text: "Vazgeç", style: "cancel" },
                { text: "Çıkış", style: "destructive", onPress: () => supabase.auth.signOut() },
              ])
            }
          />
        </AyarGrup>
      )}
    </Ekran>
  );
}

function Istat({ etiket, deger, alt }: { etiket: string; deger: string; alt: string }) {
  const renk = useRenkler();
  return (
    <View style={[s.istat, { backgroundColor: renk.card, borderColor: renk.border }, golge(1)]}>
      <Text style={{ color: renk.textFaint, fontSize: 11, fontWeight: "600" }}>{etiket}</Text>
      <Text style={{ color: renk.text, fontSize: 17, fontWeight: "800" }} numberOfLines={1}>
        {deger}
      </Text>
      <Text style={{ color: renk.textFaint, fontSize: 10 }}>{alt}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  ust: { flexDirection: "row", alignItems: "center", gap: SP.md },
  istatSira: { flexDirection: "row", gap: SP.sm },
  istat: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: R.md,
    padding: SP.md,
    gap: 2,
  },
});
