import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { Metin as Text } from "@/components/Metin";
import { kategoriIkon } from "@/lib/kategoriIkon";
import { useKategoriRenk } from "@/lib/kategoriRenk";
import { useCreateCategory } from "@/lib/queries";
import { FONT, R, useRenkler } from "@/lib/theme";
import type { Kategori, Tip } from "@/lib/types";

export function KategoriSecici({
  kategoriler,
  tip,
  secili,
  onSec,
}: {
  kategoriler: Kategori[];
  tip: Tip;
  secili: string;
  onSec: (ad: string) => void;
}) {
  const renk = useRenkler();
  const katRenk = useKategoriRenk();
  const olustur = useCreateCategory();
  const [yeniAcik, setYeniAcik] = useState(false);
  const [yeniAd, setYeniAd] = useState("");

  const uygun = kategoriler.filter((k) => k.tip === tip && k.is_active);
  const eslesme = uygun.find((k) => k.name === secili);
  // AI'ın önerdiği ama listede olmayan değer
  const eksik = secili.trim() && !eslesme ? secili.trim() : "";

  function kapat() {
    setYeniAcik(false);
    setYeniAd("");
  }

  function kaydet(ad: string) {
    const t = ad.trim();
    if (!t) return;
    const varOlan = uygun.find((k) => k.name.toLowerCase() === t.toLowerCase());
    if (varOlan) {
      onSec(varOlan.name);
      kapat();
      return;
    }
    olustur.mutate(
      { name: t, tip },
      {
        onSuccess: (k) => {
          onSec(k.name);
          kapat();
        },
        onError: (e) => Alert.alert("Eklenemedi", String(e)),
      },
    );
  }

  return (
    <View style={{ gap: 6 }}>
      {!secili.trim() && (
        <Text style={{ color: renk.textFaint, fontSize: 12.5 }}>bir kategori seç →</Text>
      )}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 6, paddingVertical: 2 }}
        keyboardShouldPersistTaps="handled"
      >
        {eksik !== "" && (
          <Pressable
            onPress={() => kaydet(eksik)}
            style={[s.cip, { borderStyle: "dashed", borderColor: renk.aksan }]}
          >
            <Ionicons name="add" size={13} color={renk.aksan} />
            <Text style={{ color: renk.aksan, fontSize: 12.5, fontWeight: "600" }}>{eksik}</Text>
          </Pressable>
        )}
        {uygun.map((k) => {
          const aktif = k.name === secili;
          const kr = katRenk(k.name);
          return (
            <Pressable
              key={k.id}
              onPress={() => onSec(k.name)}
              style={[
                s.cip,
                {
                  borderColor: aktif ? kr : renk.border,
                  backgroundColor: aktif ? kr : "transparent",
                },
              ]}
            >
              <Ionicons
                name={aktif ? "checkmark" : kategoriIkon(k.name)}
                size={13}
                color={aktif ? "#fff" : kr}
              />
              <Text
                style={{
                  color: aktif ? "#fff" : renk.textMuted,
                  fontSize: 12.5,
                  fontWeight: "600",
                }}
              >
                {k.name}
              </Text>
            </Pressable>
          );
        })}
        {!yeniAcik && (
          <Pressable onPress={() => setYeniAcik(true)} style={[s.cip, { borderColor: renk.border }]}>
            <Ionicons name="add" size={13} color={renk.textMuted} />
            <Text style={{ color: renk.textMuted, fontSize: 12.5, fontWeight: "600" }}>Yeni</Text>
          </Pressable>
        )}
      </ScrollView>

      {yeniAcik && (
        <View style={s.yeniSatir}>
          <TextInput
            style={[s.yeniInput, { color: renk.text, backgroundColor: renk.cardAlt }]}
            value={yeniAd}
            onChangeText={setYeniAd}
            autoFocus
            placeholder="yeni kategori adı"
            placeholderTextColor={renk.textFaint}
            onSubmitEditing={() => kaydet(yeniAd)}
            returnKeyType="done"
          />
          <Pressable
            onPress={() => kaydet(yeniAd)}
            disabled={olustur.isPending || !yeniAd.trim()}
            style={[s.yeniBtn, { backgroundColor: renk.aksan, opacity: yeniAd.trim() ? 1 : 0.5 }]}
          >
            <Ionicons name="checkmark" size={18} color={renk.aksanUstu} />
          </Pressable>
          <Pressable onPress={kapat} style={[s.yeniBtn, { borderWidth: 1, borderColor: renk.border }]}>
            <Ionicons name="close" size={18} color={renk.textMuted} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  cip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: R.pill,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  yeniSatir: { flexDirection: "row", gap: 6, alignItems: "center" },
  yeniInput: {
    flex: 1,
    borderRadius: R.sm,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14.5,
    fontFamily: FONT["500"],
  },
  yeniBtn: { width: 38, height: 38, borderRadius: R.sm, alignItems: "center", justifyContent: "center" },
});
