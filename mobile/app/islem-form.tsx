import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Buton } from "@/components/Buton";
import { IslemFormu, type IslemAlanlari } from "@/components/IslemFormu";
import { Metin as Text } from "@/components/Metin";
import { ApiError } from "@/lib/api";
import { useDeleteTransaction, usePatchTransaction, useSaveTransactions } from "@/lib/queries";
import { R, SP, T, useRenkler } from "@/lib/theme";
import type { Islem } from "@/lib/types";

function bugun(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function IslemForm() {
  const renk = useRenkler();
  const router = useRouter();
  const { islem } = useLocalSearchParams<{ islem?: string }>();
  const mevcut: Islem | null = islem ? JSON.parse(String(islem)) : null;
  const patch = usePatchTransaction();
  const kaydetYeni = useSaveTransactions();
  const sil = useDeleteTransaction();

  const [alan, setAlan] = useState<IslemAlanlari>({
    aciklama: mevcut?.aciklama ?? "",
    tutar: mevcut?.tutar ?? 0,
    kategori: mevcut?.kategori ?? "",
    tip: mevcut?.tip ?? "kisisel",
    direction: mevcut?.direction ?? "gider",
    tarih: mevcut?.tarih ?? bugun(),
  });
  const [mesgul, setMesgul] = useState(false);

  const guncelle = (yama: Partial<IslemAlanlari>) => setAlan((e) => ({ ...e, ...yama }));

  async function kaydet() {
    if (!(alan.tutar > 0)) return Alert.alert("Geçersiz tutar", "Tutar 0'dan büyük olmalı.");
    if (!alan.aciklama.trim()) return Alert.alert("Başlık gerekli");
    setMesgul(true);
    try {
      if (mevcut) {
        await patch.mutateAsync({ id: mevcut.id, alanlar: alan });
      } else {
        await kaydetYeni.mutateAsync([
          { ...alan, para_birimi: "TRY", emin: true, inceleme_sebepleri: [] },
        ]);
      }
      router.back();
    } catch (e) {
      setMesgul(false);
      Alert.alert(
        e instanceof ApiError && e.status === 402 ? "Limit doldu" : "Kaydedilemedi",
        e instanceof Error ? e.message : "Tekrar dene.",
      );
    }
  }

  function silSor() {
    if (!mevcut) return;
    Alert.alert(mevcut.aciklama, "Bu kayıt silinsin mi?", [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Sil",
        style: "destructive",
        onPress: async () => {
          await sil.mutateAsync(mevcut.id);
          router.back();
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: renk.bg }]} edges={["top", "bottom"]}>
      <View style={s.baslikSatir}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={{ color: renk.textMuted, fontSize: 15, fontWeight: "600" }}>Vazgeç</Text>
        </Pressable>
        <Text style={[T.heading, { color: renk.text }]}>{mevcut ? "İşlemi düzenle" : "Elle ekle"}</Text>
        {mevcut ? (
          <Pressable onPress={silSor} hitSlop={12}>
            <Text style={{ color: renk.danger, fontSize: 15, fontWeight: "600" }}>Sil</Text>
          </Pressable>
        ) : (
          <View style={{ width: 44 }} />
        )}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={s.icerik} keyboardShouldPersistTaps="handled">
          <IslemFormu deger={alan} guncelle={guncelle} />
          <Buton
            yazi={mevcut ? "Kaydet" : "Ekle"}
            onPress={kaydet}
            yukleniyor={mesgul}
            style={{ marginTop: SP.md }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  baslikSatir: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SP.lg,
    paddingVertical: SP.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "transparent",
  },
  icerik: { padding: SP.lg, gap: SP.md, paddingBottom: 60 },
  _r: { borderRadius: R.md },
});
