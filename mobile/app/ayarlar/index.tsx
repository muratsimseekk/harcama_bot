import { useRouter } from "expo-router";
import { Alert, ScrollView, StyleSheet } from "react-native";
import { AyarGrup, AyarSatir } from "@/components/base";
import { supabase } from "@/lib/supabase";
import { useTemaMod } from "@/lib/tema";
import { SP, useRenkler } from "@/lib/theme";
import { DEV_NOAUTH } from "@/app/_layout";

const TEMA = { system: "Sistem", light: "Açık", dark: "Koyu" } as const;

export default function Ayarlar() {
  const renk = useRenkler();
  const router = useRouter();
  const { mod } = useTemaMod();

  return (
    <ScrollView style={{ backgroundColor: renk.bg }} contentContainerStyle={s.icerik}>
      <AyarGrup baslik="GENEL">
        <AyarSatir
          ikon="color-palette-outline"
          baslik="Görünüm"
          deger={TEMA[mod]}
          onPress={() => router.navigate("/ayarlar/gorunum")}
        />
        <AyarSatir ikon="notifications-outline" baslik="Bildirim Ayarları" deger="yakında" son />
      </AyarGrup>

      <AyarGrup baslik="HESAP">
        <AyarSatir
          ikon="key-outline"
          baslik="Şifre Ayarları"
          onPress={() => router.navigate("/ayarlar/guvenlik")}
        />
        <AyarSatir
          ikon="trash-outline"
          baslik="Hesabı Sil"
          tehlike
          son
          onPress={() =>
            Alert.alert("Hesabı Sil", "Bu işlem geri alınamaz. Devam edilsin mi?", [
              { text: "Vazgeç", style: "cancel" },
              {
                text: "Sil",
                style: "destructive",
                onPress: () =>
                  Alert.alert("Talep alındı", "Hesap silme talebini destek ekibine ilettik."),
              },
            ])
          }
        />
      </AyarGrup>

      {!DEV_NOAUTH && (
        <AyarGrup>
          <AyarSatir
            ikon="log-out-outline"
            baslik="Çıkış yap"
            tehlike
            son
            onPress={() => supabase.auth.signOut()}
          />
        </AyarGrup>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({ icerik: { padding: SP.lg, gap: SP.lg } });
