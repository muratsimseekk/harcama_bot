import { Ionicons } from "@expo/vector-icons";
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
  const [onay, setOnay] = useState(false);
  const [yukleniyor, setYukleniyor] = useState(false);

  const gecerli =
    ad.trim() &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
    sifre.length >= 6 &&
    sifre === sifre2 &&
    onay;

  async function kayitOl() {
    setYukleniyor(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: sifre,
      options: { data: { ad: ad.trim() } },
    });
    setYukleniyor(false);
    if (error) return Alert.alert("Kayıt başarısız", error.message);

    // Supabase, e-posta zaten kayıtlıysa (enumeration koruması) user döndürür
    // ama identities boş olur ve hiçbir e-posta gitmez.
    if (data.user && (data.user.identities?.length ?? 0) === 0) {
      return Alert.alert("Bu e-posta zaten kayıtlı", "Giriş ekranından şifrenle devam et.", [
        { text: "Giriş Yap", onPress: () => router.replace("/(auth)/giris") },
      ]);
    }

    if (data.session) {
      router.replace("/(app)");
      return;
    }

    Alert.alert("Neredeyse tamam", "E-postana gönderilen bağlantıyla hesabını onayla, sonra giriş yap.", [
      { text: "Tamam", onPress: () => router.replace("/(auth)/giris") },
    ]);
  }

  return (
    <View style={[s.kok, { backgroundColor: renk.bg }]}>
      <SafeAreaView edges={["top"]} style={s.ust}>
        <Text style={[T.display, { color: renk.text, textAlign: "center" }]}>Hesap Oluştur</Text>
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

          <Pressable style={s.onaySatir} onPress={() => setOnay((v) => !v)}>
            <Ionicons
              name={onay ? "checkbox" : "square-outline"}
              size={22}
              color={onay ? renk.aksan : renk.textFaint}
            />
            <Text style={[s.sart, { color: renk.textMuted }]}>
              <Text
                style={{ color: renk.aksan, fontWeight: "700" }}
                onPress={() => router.push("/yasal?belge=gizlilik")}
              >
                Gizlilik Politikası
              </Text>
              {" ve "}
              <Text
                style={{ color: renk.aksan, fontWeight: "700" }}
                onPress={() => router.push("/yasal?belge=kosullar")}
              >
                Kullanım Koşulları
              </Text>
              'nı okudum, kabul ediyorum. Verilerimin ABD'deki hizmet sağlayıcılara
              aktarılmasına açık rıza veriyorum.
            </Text>
          </Pressable>
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
  onaySatir: { flexDirection: "row", alignItems: "flex-start", gap: SP.sm, marginTop: SP.sm },
  sart: { flex: 1, fontSize: 12, lineHeight: 17 },
  link: { textAlign: "center", fontSize: 13.5, fontWeight: "700", marginTop: SP.sm },
});
