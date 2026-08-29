import { Ionicons } from "@expo/vector-icons";
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
import { BosDurum, Kart, Sekmeli } from "@/components/base";
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  usePatchCategory,
} from "@/lib/queries";
import { golge, PALET, R, SP, useRenkler } from "@/lib/theme";
import { type Kategori, TIP_ETIKET, type Tip } from "@/lib/types";

const TIPLER: Tip[] = ["kisisel", "isletme", "yatirim"];

export default function Kategoriler() {
  const renk = useRenkler();
  const liste = useCategories();
  const olustur = useCreateCategory();

  const [ad, setAd] = useState("");
  const [tip, setTip] = useState<Tip>("kisisel");
  const [renkSec, setRenkSec] = useState(PALET[0]);
  const [formAcik, setFormAcik] = useState(false);

  function ekle() {
    if (!ad.trim()) return;
    olustur.mutate(
      { name: ad.trim(), tip, color: renkSec },
      {
        onSuccess: () => {
          setAd("");
          setFormAcik(false);
        },
        onError: (e) => Alert.alert("Eklenemedi", String(e)),
      },
    );
  }

  const grupla = (t: Tip) => (liste.data ?? []).filter((k) => k.tip === t);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: renk.bg }]} edges={["bottom"]}>
      <ScrollView contentContainerStyle={s.icerik} showsVerticalScrollIndicator={false}>
        {formAcik ? (
          <Kart seviye={2} style={{ gap: SP.md }}>
            <TextInput
              style={[s.input, { color: renk.text, borderColor: renk.border, backgroundColor: renk.bg }]}
              placeholder="Kategori adı (ör. Nargile)"
              placeholderTextColor={renk.textFaint}
              value={ad}
              onChangeText={setAd}
              autoFocus
            />
            <Sekmeli secenekler={TIPLER} etiket={(t) => TIP_ETIKET[t]} secili={tip} onSec={setTip} kucuk />
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
            <View style={s.formBtnler}>
              <Pressable style={[s.iptal, { borderColor: renk.border }]} onPress={() => setFormAcik(false)}>
                <Text style={{ color: renk.textMuted, fontWeight: "700" }}>Vazgeç</Text>
              </Pressable>
              <Pressable style={[s.ekleBtn, { backgroundColor: renk.primary }]} onPress={ekle}>
                {olustur.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={{ color: "#fff", fontWeight: "700" }}>Ekle</Text>
                )}
              </Pressable>
            </View>
          </Kart>
        ) : (
          <Pressable
            style={[s.yeniBtn, { borderColor: renk.primary, backgroundColor: renk.primarySoft }]}
            onPress={() => setFormAcik(true)}
          >
            <Ionicons name="add-circle-outline" size={18} color={renk.primary} />
            <Text style={{ color: renk.primary, fontWeight: "700" }}>Yeni kategori</Text>
          </Pressable>
        )}

        {liste.isLoading ? (
          <ActivityIndicator style={{ marginTop: 30 }} color={renk.primary} />
        ) : (liste.data ?? []).length === 0 ? (
          <BosDurum ikon="pricetags-outline" yazi="Kategori yok — SQL'i çalıştırdın mı?" />
        ) : (
          TIPLER.map((t) => {
            const grup = grupla(t);
            if (grup.length === 0) return null;
            return (
              <View key={t} style={{ gap: SP.sm }}>
                <Text style={[s.grupBaslik, { color: renk.textFaint }]}>
                  {TIP_ETIKET[t].toUpperCase()} · {grup.length}
                </Text>
                {grup.map((k) => (
                  <Satir key={k.id} kat={k} />
                ))}
              </View>
            );
          })
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
    if (ad.trim() && ad.trim() !== kat.name) patch.mutate({ id: kat.id, body: { name: ad.trim() } });
    setDuzenle(false);
  }

  function silOnay() {
    Alert.alert("Sil", `"${kat.name}" silinsin mi? (kayıtlar etkilenmez)`, [
      { text: "Vazgeç", style: "cancel" },
      { text: "Sil", style: "destructive", onPress: () => sil.mutate(kat.id) },
    ]);
  }

  return (
    <View style={[s.katSatir, { backgroundColor: renk.card, borderColor: renk.border }, golge(1)]}>
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
          <Text
            style={{
              color: kat.is_active ? renk.text : renk.textFaint,
              fontSize: 15,
              fontWeight: "500",
              textDecorationLine: kat.is_active ? "none" : "line-through",
            }}
          >
            {kat.name}
          </Text>
        </Pressable>
      )}
      <Pressable
        onPress={() => patch.mutate({ id: kat.id, body: { is_active: !kat.is_active } })}
        hitSlop={8}
      >
        <Ionicons
          name={kat.is_active ? "eye-outline" : "eye-off-outline"}
          size={19}
          color={renk.textMuted}
        />
      </Pressable>
      <Pressable onPress={silOnay} hitSlop={8}>
        <Ionicons name="trash-outline" size={18} color={renk.danger} />
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  icerik: { padding: SP.lg, gap: SP.lg, paddingBottom: 40 },
  input: { borderWidth: 1, borderRadius: R.sm, padding: 12, fontSize: 16 },
  palet: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  renkNokta: { width: 28, height: 28, borderRadius: 14, borderWidth: 3 },
  formBtnler: { flexDirection: "row", gap: SP.sm },
  iptal: { flex: 1, borderWidth: 1, borderRadius: R.sm, paddingVertical: 12, alignItems: "center" },
  ekleBtn: { flex: 1, borderRadius: R.sm, paddingVertical: 12, alignItems: "center" },
  yeniBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SP.sm,
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: R.md,
    paddingVertical: 14,
  },
  grupBaslik: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5, marginTop: SP.xs, marginLeft: 4 },
  katSatir: {
    flexDirection: "row",
    alignItems: "center",
    gap: SP.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: R.md,
    paddingHorizontal: SP.md,
    paddingVertical: 13,
  },
  nokta: { width: 12, height: 12, borderRadius: 6 },
  katInput: { flex: 1, borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5, fontSize: 15 },
});
