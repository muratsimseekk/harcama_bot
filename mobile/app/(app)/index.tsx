import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, ApiError } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { useRenkler } from "@/lib/theme";
import type { CaptureYanit } from "@/lib/types";

export default function Capture() {
  const renk = useRenkler();
  const router = useRouter();
  const [metin, setMetin] = useState("");
  const [durum, setDurum] = useState<"bos" | "kayit" | "gonderiliyor">("bos");
  const kayitRef = useRef<Audio.Recording | null>(null);

  function sonuca_git(y: CaptureYanit) {
    if (y.candidates.length === 0) {
      Alert.alert("Anlaşılamadı", "Kayıt çıkarılamadı. Daha açık yazmayı/söylemeyi dene.");
      return;
    }
    router.push({ pathname: "/confirm", params: { data: JSON.stringify(y) } });
  }

  function hataGoster(e: unknown) {
    const mesaj =
      e instanceof ApiError
        ? e.status === 402
          ? e.message
          : e.message
        : "Bir şeyler ters gitti, tekrar dene.";
    Alert.alert("Hata", mesaj);
  }

  async function metinGonder() {
    if (!metin.trim() || durum !== "bos") return;
    setDurum("gonderiliyor");
    try {
      const y = await api.captureText(metin.trim());
      setMetin("");
      sonuca_git(y);
    } catch (e) {
      hataGoster(e);
    } finally {
      setDurum("bos");
    }
  }

  async function kayitBaslat() {
    try {
      const izin = await Audio.requestPermissionsAsync();
      if (!izin.granted) {
        Alert.alert("Mikrofon izni gerekli");
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      kayitRef.current = recording;
      setDurum("kayit");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {
      hataGoster(e);
      setDurum("bos");
    }
  }

  async function kayitBitir() {
    const rec = kayitRef.current;
    kayitRef.current = null;
    if (!rec) return;
    setDurum("gonderiliyor");
    try {
      await rec.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = rec.getURI();
      if (!uri) throw new Error("Kayıt alınamadı");
      const y = await api.captureAudio(uri);
      sonuca_git(y);
    } catch (e) {
      hataGoster(e);
    } finally {
      setDurum("bos");
    }
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: renk.bg }]} edges={["top"]}>
      <View style={s.header}>
        <Text style={[s.baslik, { color: renk.text }]}>Harcama ekle</Text>
        <Pressable onPress={() => supabase.auth.signOut()}>
          <Text style={[s.cikis, { color: renk.textMuted }]}>Çıkış</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={s.orta} keyboardShouldPersistTaps="handled">
          <Pressable
            onPressIn={kayitBaslat}
            onPressOut={kayitBitir}
            disabled={durum === "gonderiliyor"}
            style={[
              s.mic,
              {
                backgroundColor: durum === "kayit" ? renk.danger : renk.primary,
                opacity: durum === "gonderiliyor" ? 0.5 : 1,
              },
            ]}
          >
            {durum === "gonderiliyor" ? (
              <ActivityIndicator color="#fff" size="large" />
            ) : (
              <Text style={s.micEmoji}>{durum === "kayit" ? "●" : "🎙️"}</Text>
            )}
          </Pressable>
          <Text style={[s.ipucu, { color: renk.textMuted }]}>
            {durum === "kayit"
              ? "Konuş… bırakınca gönderilir"
              : "Bas-konuş: “market iki yüz elli, dün benzin altı yüz”"}
          </Text>
        </ScrollView>

        <View style={[s.altBar, { borderTopColor: renk.border, backgroundColor: renk.card }]}>
          <TextInput
            style={[s.input, { color: renk.text, backgroundColor: renk.bg, borderColor: renk.border }]}
            placeholder="ya da yaz: kahve 90"
            placeholderTextColor={renk.textMuted}
            value={metin}
            onChangeText={setMetin}
            onSubmitEditing={metinGonder}
            returnKeyType="send"
            editable={durum === "bos"}
          />
          <Pressable
            style={[s.gonder, { backgroundColor: metin.trim() ? renk.primary : renk.border }]}
            onPress={metinGonder}
            disabled={!metin.trim() || durum !== "bos"}
          >
            <Text style={{ color: renk.primaryText, fontSize: 18, fontWeight: "700" }}>→</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  baslik: { fontSize: 22, fontWeight: "800" },
  cikis: { fontSize: 15 },
  orta: { flexGrow: 1, alignItems: "center", justifyContent: "center", gap: 20, padding: 24 },
  mic: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  micEmoji: { fontSize: 64, color: "#fff" },
  ipucu: { fontSize: 15, textAlign: "center", maxWidth: 280 },
  altBar: {
    flexDirection: "row",
    gap: 10,
    padding: 12,
    borderTopWidth: 1,
    alignItems: "center",
  },
  input: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  gonder: { width: 46, height: 46, borderRadius: 10, alignItems: "center", justifyContent: "center" },
});
