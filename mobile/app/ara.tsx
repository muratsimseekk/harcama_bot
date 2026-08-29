import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { Buton } from "@/components/Buton";
import { IslemSatiri } from "@/components/IslemSatiri";
import { Metin as Text } from "@/components/Metin";
import { api } from "@/lib/api";
import { useCategories } from "@/lib/queries";
import { R, SP, T, useRenkler } from "@/lib/theme";
import type { Islem, Yon } from "@/lib/types";

export default function Ara() {
  const renk = useRenkler();
  const kategoriler = useCategories();
  const [q, setQ] = useState("");
  const [kat, setKat] = useState<string | null>(null);
  const [yon, setYon] = useState<Yon | null>(null);
  const [sonuc, setSonuc] = useState<Islem[] | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);

  async function ara() {
    setYukleniyor(true);
    try {
      const hepsi = await api.listTransactions({ limit: 400, direction: yon ?? undefined });
      const s = q.trim().toLocaleLowerCase("tr");
      setSonuc(
        hepsi.filter(
          (t) =>
            (!kat || t.kategori === kat) &&
            (!s || t.aciklama.toLocaleLowerCase("tr").includes(s) || t.kategori.toLocaleLowerCase("tr").includes(s)),
        ),
      );
    } finally {
      setYukleniyor(false);
    }
  }

  return (
    <View style={[s.kok, { backgroundColor: renk.green }]}>
      <View style={s.ustPad}>
        <View style={[s.aramaKutu, { backgroundColor: renk.card }]}>
          <Ionicons name="search" size={18} color={renk.textMuted} />
          <TextInput
            style={[s.aramaInput, { color: renk.text }]}
            placeholder="Ara…"
            placeholderTextColor={renk.textFaint}
            value={q}
            onChangeText={setQ}
            autoFocus
          />
        </View>
      </View>

      <ScrollView style={[s.mint, { backgroundColor: renk.bg }]} contentContainerStyle={s.icerik}>
        <Text style={[T.label, { color: renk.text }]}>Kategori</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          <Cip yazi="Hepsi" aktif={kat === null} onPress={() => setKat(null)} renk={renk} />
          {(kategoriler.data ?? []).map((k) => (
            <Cip key={k.id} yazi={k.name} aktif={kat === k.name} onPress={() => setKat(k.name)} renk={renk} />
          ))}
        </ScrollView>

        <Text style={[T.label, { color: renk.text, marginTop: SP.md }]}>Tür</Text>
        <View style={{ flexDirection: "row", gap: SP.lg }}>
          {(["gelir", "gider"] as Yon[]).map((y) => (
            <Pressable key={y} onPress={() => setYon(yon === y ? null : y)} style={s.radio}>
              <Ionicons
                name={yon === y ? "radio-button-on" : "radio-button-off"}
                size={20}
                color={renk.green}
              />
              <Text style={{ color: renk.text, fontSize: 15 }}>{y === "gelir" ? "Gelir" : "Harcama"}</Text>
            </Pressable>
          ))}
        </View>

        <Buton yazi="Ara" onPress={ara} yukleniyor={yukleniyor} style={{ marginTop: SP.lg }} />

        {sonuc && (
          <View style={{ marginTop: SP.lg }}>
            <Text style={[T.label, { color: renk.textMuted, marginBottom: SP.sm }]}>
              {sonuc.length} sonuç
            </Text>
            {sonuc.map((t) => (
              <IslemSatiri key={t.id} islem={t} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function Cip({
  yazi,
  aktif,
  onPress,
  renk,
}: {
  yazi: string;
  aktif: boolean;
  onPress: () => void;
  renk: ReturnType<typeof useRenkler>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        s.cip,
        { backgroundColor: aktif ? renk.green : renk.card, borderColor: renk.border },
      ]}
    >
      <Text style={{ color: aktif ? renk.onGreen : renk.textMuted, fontSize: 12.5, fontWeight: "600" }}>
        {yazi}
      </Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  kok: { flex: 1 },
  ustPad: { paddingHorizontal: SP.lg, paddingTop: SP.sm, paddingBottom: SP.md },
  aramaKutu: {
    flexDirection: "row",
    alignItems: "center",
    gap: SP.sm,
    borderRadius: R.pill,
    paddingHorizontal: SP.lg,
    height: 48,
  },
  aramaInput: { flex: 1, fontSize: 15, fontFamily: "Poppins_500Medium" },
  mint: { flex: 1, borderTopLeftRadius: R.xl, borderTopRightRadius: R.xl },
  icerik: { padding: SP.lg, gap: SP.sm, paddingBottom: 60 },
  cip: { borderWidth: 1, borderRadius: R.pill, paddingHorizontal: 13, paddingVertical: 7 },
  radio: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: SP.sm },
});
