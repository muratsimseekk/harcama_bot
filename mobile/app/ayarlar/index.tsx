import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import { AyarGrup, AyarSatir } from "@/components/base";
import { IslemKatmani, useIslemKatmani } from "@/components/IslemKatmani";
import { useUyari } from "@/components/Uyari";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { useTemaMod } from "@/lib/tema";
import { SP, useRenkler } from "@/lib/theme";
import { DEV_NOAUTH } from "@/app/_layout";
import { hataMesaji } from "@/lib/hata";

const TEMA = { system: "Sistem", light: "Açık", dark: "Koyu" } as const;

export default function Ayarlar() {
  const renk = useRenkler();
  const uyari = useUyari();
  const router = useRouter();
  const { mod } = useTemaMod();
  const katman = useIslemKatmani();

  async function hesabiSil() {
    try {
      await katman.calistir({
        bekleyen: "Hesabın siliniyor",
        basarili: "Hesabın silindi",
        is: () => api.hesapSil(),
        // Oturum kapanınca _layout otomatik giriş ekranına yönlendirir.
        sonra: () => void supabase.auth.signOut(),
      });
    } catch (e) {
      uyari("Silinemedi", hataMesaji(e, undefined, { ekran: "hesap-sil" }));
    }
  }

  const silOnayi = () =>
    uyari(
      "Hesabı Sil",
      "Tüm işlemlerin, kategorilerin, bütçelerin ve hesabın kalıcı olarak silinir. " +
        "Bu işlem geri alınamaz.",
      [
        { yazi: "Vazgeç", stil: "vazgec" },
        {
          yazi: "Hesabı Sil",
          stil: "tehlike",
          onPress: () =>
            uyari("Emin misin?", "Son onay. Devam edilsin mi?", [
              { yazi: "Vazgeç", stil: "vazgec" },
              { yazi: "Evet, sil", stil: "tehlike", onPress: hesabiSil },
            ]),
        },
      ],
    );

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={{ backgroundColor: renk.bg }} contentContainerStyle={s.icerik}>
        <AyarGrup baslik="GENEL">
          <AyarSatir
            ikon="color-palette-outline"
            baslik="Görünüm"
            deger={TEMA[mod]}
            son
            onPress={() => router.navigate("/ayarlar/gorunum")}
          />
        </AyarGrup>

        <AyarGrup baslik="YASAL">
          <AyarSatir
            ikon="shield-checkmark-outline"
            baslik="Gizlilik Politikası"
            onPress={() => router.navigate("/yasal?belge=gizlilik")}
          />
          <AyarSatir
            ikon="document-text-outline"
            baslik="Kullanım Koşulları"
            son
            onPress={() => router.navigate("/yasal?belge=kosullar")}
          />
        </AyarGrup>

        {!DEV_NOAUTH && (
          <AyarGrup baslik="HESAP">
            <AyarSatir
              ikon="key-outline"
              baslik="Şifre Değiştir"
              onPress={() => router.navigate("/ayarlar/guvenlik")}
            />
            <AyarSatir
              ikon="log-out-outline"
              baslik="Çıkış Yap"
              onPress={() => supabase.auth.signOut()}
            />
            <AyarSatir
              ikon="trash-outline"
              baslik="Hesabı Sil"
              tehlike
              son
              onPress={katman.durum ? undefined : silOnayi}
            />
          </AyarGrup>
        )}
      </ScrollView>
      <IslemKatmani durum={katman.durum} />
    </View>
  );
}

const s = StyleSheet.create({ icerik: { padding: SP.lg, gap: SP.lg } });
