import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Alan } from "@/components/Alan";
import { Buton } from "@/components/Buton";
import { Metin as Text } from "@/components/Metin";
import { supabase } from "@/lib/supabase";
import { R, SP, T, useRenkler } from "@/lib/theme";

export default function Kayit() {
  const renk = useRenkler();
  const router = useRouter();
  const [ad, setAd] = useState("");
  const [email, setEmail] = useState("");
  const [sifre, setSifre] = useState("");
  const [sifre2, setSifre2] = useState("");
  const [yukleniyor, setYukleniyor] = useState(false);

  const gecerli = ad.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && sifre.length >= 6 && sifre === sifre2;

  async function kayitOl() {
    setYukleniyor(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: sifre,
      options: { data: { ad: ad.trim() } },
    });
    setYukleniyor(false);
    if (error) return Alert.alert("Kayıt başarısız", error.message);
    if (!data.session) {
      Alert.alert("Neredeyse tamam", "E-postana gönderilen bağlantıyla hesabını onayla, sonra giriş yap.", [
        { text: "Tamam", onPress: () => router.replace("/(auth)/giris") },
      ]);
    }
  }

  return (
    <View style={[s.kok, { backgroundColor: renk.green }]}>
      <SafeAreaView edges={["top"]} style={s.ust}>
        <Text style={[T.display, { color: renk.onGreen, textAlign: "center" }]}>Hesap Oluştur</Text>
      </SafeAreaView>

      <KeyboardAvoidingView
        style={[s.mint, { backgroundColor: renk.bg }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={s.form} keyboardShouldPersistTaps="handled">
          <Alan etiket="Ad" placeholder="Adın" value={ad} onChangeText={setAd} />
          <Alan
            etiket="E-posta"
            placeholder="ornek@eposta.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          <Alan etiket="Şifre" sifre placeholder="en az 6 karakter" value={sifre} onChangeText={setSifre} />
          <Alan etiket="Şifre (tekrar)" sifre placeholder="••••••••" value={sifre2} onChangeText={setSifre2} />

          <Text style={[s.sart, { color: renk.textMuted }]}>
            Devam ederek Kullanım Koşulları ve Gizlilik Politikası'nı kabul etmiş olursun.
          </Text>
          <Buton yazi="Kayıt Ol" onPress={kayitOl} yukleniyor={yukleniyor} pasif={!gecerli} />
          <Pressable onPress={() => router.replace("/(auth)/giris")}>
            <Text style={[s.link, { color: renk.text }]}>Zaten hesabın var mı? Giriş Yap</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  kok: { flex: 1 },
  ust: { paddingVertical: SP.xl, justifyContent: "center" },
  mint: { flex: 3, borderTopLeftRadius: R.xl, borderTopRightRadius: R.xl },
  form: { padding: SP.xl, gap: SP.md, paddingBottom: 60 },
  sart: { fontSize: 12, textAlign: "center", lineHeight: 17, marginTop: SP.sm },
  link: { textAlign: "center", fontSize: 13.5, fontWeight: "700", marginTop: SP.sm },
});
