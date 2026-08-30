import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { Buton } from "@/components/Buton";
import { Metin as Text } from "@/components/Metin";
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  usePatchCategory,
} from "@/lib/queries";
import { PALET, R, SP, T, useRenkler } from "@/lib/theme";
import { type Kategori, TIP_ETIKET, type Tip } from "@/lib/types";

const TIPLER: Tip[] = ["kisisel", "isletme", "yatirim"];

export default function KategoriYonet() {
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
      { onSuccess: () => setAd(""), onError: (e) => Alert.alert("Eklenemedi", String(e)) },
    );
  }

  const grupla = (t: Tip) => (liste.data ?? []).filter((k) => k.tip === t);

  return (
    <ScrollView style={{ backgroundColor: renk.bg }} contentContainerStyle={s.icerik}>
      <View style={[s.form, { backgroundColor: renk.greenSoft }]}>
        <TextInput
          style={[s.input, { color: renk.text, backgroundColor: renk.bg }]}
          placeholder="Yeni kategori adı"
          placeholderTextColor={renk.textFaint}
          value={ad}
          onChangeText={setAd}
        />
        <View style={s.tipSira}>
          {TIPLER.map((t) => (
            <Pressable
              key={t}
              onPress={() => setTip(t)}
              style={[s.tipSec, { backgroundColor: t === tip ? renk.green : renk.bg }]}
            >
              <Text style={{ color: renk.text, fontSize: 12.5, fontWeight: t === tip ? "700" : "500" }}>
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
              style={[s.renkNok, { backgroundColor: c, borderColor: c === renkSec ? renk.text : "transparent" }]}
            />
          ))}
        </View>
        <Buton yazi="Ekle" onPress={ekle} yukleniyor={olustur.isPending} />
      </View>

      {TIPLER.map((t) => {
        const grup = grupla(t);
        if (!grup.length) return null;
        return (
          <View key={t} style={{ gap: SP.sm }}>
            <Text style={[T.overline, { color: renk.textFaint, marginTop: SP.sm }]}>{TIP_ETIKET[t]}</Text>
            {grup.map((k) => (
              <Satir key={k.id} kat={k} />
            ))}
          </View>
        );
      })}
    </ScrollView>
  );
}

function Satir({ kat }: { kat: Kategori }) {
  const renk = useRenkler();
  const patch = usePatchCategory();
  const sil = useDeleteCategory();
  const [ad, setAd] = useState(kat.name);
  const [duzenle, setDuzenle] = useState(false);

  return (
    <View style={[s.satir, { backgroundColor: renk.card }]}>
      <View style={[s.nok, { backgroundColor: kat.color || renk.blue }]} />
      {duzenle ? (
        <TextInput
          style={[s.satirInput, { color: renk.text, borderColor: renk.border }]}
          value={ad}
          onChangeText={setAd}
          autoFocus
          onBlur={() => {
            if (ad.trim() && ad.trim() !== kat.name) patch.mutate({ id: kat.id, body: { name: ad.trim() } });
            setDuzenle(false);
          }}
        />
      ) : (
        <Pressable style={{ flex: 1 }} onPress={() => setDuzenle(true)}>
          <Text style={{ color: kat.is_active ? renk.text : renk.textFaint, fontSize: 15 }}>{kat.name}</Text>
        </Pressable>
      )}
      <Pressable
        onPress={() => patch.mutate({ id: kat.id, body: { is_active: !kat.is_active } })}
        hitSlop={8}
      >
        <Ionicons name={kat.is_active ? "eye-outline" : "eye-off-outline"} size={19} color={renk.textMuted} />
      </Pressable>
      <Pressable
        onPress={() =>
          Alert.alert("Sil", `"${kat.name}" silinsin mi? (kayıtlar etkilenmez)`, [
            { text: "Vazgeç", style: "cancel" },
            { text: "Sil", style: "destructive", onPress: () => sil.mutate(kat.id) },
          ])
        }
        hitSlop={8}
      >
        <Ionicons name="trash-outline" size={18} color={renk.danger} />
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  icerik: { padding: SP.lg, gap: SP.md, paddingBottom: 60 },
  form: { borderRadius: R.md, padding: SP.lg, gap: SP.md },
  input: { borderRadius: R.sm, padding: 12, fontSize: 15, fontFamily: "Poppins_500Medium" },
  tipSira: { flexDirection: "row", gap: SP.sm },
  tipSec: { flex: 1, borderRadius: R.sm, paddingVertical: 9, alignItems: "center" },
  palet: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  renkNok: { width: 26, height: 26, borderRadius: 13, borderWidth: 3 },
  satir: { flexDirection: "row", alignItems: "center", gap: SP.md, padding: 13, borderRadius: R.sm },
  nok: { width: 12, height: 12, borderRadius: 6 },
  satirInput: { flex: 1, borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5, fontSize: 15 },
});
