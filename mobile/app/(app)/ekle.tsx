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
import { EkranBasligi } from "@/components/EkranBasligi";
import { Metin as Text } from "@/components/Metin";
import { api, ApiError } from "@/lib/api";
import { FONT, R, SP, T, useRenkler } from "@/lib/theme";
import type { CaptureYanit } from "@/lib/types";

type Durum = "bos" | "hazirlaniyor" | "kayit" | "gonderiliyor";
const MIN_KAYIT_MS = 700;
const ORNEKLER = ["market 250, dün benzin 600", "kahve 90", "maaş geldi 45000", "3 mayıs galvaniz 4500"];

export default function Ekle() {
  const renk = useRenkler();
  const router = useRouter();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const rState = useAudioRecorderState(recorder);
  const [metin, setMetin] = useState("");
  const [durum, setDurum] = useState<Durum>("bos");
  const basladiRef = useRef(0);
  const halka = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (durum === "kayit") {
      const a = Animated.loop(
        Animated.timing(halka, { toValue: 1, duration: 1600, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      );
      a.start();
      return () => {
        a.stop();
        halka.setValue(0);
      };
    }
  }, [durum, halka]);

  function sonuc(y: CaptureYanit) {
    if (y.candidates.length === 0) {
      Alert.alert(
        "Anlaşılamadı",
        y.transcript ? `Duyduğum: "${y.transcript}"\n\nKayıt çıkaramadım.` : "Daha açık dene.",
      );
      return;
    }
    router.push({ pathname: "/confirm", params: { data: JSON.stringify(y) } });
  }

  function hata(e: unknown) {
    Alert.alert("Hata", e instanceof ApiError ? e.message : "Bir şeyler ters gitti.");
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
        Alert.alert("Mikrofon izni gerekli");
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
    <EkranBasligi baslik="Ekle" zil={false} kaydir={false} icerikStil={{ padding: 0, gap: 0 }}>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={s.orta}>
          <View style={s.micSar}>
            {kayitta && (
              <Animated.View
                style={[
                  s.dalga,
                  {
                    borderColor: renk.aksan,
                    opacity: halka.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
                    transform: [{ scale: halka.interpolate({ inputRange: [0, 1], outputRange: [1, 2] }) }],
                  },
                ]}
              />
            )}
            <Pressable
              onPress={mikTikla}
              disabled={mesgul}
              style={[s.mic, { backgroundColor: kayitta ? renk.danger : renk.aksan, opacity: mesgul ? 0.6 : 1 }]}
            >
              {mesgul ? (
                <ActivityIndicator color={renk.aksanUstu} size="large" />
              ) : (
                <Ionicons name={kayitta ? "stop" : "mic"} size={52} color={renk.aksanUstu} />
              )}
            </Pressable>
          </View>

          <Text style={[T.heading, { color: kayitta ? renk.danger : renk.text }]}>
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
            <>
              <View style={s.ornekler}>
                {ORNEKLER.map((o) => (
                  <Pressable
                    key={o}
                    onPress={() => setMetin(o)}
                    style={[s.ornek, { backgroundColor: renk.aksanSoft }]}
                  >
                    <Text style={{ color: renk.textMuted, fontSize: 12.5 }}>{o}</Text>
                  </Pressable>
                ))}
              </View>
              <Pressable onPress={() => router.push("/islem-form")} style={s.elle} hitSlop={8}>
                <Ionicons name="create-outline" size={16} color={renk.aksan} />
                <Text style={{ color: renk.aksan, fontSize: 13.5, fontWeight: "700" }}>Elle gir</Text>
              </Pressable>
            </>
          )}
        </View>

        <View style={[s.altBar, { backgroundColor: renk.aksanSoft }]}>
          <TextInput
            style={[s.input, { color: renk.text }]}
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
            style={[s.gonder, { backgroundColor: metin.trim() ? renk.aksan : renk.border }]}
            onPress={metinGonder}
            disabled={!metin.trim() || durum !== "bos"}
          >
            <Ionicons name="arrow-up" size={20} color={renk.aksanUstu} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </EkranBasligi>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  orta: { flex: 1, alignItems: "center", justifyContent: "center", gap: SP.md, padding: SP.xl },
  micSar: { alignItems: "center", justifyContent: "center", width: 150, height: 150 },
  dalga: { position: "absolute", width: 150, height: 150, borderRadius: 75, borderWidth: 3 },
  mic: { width: 138, height: 138, borderRadius: 69, alignItems: "center", justifyContent: "center" },
  ipucu: { fontSize: 13, textAlign: "center", maxWidth: 280 },
  ornekler: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: SP.sm, marginTop: SP.lg },
  ornek: { borderRadius: R.pill, paddingHorizontal: 12, paddingVertical: 7 },
  elle: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: SP.lg, paddingVertical: 6 },
  altBar: {
    flexDirection: "row",
    gap: SP.sm,
    padding: SP.sm,
    borderRadius: R.pill,
    alignItems: "flex-end",
    margin: SP.lg,
  },
  input: { flex: 1, fontSize: 15.5, paddingHorizontal: SP.md, paddingVertical: 12, maxHeight: 100, fontFamily: FONT["500"] },
  gonder: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
});
