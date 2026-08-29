import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Alan } from "@/components/Alan";
import { Buton } from "@/components/Buton";
import { Metin as Text } from "@/components/Metin";
import { supabase } from "@/lib/supabase";
import { R, SP, T, useRenkler } from "@/lib/theme";

export default function SifreSifirla() {
  const renk = useRenkler();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [yukleniyor, setYukleniyor] = useState(false);

  async function gonder() {
    setYukleniyor(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    setYukleniyor(false);
    Alert.alert(
      error ? "Hata" : "Gönderildi",
      error ? error.message : "Şifre sıfırlama bağlantısı e-postana gönderildi.",
      [{ text: "Tamam", onPress: () => !error && router.back() }],
    );
  }

  return (
    <View style={[s.kok, { backgroundColor: renk.green }]}>
      <SafeAreaView edges={["top"]} style={s.ust}>
        <Text style={[T.display, { color: renk.onGreen, textAlign: "center" }]}>Şifre Sıfırla</Text>
      </SafeAreaView>
      <KeyboardAvoidingView
        style={[s.mint, { backgroundColor: renk.bg }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={s.form}>
          <Text style={[s.aciklama, { color: renk.textMuted }]}>
            Hesabına bağlı e-postayı gir; sıfırlama bağlantısı gönderelim.
          </Text>
          <Alan
            etiket="E-posta"
            placeholder="ornek@eposta.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          <Buton
            yazi="Bağlantı Gönder"
            onPress={gonder}
            yukleniyor={yukleniyor}
            pasif={!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())}
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
