import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { Sekmeli } from "@/components/base";
import { Buton } from "@/components/Buton";
import { Metin as Text } from "@/components/Metin";
import { kategoriIkon } from "@/lib/kategoriIkon";
import { useKategoriRenk } from "@/lib/kategoriRenk";
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  usePatchCategory,
  useSeedBolum,
} from "@/lib/queries";
import { FONT, R, SP, T, useRenkler } from "@/lib/theme";
import { type Kategori, TIP_ETIKET, type Tip } from "@/lib/types";

const TIPLER: Tip[] = ["kisisel", "isletme", "yatirim"];

const kelimeAyir = (s: string): string[] =>
  s.split(/[,\n]/).map((k) => k.trim()).filter(Boolean);

export default function KategoriYonet() {
  const renk = useRenkler();
  const liste = useCategories();
  const olustur = useCreateCategory();
  const bolumEkle = useSeedBolum();

  const [ad, setAd] = useState("");
  const [tip, setTip] = useState<Tip>("kisisel");
  const [kelimeler, setKelimeler] = useState("");

  function ekle() {
    if (!ad.trim()) return;
    olustur.mutate(
      { name: ad.trim(), tip, keywords: kelimeAyir(kelimeler) },
      {
        onSuccess: () => {
          setAd("");
          setKelimeler("");
        },
        onError: (e) => Alert.alert("Eklenemedi", String(e)),
      },
    );
  }

  const grupla = (t: Tip) => (liste.data ?? []).filter((k) => k.tip === t);

  return (
    <ScrollView style={{ backgroundColor: renk.bg }} contentContainerStyle={s.icerik}>
      <View style={[s.form, { backgroundColor: renk.aksanSoft }]}>
        <TextInput
          style={[s.input, { color: renk.text, backgroundColor: renk.bg }]}
          placeholder="Yeni kategori adı"
          placeholderTextColor={renk.textFaint}
          value={ad}
          onChangeText={setAd}
        />
        <Sekmeli secenekler={TIPLER} etiket={(t) => TIP_ETIKET[t]} secili={tip} onSec={setTip} kucuk />
        <TextInput
          style={[s.input, { color: renk.text, backgroundColor: renk.bg }]}
          placeholder="anahtar kelimeler (virgülle): elektrik, su, aidat"
          placeholderTextColor={renk.textFaint}
          value={kelimeler}
          onChangeText={setKelimeler}
        />
        <Buton yazi="Ekle" onPress={ekle} yukleniyor={olustur.isPending} />
      </View>

      {TIPLER.map((t) => {
        const grup = grupla(t);
        return (
          <View key={t} style={{ gap: SP.sm }}>
            <Text style={[T.overline, { color: renk.textFaint, marginTop: SP.sm }]}>{TIP_ETIKET[t]}</Text>
            {grup.length > 0 ? (
              grup.map((k) => <Satir key={k.id} kat={k} />)
            ) : (
              <Pressable
                onPress={() => bolumEkle.mutate(t)}
                disabled={bolumEkle.isPending}
                style={[s.bolumEkle, { borderColor: renk.border }]}
              >
                <Ionicons name="add-circle-outline" size={17} color={renk.aksan} />
                <Text style={{ color: renk.aksan, fontSize: 13.5, fontWeight: "700" }}>
                  {TIP_ETIKET[t]} kategorilerini ekle
                </Text>
              </Pressable>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

function Satir({ kat }: { kat: Kategori }) {
  const renk = useRenkler();
  const katRenk = useKategoriRenk();
  const patch = usePatchCategory();
  const sil = useDeleteCategory();
  const [ad, setAd] = useState(kat.name);
  const [duzenle, setDuzenle] = useState(false);
  const [kelime, setKelime] = useState((kat.keywords ?? []).join(", "));
  const [kelimeDuzenle, setKelimeDuzenle] = useState(false);

  const kelimeler = kat.keywords ?? [];
  const kr = katRenk(kat.name);

  return (
    <View style={[s.satir, { backgroundColor: renk.card }]}>
      <View style={s.satirUst}>
        <View style={[s.ikon, { backgroundColor: kr + "26" }]}>
          <Ionicons name={kategoriIkon(kat.name)} size={16} color={kr} />
        </View>
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

      {kelimeDuzenle ? (
        <TextInput
          style={[s.kelimeInput, { color: renk.textMuted, borderColor: renk.border }]}
          value={kelime}
          onChangeText={setKelime}
          autoFocus
          placeholder="anahtar kelimeler, virgülle"
          placeholderTextColor={renk.textFaint}
          onBlur={() => {
            patch.mutate({ id: kat.id, body: { keywords: kelimeAyir(kelime) } });
            setKelimeDuzenle(false);
          }}
        />
      ) : (
        <Pressable onPress={() => setKelimeDuzenle(true)} hitSlop={6} style={{ marginLeft: 40 }}>
          <Text style={{ color: renk.textFaint, fontSize: 12 }}>
            {kelimeler.length ? kelimeler.join(", ") : "+ anahtar kelime ekle"}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  icerik: { padding: SP.lg, gap: SP.md, paddingBottom: 60 },
  form: { borderRadius: R.md, padding: SP.lg, gap: SP.md },
  input: { borderRadius: R.sm, padding: 12, fontSize: 15, fontFamily: FONT["500"] },
  bolumEkle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: R.sm,
    paddingVertical: 14,
  },
  satir: { gap: 6, padding: 13, borderRadius: R.sm },
  satirUst: { flexDirection: "row", alignItems: "center", gap: SP.md },
  ikon: { width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  satirInput: { flex: 1, borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5, fontSize: 15 },
  kelimeInput: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontSize: 12.5,
    marginLeft: 40,
  },
});
