import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { useRenkler } from "@/lib/theme";

export default function Verify() {
  const renk = useRenkler();
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [kod, setKod] = useState("");
  const [dogrulaniyor, setDogrulaniyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  async function dogrula() {
    setHata(null);
    setDogrulaniyor(true);
    const { error } = await supabase.auth.verifyOtp({
      email: String(email),
      token: kod.trim(),
      type: "email",
    });
    setDogrulaniyor(false);
    if (error) {
      setHata(error.message);
      return;
    }
    // _layout Kapı'sı oturum değişimini görüp (app)'e yönlendirir.
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: renk.bg }]}>
      <View style={s.container}>
        <View>
          <Text style={[s.baslik, { color: renk.text }]}>Kodu gir</Text>
          <Text style={[s.alt, { color: renk.textMuted }]}>{email} adresine gönderildi.</Text>
        </View>

        <View style={s.form}>
          <TextInput
            style={[s.input, { backgroundColor: renk.card, borderColor: renk.border, color: renk.text }]}
            placeholder="123456"
            placeholderTextColor={renk.textMuted}
            keyboardType="number-pad"
            inputMode="numeric"
            maxLength={6}
            value={kod}
            onChangeText={setKod}
            onSubmitEditing={() => kod.length === 6 && dogrula()}
            autoFocus
          />
          {hata && <Text style={[s.hata, { color: renk.danger }]}>{hata}</Text>}
          <Pressable
            style={[s.buton, { backgroundColor: kod.length === 6 ? renk.primary : renk.border }]}
            disabled={kod.length !== 6 || dogrulaniyor}
            onPress={dogrula}
          >
            {dogrulaniyor ? (
              <ActivityIndicator color={renk.primaryText} />
            ) : (
              <Text style={[s.butonYazi, { color: renk.primaryText }]}>Giriş yap</Text>
            )}
          </Pressable>
          <Pressable onPress={() => router.back()}>
            <Text style={[s.geri, { color: renk.textMuted }]}>← E-postayı değiştir</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, padding: 24, justifyContent: "center", gap: 40 },
  baslik: { fontSize: 32, fontWeight: "800" },
  alt: { fontSize: 15, marginTop: 8 },
  form: { gap: 12 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    letterSpacing: 8,
    textAlign: "center",
  },
  buton: { borderRadius: 12, padding: 16, alignItems: "center" },
  butonYazi: { fontSize: 17, fontWeight: "700" },
  hata: { fontSize: 14 },
  geri: { fontSize: 14, textAlign: "center", marginTop: 8 },
});
