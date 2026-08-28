import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Kart } from "@/components/ui";
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  usePatchCategory,
} from "@/lib/queries";
import { PALET, useRenkler } from "@/lib/theme";
import { type Kategori, TIP_ETIKET, type Tip } from "@/lib/types";

const TIPLER: Tip[] = ["kisisel", "isletme", "yatirim"];

export default function Kategoriler() {
  const renk = useRenkler();
  const liste = useCategories();
  const olustur = useCreateCategory();

  const [ad, setAd] = useState("");
  const [tip, setTip] = useState<Tip>("kisisel");
  const [renkSec, setRenkSec] = useState(PALET[0]);

  function ekle() {
    if (!ad.trim()) return;
    olustur.mutate(
      { name: ad.trim(), tip, color: renkSec },
      {
        onSuccess: () => setAd(""),
        onError: (e) => Alert.alert("Eklenemedi", String(e)),
      },
    );
  }

  const grupla = (t: Tip) => (liste.data ?? []).filter((k) => k.tip === t);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: renk.bg }]} edges={["bottom"]}>
      <ScrollView contentContainerStyle={s.icerik}>
        <Kart style={{ gap: 10 }}>
          <Text style={[s.baslik, { color: renk.text }]}>Yeni kategori</Text>
          <TextInput
            style={[s.input, { color: renk.text, borderColor: renk.border, backgroundColor: renk.bg }]}
            placeholder="ad (ör. Nargile)"
            placeholderTextColor={renk.textMuted}
            value={ad}
            onChangeText={setAd}
          />
          <View style={s.tipSatir}>
            {TIPLER.map((t) => (
              <Pressable
                key={t}
                onPress={() => setTip(t)}
                style={[
                  s.tipSec,
                  { borderColor: renk.border, backgroundColor: t === tip ? renk.primary : "transparent" },
                ]}
              >
                <Text style={{ color: t === tip ? "#fff" : renk.textMuted, fontSize: 13 }}>
                  {TIP_ETIKET[t]}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={s.palet}>
            {PALET.map((c) => (
              <Pressable
                key={c}
                onPress={() => setRenkSec(c)}
                style={[
                  s.renkNokta,
                  { backgroundColor: c, borderColor: c === renkSec ? renk.text : "transparent" },
                ]}
              />
            ))}
          </View>
          <Pressable style={[s.ekleBtn, { backgroundColor: renk.primary }]} onPress={ekle}>
            {olustur.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: "#fff", fontWeight: "700" }}>Ekle</Text>
            )}
          </Pressable>
        </Kart>

        {liste.isLoading ? (
          <ActivityIndicator style={{ marginTop: 30 }} color={renk.primary} />
        ) : (
          TIPLER.map((t) => (
            <View key={t} style={{ gap: 8 }}>
              <Text style={[s.grupBaslik, { color: renk.textMuted }]}>{TIP_ETIKET[t]}</Text>
              {grupla(t).map((k) => (
                <Satir key={k.id} kat={k} />
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Satir({ kat }: { kat: Kategori }) {
  const renk = useRenkler();
  const patch = usePatchCategory();
  const sil = useDeleteCategory();
  const [ad, setAd] = useState(kat.name);
  const [duzenle, setDuzenle] = useState(false);

  function kaydet() {
    if (ad.trim() && ad.trim() !== kat.name) {
      patch.mutate({ id: kat.id, body: { name: ad.trim() } });
    }
    setDuzenle(false);
  }

  function silOnay() {
    Alert.alert("Sil", `"${kat.name}" kategorisi silinsin mi? (kayıtlar etkilenmez)`, [
      { text: "Vazgeç", style: "cancel" },
      { text: "Sil", style: "destructive", onPress: () => sil.mutate(kat.id) },
    ]);
  }

  return (
    <View style={[s.katSatir, { backgroundColor: renk.card, borderColor: renk.border }]}>
      <View style={[s.nokta, { backgroundColor: kat.color || renk.primary }]} />
      {duzenle ? (
        <TextInput
          style={[s.katInput, { color: renk.text, borderColor: renk.border }]}
          value={ad}
          onChangeText={setAd}
          autoFocus
          onBlur={kaydet}
          onSubmitEditing={kaydet}
        />
      ) : (
        <Pressable style={{ flex: 1 }} onPress={() => setDuzenle(true)}>
          <Text style={{ color: kat.is_active ? renk.text : renk.textMuted, fontSize: 15 }}>
            {kat.name}
            {!kat.is_active ? "  (pasif)" : ""}
          </Text>
        </Pressable>
      )}
      <Pressable onPress={() => patch.mutate({ id: kat.id, body: { is_active: !kat.is_active } })} hitSlop={8}>
        <Text style={{ fontSize: 16 }}>{kat.is_active ? "👁️" : "🚫"}</Text>
      </Pressable>
      <Pressable onPress={silOnay} hitSlop={8}>
        <Text style={{ color: renk.danger, fontSize: 16 }}>✕</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  icerik: { padding: 16, gap: 16, paddingBottom: 40 },
  baslik: { fontSize: 17, fontWeight: "700" },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 16 },
  tipSatir: { flexDirection: "row", gap: 6 },
  tipSec: { flex: 1, borderWidth: 1, borderRadius: 8, paddingVertical: 9, alignItems: "center" },
  palet: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  renkNokta: { width: 26, height: 26, borderRadius: 13, borderWidth: 2 },
  ekleBtn: { borderRadius: 10, padding: 13, alignItems: "center" },
  grupBaslik: { fontSize: 13, fontWeight: "700", textTransform: "uppercase", marginTop: 4 },
  katSatir: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  nokta: { width: 12, height: 12, borderRadius: 6 },
  katInput: { flex: 1, borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, fontSize: 15 },
});
