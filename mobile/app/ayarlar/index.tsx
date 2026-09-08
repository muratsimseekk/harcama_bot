import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, StyleSheet } from "react-native";
import { AyarGrup, AyarSatir } from "@/components/base";
import { api, ApiError } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { useTemaMod } from "@/lib/tema";
import { SP, useRenkler } from "@/lib/theme";
import { DEV_NOAUTH } from "@/app/_layout";

const TEMA = { system: "Sistem", light: "Açık", dark: "Koyu" } as const;

export default function Ayarlar() {
  const renk = useRenkler();
  const router = useRouter();
  const { mod } = useTemaMod();
  const [siliniyor, setSiliniyor] = useState(false);

  async function hesabiSil() {
    setSiliniyor(true);
    try {
      await api.hesapSil();
      await supabase.auth.signOut();
      // Oturum kapanınca _layout otomatik giriş ekranına yönlendirir.
    } catch (e) {
      setSiliniyor(false);
      Alert.alert(
        "Silinemedi",
        e instanceof ApiError ? e.message : "Bağlantıyı kontrol edip tekrar dene.",
      );
    }
  }

  const silOnayi = () =>
    Alert.alert(
      "Hesabı Sil",
      "Tüm işlemlerin, kategorilerin, bütçelerin ve hesabın kalıcı olarak silinir. " +
        "Bu işlem geri alınamaz.",
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Hesabı Sil",
          style: "destructive",
          onPress: () =>
            Alert.alert("Emin misin?", "Son onay. Devam edilsin mi?", [
              { text: "Vazgeç", style: "cancel" },
              { text: "Evet, sil", style: "destructive", onPress: hesabiSil },
            ]),
        },
      ],
    );

  return (
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
            baslik={siliniyor ? "Siliniyor…" : "Hesabı Sil"}
            tehlike
            son
            onPress={siliniyor ? undefined : silOnayi}
          />
        </AyarGrup>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({ icerik: { padding: SP.lg, gap: SP.lg } });
