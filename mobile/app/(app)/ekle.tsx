import { Ionicons } from "@expo/vector-icons";
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Metin as Text } from "@/components/Metin";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, ApiError } from "@/lib/api";
import { R, SP, useRenkler } from "@/lib/theme";
import type { CaptureYanit } from "@/lib/types";

type Durum = "bos" | "hazirlaniyor" | "kayit" | "gonderiliyor";
const MIN_KAYIT_MS = 700;

const ORNEKLER = [
  "market 250, dün benzin 600",
  "kahve 90",
  "3 mayıs galvaniz 4500 tl",
  "maaş geldi 45000",
];

export default function Ekle() {
  const renk = useRenkler();
  const router = useRouter();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const rState = useAudioRecorderState(recorder);
  const [metin, setMetin] = useState("");
  const [durum, setDurum] = useState<Durum>("bos");
  const basladiRef = useRef(0);
  const nabiz = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (durum === "kayit") {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(nabiz, { toValue: 1.12, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(nabiz, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
      );
      anim.start();
      return () => anim.stop();
    }
    nabiz.setValue(1);
  }, [durum, nabiz]);

  function sonuc(y: CaptureYanit) {
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

  function hata(e: unknown) {
    Alert.alert("Hata", e instanceof ApiError ? e.message : "Bir şeyler ters gitti, tekrar dene.");
  }

  async function metinGonder() {
    if (!metin.trim() || durum !== "bos") return;
    setDurum("gonderiliyor");
    try {
      const y = await api.captureText(metin.trim());
      setMetin("");
      sonuc(y);
    } catch (e) {
      hata(e);
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
      hata(e);
      setDurum("bos");
    }
  }

  async function kayitBitir() {
    const sure = Date.now() - basladiRef.current;
    if (sure < MIN_KAYIT_MS) await new Promise((r) => setTimeout(r, MIN_KAYIT_MS - sure));
    setDurum("gonderiliyor");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false });
      const uri = recorder.uri;
      if (!uri) throw new Error("Kayıt alınamadı");
      sonuc(await api.captureAudio(uri));
    } catch (e) {
      hata(e);
    } finally {
      setDurum("bos");
    }
  }

  const kayitta = durum === "kayit";
  const mesgul = durum === "gonderiliyor" || durum === "hazirlaniyor";
  const sn = Math.floor(rState.durationMillis / 1000);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: renk.bg }]} edges={["top"]}>
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={s.orta}>
          <Animated.View style={{ transform: [{ scale: nabiz }] }}>
            <Pressable
              onPress={mikTikla}
              disabled={mesgul}
              style={[
                s.mic,
                {
                  backgroundColor: kayitta ? renk.danger : renk.primary,
                  opacity: mesgul ? 0.6 : 1,
                },
              ]}
            >
              {mesgul ? (
                <ActivityIndicator color="#fff" size="large" />
              ) : (
                <Ionicons name={kayitta ? "stop" : "mic"} size={54} color="#fff" />
              )}
            </Pressable>
          </Animated.View>

          <Text style={[s.durumYazi, { color: kayitta ? renk.danger : renk.text }]}>
            {kayitta
              ? `Dinliyorum · ${sn} sn`
              : durum === "hazirlaniyor"
                ? "Hazırlanıyor…"
                : durum === "gonderiliyor"
                  ? "Analiz ediliyor…"
                  : "Kaydı başlatmak için dokun"}
          </Text>
          <Text style={[s.ipucu, { color: renk.textFaint }]}>
            {kayitta ? "Bitince tekrar dokun" : "Sesli ya da yazılı — birden çok kalem tek seferde"}
          </Text>

          {durum === "bos" && (
            <View style={s.ornekler}>
              {ORNEKLER.map((o) => (
                <Pressable
                  key={o}
                  onPress={() => setMetin(o)}
                  style={[s.ornek, { borderColor: renk.border, backgroundColor: renk.card }]}
                >
                  <Text style={{ color: renk.textMuted, fontSize: 12.5 }}>{o}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <View style={[s.altBar, { borderTopColor: renk.hairline, backgroundColor: renk.card }]}>
          <TextInput
            style={[s.input, { color: renk.text, backgroundColor: renk.bg, borderColor: renk.border }]}
            placeholder="yazarak ekle…"
            placeholderTextColor={renk.textFaint}
            value={metin}
            onChangeText={setMetin}
            onSubmitEditing={metinGonder}
            returnKeyType="send"
            editable={durum === "bos"}
            multiline
          />
          <Pressable
            style={[s.gonder, { backgroundColor: metin.trim() ? renk.primary : renk.border }]}
            onPress={metinGonder}
            disabled={!metin.trim() || durum !== "bos"}
          >
            <Ionicons name="arrow-up" size={20} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  orta: { flex: 1, alignItems: "center", justifyContent: "center", gap: SP.md, padding: SP.xl },
  mic: {
    width: 150,
    height: 150,
    borderRadius: 75,
    alignItems: "center",
    justifyContent: "center",
  },
  durumYazi: { fontSize: 17, fontWeight: "700", marginTop: SP.sm },
  ipucu: { fontSize: 13, textAlign: "center", maxWidth: 280 },
  ornekler: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: SP.sm, marginTop: SP.lg },
  ornek: { borderWidth: 1, borderRadius: R.pill, paddingHorizontal: 12, paddingVertical: 7 },
  altBar: {
    flexDirection: "row",
    gap: SP.sm,
    padding: SP.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: "flex-end",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: R.md,
    paddingHorizontal: 14,
    paddingTop: 11,
    paddingBottom: 11,
    fontSize: 16,
    maxHeight: 100,
  },
  gonder: { width: 44, height: 44, borderRadius: R.md, alignItems: "center", justifyContent: "center" },
});
