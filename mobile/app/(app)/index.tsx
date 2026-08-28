import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
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
import { DEV_NOAUTH } from "@/app/_layout";
import { api, ApiError } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { useRenkler } from "@/lib/theme";
import type { CaptureYanit } from "@/lib/types";

type Durum = "bos" | "hazirlaniyor" | "kayit" | "gonderiliyor";
const MIN_KAYIT_MS = 700;

export default function Capture() {
  const renk = useRenkler();
  const router = useRouter();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const [metin, setMetin] = useState("");
  const [durum, setDurum] = useState<Durum>("bos");
  const basladiRef = useRef(0);

  function sonuca_git(y: CaptureYanit) {
    if (y.candidates.length === 0) {
      Alert.alert(
        "Anlaşılamadı",
        y.transcript
          ? `Duyduğum: "${y.transcript}"\n\nBundan bir kayıt çıkaramadım. Tekrar dene.`
          : "Kayıt çıkarılamadı. Daha açık yazmayı/söylemeyi dene.",
      );
      return;
    }
    router.push({ pathname: "/confirm", params: { data: JSON.stringify(y) } });
  }

  function hataGoster(e: unknown) {
    const mesaj = e instanceof ApiError ? e.message : "Bir şeyler ters gitti, tekrar dene.";
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

  async function mikTikla() {
    if (durum === "kayit") return kayitBitir();
    if (durum !== "bos") return;

    setDurum("hazirlaniyor");
    try {
      const izin = await AudioModule.requestRecordingPermissionsAsync();
      if (!izin.granted) {
        Alert.alert("Mikrofon izni gerekli", "Ayarlar → Harcama → Mikrofon'u aç.");
        setDurum("bos");
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      basladiRef.current = Date.now();
      setDurum("kayit");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {
      hataGoster(e);
      setDurum("bos");
    }
  }

  async function kayitBitir() {
    const sure = Date.now() - basladiRef.current;
    if (sure < MIN_KAYIT_MS) {
      await new Promise((r) => setTimeout(r, MIN_KAYIT_MS - sure));
    }
    setDurum("gonderiliyor");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false });
      const uri = recorder.uri;
      if (!uri) throw new Error("Kayıt alınamadı");
      const y = await api.captureAudio(uri);
      sonuca_git(y);
    } catch (e) {
      hataGoster(e);
    } finally {
      setDurum("bos");
    }
  }

  const kayitta = durum === "kayit";
  const mesgul = durum === "gonderiliyor" || durum === "hazirlaniyor";

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: renk.bg }]} edges={["top"]}>
      <View style={s.header}>
        <Text style={[s.baslik, { color: renk.text }]}>Harcama ekle</Text>
        {DEV_NOAUTH ? (
          <Text style={[s.cikis, { color: renk.textMuted }]}>yönetici</Text>
        ) : (
          <Pressable onPress={() => supabase.auth.signOut()}>
            <Text style={[s.cikis, { color: renk.textMuted }]}>Çıkış</Text>
          </Pressable>
        )}
      </View>

      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={s.orta} keyboardShouldPersistTaps="handled">
          <Pressable
            onPress={mikTikla}
            disabled={mesgul}
            style={[
              s.mic,
              {
                backgroundColor: kayitta ? renk.danger : renk.primary,
                opacity: mesgul ? 0.5 : 1,
              },
            ]}
          >
            {mesgul ? (
              <ActivityIndicator color="#fff" size="large" />
            ) : (
              <Text style={s.micEmoji}>{kayitta ? "■" : "🎙️"}</Text>
            )}
          </Pressable>
          <Text style={[s.ipucu, { color: renk.textMuted }]}>
            {kayitta
              ? `Dinliyorum… ${Math.floor(recorderState.durationMillis / 1000)} sn — bitince dokun`
              : durum === "hazirlaniyor"
                ? "Hazırlanıyor…"
                : "Dokun-konuş: “market iki yüz elli, dün benzin altı yüz”"}
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
