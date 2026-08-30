import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Alan } from "@/components/Alan";
import { Buton } from "@/components/Buton";
import { Metin as Text } from "@/components/Metin";
import { supabase } from "@/lib/supabase";
import { R, SP, T, useRenkler } from "@/lib/theme";

export default function Giris() {
  const renk = useRenkler();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sifre, setSifre] = useState("");
  const [yukleniyor, setYukleniyor] = useState(false);

  async function girisYap() {
    setYukleniyor(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: sifre });
    setYukleniyor(false);
    if (error) Alert.alert("Giriş başarısız", error.message);
  }

  return (
    <View style={[s.kok, { backgroundColor: renk.bg }]}>
      <SafeAreaView edges={["top"]} style={s.ust}>
        <Text style={[T.display, { color: renk.text, textAlign: "center" }]}>Hoş Geldin</Text>
      </SafeAreaView>

      <KeyboardAvoidingView
        style={[s.mint, { backgroundColor: renk.bg }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={s.form}>
          <Alan
            etiket="E-posta"
            placeholder="ornek@eposta.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          <Alan etiket="Şifre" sifre placeholder="••••••••" value={sifre} onChangeText={setSifre} />

          <Buton
            yazi="Giriş Yap"
            onPress={girisYap}
            yukleniyor={yukleniyor}
            pasif={!email.trim() || sifre.length < 6}
            style={{ marginTop: SP.md }}
          />
          <Pressable onPress={() => router.push("/(auth)/sifre-sifirla")}>
            <Text style={[s.link, { color: renk.text }]}>Şifremi unuttum?</Text>
          </Pressable>

          <Buton yazi="Kayıt Ol" varyant="ikincil" onPress={() => router.push("/(auth)/kayit")} />

          <View style={s.sosyal}>
            <Text style={{ color: renk.textFaint, fontSize: 12.5 }}>veya (yakında)</Text>
            <View style={{ flexDirection: "row", gap: SP.lg }}>
              <View style={[s.sosBtn, { borderColor: renk.border }]}>
                <Ionicons name="logo-google" size={20} color={renk.textFaint} />
              </View>
              <View style={[s.sosBtn, { borderColor: renk.border }]}>
                <Ionicons name="logo-apple" size={20} color={renk.textFaint} />
              </View>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  kok: { flex: 1 },
  ust: { paddingVertical: SP.xxl, justifyContent: "center" },
  mint: { flex: 2.2, borderTopLeftRadius: R.xl, borderTopRightRadius: R.xl },
  form: { padding: SP.xl, gap: SP.lg, paddingTop: SP.xxl },
  link: { textAlign: "center", fontSize: 13.5, fontWeight: "700" },
  sosyal: { alignItems: "center", gap: SP.md, marginTop: SP.lg },
  sosBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: "center", justifyContent: "center" },
});
