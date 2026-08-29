import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Metin as Text } from "@/components/Metin";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { useRenkler } from "@/lib/theme";

export default function Login() {
  const renk = useRenkler();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  const gecerli = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  async function kodGonder() {
    setHata(null);
    setGonderiliyor(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    });
    setGonderiliyor(false);
    if (error) {
      setHata(error.message);
      return;
    }
    router.push({ pathname: "/(auth)/verify", params: { email: email.trim() } });
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: renk.bg }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={s.container}
      >
        <View>
          <Text style={[s.baslik, { color: renk.text }]}>Harcama</Text>
          <Text style={[s.alt, { color: renk.textMuted }]}>
            E-postana bir giriş kodu göndereceğiz.
          </Text>
        </View>

        <View style={s.form}>
          <TextInput
            style={[s.input, { backgroundColor: renk.card, borderColor: renk.border, color: renk.text }]}
            placeholder="ornek@eposta.com"
            placeholderTextColor={renk.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            inputMode="email"
            value={email}
            onChangeText={setEmail}
            onSubmitEditing={() => gecerli && kodGonder()}
          />
          {hata && <Text style={[s.hata, { color: renk.danger }]}>{hata}</Text>}
          <Pressable
            style={[s.buton, { backgroundColor: gecerli ? renk.primary : renk.border }]}
            disabled={!gecerli || gonderiliyor}
            onPress={kodGonder}
          >
            {gonderiliyor ? (
              <ActivityIndicator color={renk.primaryText} />
            ) : (
              <Text style={[s.butonYazi, { color: renk.primaryText }]}>Kod gönder</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, padding: 24, justifyContent: "center", gap: 40 },
  baslik: { fontSize: 40, fontWeight: "800" },
  alt: { fontSize: 16, marginTop: 8 },
  form: { gap: 12 },
  input: { borderWidth: 1, borderRadius: 12, padding: 16, fontSize: 17 },
  buton: { borderRadius: 12, padding: 16, alignItems: "center" },
  butonYazi: { fontSize: 17, fontWeight: "700" },
  hata: { fontSize: 14 },
});
