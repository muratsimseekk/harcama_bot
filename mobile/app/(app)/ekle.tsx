import Ionicons from "@expo/vector-icons/Ionicons";
import { useQueryClient } from "@tanstack/react-query";
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import * as Haptics from "expo-haptics";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AppState,
  Animated,
  Easing,
  Keyboard,
  Linking,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { EkranBasligi } from "@/components/EkranBasligi";
import { KlavyeAlani } from "@/components/KlavyeAlani";
import { EnerjiRozeti, EnerjiSheet, type EnerjiSheetDurum } from "@/components/EnerjiSheet";
import { Metin as Text } from "@/components/Metin";
import { useUyari } from "@/components/Uyari";
import { YuklemeHalkasi } from "@/components/YuklemeHalkasi";
import { olay } from "@/lib/analitik";
import { api } from "@/lib/api";
import { cevrimdisi } from "@/lib/baglanti";
import { tutarKisa } from "@/lib/format";
import { useHizliSablonlar } from "@/lib/hizliEkle";
import { kategoriIkon } from "@/lib/kategoriIkon";
import { reklamIzleProaktif } from "@/lib/kullanim402";
import { useMe } from "@/lib/queries";
import { reklamAktif } from "@/lib/reklam";
import { OLCUM_ARALIGI_MS, sessizlikAlgilayici } from "@/lib/sessizlik";
import { FONT, R, SP, T, useRenkler } from "@/lib/theme";
import type { CaptureYanit } from "@/lib/types";
import { hataMesaji } from "@/lib/hata";

type Durum = "bos" | "hazirlaniyor" | "kayit" | "gonderiliyor";
const MIN_KAYIT_MS = 700;
const KAYIT_AYARI = { ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true };
// İlk örnek tek kayıt: Free planda günde 3 hak var, ilk denemede hepsi bitmesin. Çoklu cümle
// örneği (2 kayıt) yeteneği göstermek için ikinci sırada.
const ORNEKLER = ["kahve 90", "market 250, benzin 600", "maaş geldi 45000", "3 mayıs kira 15000"];

export default function Ekle() {
  const renk = useRenkler();
  const uyari = useUyari();
  const router = useRouter();
  const qc = useQueryClient();
  const recorder = useAudioRecorder(KAYIT_AYARI);
  const rState = useAudioRecorderState(recorder, OLCUM_ARALIGI_MS);
  const me = useMe();
  const sablonlar = useHizliSablonlar();
  const [sheetAcik, setSheetAcik] = useState(false);
  const [sheetDurum, setSheetDurum] = useState<EnerjiSheetDurum>(null);
  const [metin, setMetin] = useState("");
  const [yaziyor, setYaziyor] = useState(false);
  const [durum, setDurum] = useState<Durum>("bos");
  const basladiRef = useRef(0);
  const algilayiciRef = useRef<ReturnType<typeof sessizlikAlgilayici> | null>(null);
  // Bitirme tek sefer: dokunuş, sessizlik ve Vazgeç aynı anda gelebilir.
  const kapaniyorRef = useRef(false);
  const inputRef = useRef<TextInput>(null);
  const halka = useRef(new Animated.Value(0)).current;
  // Ana sayfadaki "İlk harcamanı söyle" kartı: ?basla=ses&t=… ile gelince mikrofonu bir kez aç
  const { basla, t } = useLocalSearchParams<{ basla?: string; t?: string }>();
  const baslaIslendi = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (basla !== "ses" || !t || baslaIslendi.current === t) return;
    baslaIslendi.current = t;
    mikTikla();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- yalnız yeni t ile
  }, [basla, t]);

  // Kullanıcı susunca kendiliğinden bitir: "tekrar dokun" yazısını görmeyen kişi mikrofonu
  // açık bırakıp bekliyordu. Hiç konuşmadıysa ses sunucuya gitmez.
  useEffect(() => {
    if (durum !== "kayit" || !algilayiciRef.current) return;
    const karar = algilayiciRef.current(rState.metering, Date.now());
    if (karar === "bitir") kayitBitir();
    else if (karar === "vazgec") {
      kayitAt().then(() =>
        uyari(
          "Seni duyamadım",
          "Ses algılanmadı, kayıt gönderilmedi. Mikrofona yakın konuşup tekrar dene ya da yazarak ekle.",
          undefined,
          { ikon: "mic-off-outline" },
        ),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- her seviye ölçümünde çalışmalı
  }, [rState, durum]);

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

  function sonuc(y: CaptureYanit, girdi: "ses" | "yazi") {
    if (y.candidates.length === 0) {
      olay("voice_parse_failed", { girdi, metin_var: !!y.transcript });
      uyari(
        "Anlaşılamadı",
        y.transcript ? `Duyduğum: "${y.transcript}"\n\nKayıt çıkaramadım.` : "Daha açık dene.",
      );
      return;
    }
    router.push({ pathname: "/confirm", params: { data: JSON.stringify(y), girdi } });
  }

  function hata(e: unknown) {
    uyari("Eklenemedi", hataMesaji(e, undefined, { ekran: "ekle" }));
  }

  async function metinGonder() {
    if (!metin.trim() || durum !== "bos") return;
    setDurum("gonderiliyor");
    olay("record_input_started", { girdi: "yazi", yer: "ekle" });
    try {
      const y = await api.captureText(metin.trim());
      setMetin("");
      sonuc(y, "yazi");
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
      // Ses yalnız sunucuda çözümleniyor — çevrimdışıyken kaydettirip sonra hata vermek yerine baştan söyle.
      if (await cevrimdisi()) {
        uyari(
          "İnternete bağlı değilsin",
          "Sesli kayıt için internet gerekiyor. Bağlandıktan sonra tekrar dene ya da harcamanı yazarak gir.",
          undefined,
          { ikon: "cloud-offline-outline" },
        );
        setDurum("bos");
        return;
      }
      const izin = await AudioModule.requestRecordingPermissionsAsync();
      if (!izin.granted) {
        // Kalıcı reddedildiyse sistem bir daha sormaz → kullanıcıyı Ayarlar'a yönlendir.
        uyari(
          "Mikrofon izni gerekli",
          izin.canAskAgain
            ? "Harcamanı sesle eklemek için mikrofon iznine ihtiyacımız var. İstersen yazarak da girebilirsin."
            : "Mikrofon izni kapalı. Sesle eklemek için Ayarlar'dan Paraİzi'ye mikrofon izni ver ya da harcamanı yazarak gir.",
          izin.canAskAgain
            ? undefined
            : [{ yazi: "Vazgeç", stil: "vazgec" }, { yazi: "Ayarları Aç", onPress: () => Linking.openSettings() }],
          { ikon: "mic-off-outline" },
        );
        setDurum("bos");
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      basladiRef.current = Date.now();
      algilayiciRef.current = sessizlikAlgilayici(basladiRef.current);
      kapaniyorRef.current = false;
      setDurum("kayit");
      olay("record_input_started", { girdi: "ses", yer: basla === "ses" ? "ilk_kayit_karti" : "ekle" });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {
      hata(e);
      setDurum("bos");
    }
  }

  /** Kaydı durdur ama gönderme — ses atılır, ekran anında boş duruma döner. */
  async function kayitAt() {
    if (durum !== "kayit" || kapaniyorRef.current) return; // çift dokunuş koruması
    kapaniyorRef.current = true;
    setDurum("bos"); // UI anında sıfırlansın ("Analiz ediliyor…" görünmesin)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false });
    } catch {
      /* yoksay — zaten vazgeçiyoruz, ses atılacak */
    }
  }

  // Kayıt sürerken uygulama arka plana geçerse ya da başka sekmeye geçilirse kaydı at:
  // mikrofon yalnız kullanıcının gördüğü, süreli bir eylemde açık kalsın (Play ses kaydı
  // politikası; play-policy-insights denetimi 2026-11-13).
  const kayitAtRef = useRef(kayitAt);
  kayitAtRef.current = kayitAt;
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "background") kayitAtRef.current();
    });
    return () => sub.remove();
  }, []);
  useFocusEffect(
    useCallback(
      () => () => {
        kayitAtRef.current();
      },
      [],
    ),
  );

  /** Klavye açıkken üst soldaki geri oku: klavyeyi kapat, taslağı temizle. */
  function yaziVazgec() {
    inputRef.current?.blur();
    Keyboard.dismiss();
    setMetin("");
    setYaziyor(false);
  }

  async function kayitBitir() {
    if (kapaniyorRef.current) return;
    kapaniyorRef.current = true;
    const sure = Date.now() - basladiRef.current;
    if (sure < MIN_KAYIT_MS) await new Promise((r) => setTimeout(r, MIN_KAYIT_MS - sure));
    setDurum("gonderiliyor");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false });
      const uri = recorder.uri;
      if (!uri) throw new Error("Kayıt alınamadı");
      sonuc(await api.captureAudio(uri), "ses");
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
    <EkranBasligi
      baslik="Ekle"
      zil={false}
      kaydir={false}
      geri={yaziyor}
      onGeri={yaziVazgec}
      icerikStil={{ padding: 0, gap: 0 }}
      ustAlan={<EnerjiRozeti ben={me.data} onPress={() => setSheetAcik(true)} />}
    >
      <KlavyeAlani>
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
            {mesgul ? (
              // Analiz/hazırlık sırasında mikrofonun yerini yükleme halkası alır
              <YuklemeHalkasi boyut={100} yazi="" />
            ) : (
              <Pressable
                onPress={mikTikla}
                style={[s.mic, { backgroundColor: kayitta ? renk.danger : renk.aksan }]}
              >
                <Ionicons name={kayitta ? "stop" : "mic"} size={52} color={renk.aksanUstu} />
              </Pressable>
            )}
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
          {!yaziyor && (
            <Text style={[s.ipucu, { color: renk.textFaint }]}>
              {!kayitta
                ? "Sesli ya da yazılı — birden çok kalem tek seferde"
                : rState.metering === undefined
                  ? "Bitince tekrar dokun"
                  : "Bitirmek için dokun veya 3 sn sessiz kal"}
            </Text>
          )}

          {kayitta && (
            <Pressable
              onPress={kayitAt}
              style={[s.vazgec, { backgroundColor: renk.cardAlt }]}
              hitSlop={8}
            >
              <Ionicons name="close" size={16} color={renk.textMuted} />
              <Text style={{ color: renk.textMuted, fontSize: 14, fontWeight: "700" }}>Vazgeç</Text>
            </Pressable>
          )}

          {durum === "bos" && !yaziyor && (
            <>
              {sablonlar.length > 0 ? (
                // Sık girilen kayıtlar: dokun → form dolu açılır (tarih bugün), tek dokunuşla "Ekle"
                <View style={{ alignSelf: "stretch", alignItems: "center", marginTop: SP.lg, gap: SP.sm }}>
                  <Text style={[s.hizliBaslik, { color: renk.textFaint }]}>HIZLI EKLE</Text>
                  <View style={[s.ornekler, { marginTop: 0 }]}>
                    {sablonlar.map((h) => (
                      <Pressable
                        key={`${h.aciklama}|${h.kategori}|${h.direction}`}
                        onPress={() => router.push({ pathname: "/islem-form", params: { sablon: JSON.stringify(h) } })}
                        style={[s.hizli, { backgroundColor: renk.aksanSoft }]}
                      >
                        <Ionicons name={kategoriIkon(h.kategori)} size={14} color={renk.aksan} />
                        <Text style={{ color: renk.text, fontSize: 13, fontWeight: "600", maxWidth: 130 }} numberOfLines={1}>
                          {h.aciklama}
                        </Text>
                        <Text style={{ color: renk.textMuted, fontSize: 12.5, fontWeight: "700" }}>
                          {tutarKisa(h.tutar)} ₺
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : (
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
              )}
              <Pressable onPress={() => router.push("/islem-form")} style={s.elle} hitSlop={8}>
                <Ionicons name="create-outline" size={16} color={renk.aksan} />
                <Text style={{ color: renk.aksan, fontSize: 13.5, fontWeight: "700" }}>Elle gir</Text>
              </Pressable>
            </>
          )}
        </View>

        <View style={[s.altBar, { backgroundColor: renk.aksanSoft }]}>
          <TextInput
            ref={inputRef}
            style={[s.input, { color: renk.text }]}
            placeholder="yazarak ekle…"
            placeholderTextColor={renk.textFaint}
            value={metin}
            onChangeText={setMetin}
            onFocus={() => setYaziyor(true)}
            onBlur={() => setYaziyor(false)}
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
      </KlavyeAlani>

      <EnerjiSheet
        acik={sheetAcik}
        onKapat={() => setSheetAcik(false)}
        ben={me.data}
        reklamGosterilebilir={reklamAktif()}
        durum={sheetDurum}
        onReklamIzle={() => reklamIzleProaktif(qc, uyari, setSheetDurum)}
        onProGec={() => {
          setSheetAcik(false);
          router.push({ pathname: "/uyelik", params: { neden: "limit" } });
        }}
      />
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
  hizliBaslik: { fontSize: 11.5, fontWeight: "800", letterSpacing: 0.6 },
  hizli: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: R.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  vazgec: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: SP.lg,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: R.pill,
  },
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
