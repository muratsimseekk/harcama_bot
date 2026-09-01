import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Alan } from "@/components/Alan";
import { Buton } from "@/components/Buton";
import { Metin as Text } from "@/components/Metin";
import { supabase } from "@/lib/supabase";
import { R, SP, T, useRenkler } from "@/lib/theme";

export default function SifreYenile() {
  const renk = useRenkler();
  const router = useRouter();
  const [sifre, setSifre] = useState("");
  const [sifre2, setSifre2] = useState("");
  const [yukleniyor, setYukleniyor] = useState(false);

  const gecerli = sifre.length >= 6 && sifre === sifre2;

  async function kaydet() {
    setYukleniyor(true);
    const { error } = await supabase.auth.updateUser({ password: sifre });
    setYukleniyor(false);
    if (error) return Alert.alert("Hata", error.message);
    Alert.alert("Şifren güncellendi", "Yeni şifrenle giriş yapabilirsin.", [
      { text: "Tamam", onPress: () => router.replace("/(auth)/giris") },
    ]);
  }

  return (
    <View style={[s.kok, { backgroundColor: renk.bg }]}>
      <SafeAreaView edges={["top"]} style={s.ust}>
        <Text style={[T.display, { color: renk.text, textAlign: "center" }]}>Yeni Şifre</Text>
      </SafeAreaView>
      <KeyboardAvoidingView
        style={[s.mint, { backgroundColor: renk.bg }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={s.form}>
          <Text style={[s.aciklama, { color: renk.textMuted }]}>
            Hesabın için yeni bir şifre belirle.
          </Text>
          <Alan etiket="Yeni şifre" sifre placeholder="en az 6 karakter" value={sifre} onChangeText={setSifre} />
          <Alan etiket="Şifre (tekrar)" sifre placeholder="••••••••" value={sifre2} onChangeText={setSifre2} />
          <Buton
            yazi="Kaydet"
            onPress={kaydet}
            yukleniyor={yukleniyor}
            pasif={!gecerli}
            style={{ marginTop: SP.md }}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  kok: { flex: 1 },
  ust: { paddingVertical: SP.xxl, justifyContent: "center" },
  mint: { flex: 2.4, borderTopLeftRadius: R.xl, borderTopRightRadius: R.xl },
  form: { padding: SP.xl, gap: SP.lg, paddingTop: SP.xxl },
  aciklama: { fontSize: 14, lineHeight: 20 },
});
