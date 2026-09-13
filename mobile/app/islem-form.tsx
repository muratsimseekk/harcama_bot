import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Buton } from "@/components/Buton";
import { IslemFormu, type IslemAlanlari } from "@/components/IslemFormu";
import { IslemKatmani, useIslemKatmani } from "@/components/IslemKatmani";
import { Metin as Text } from "@/components/Metin";
import { useUyari } from "@/components/Uyari";
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
  const uyari = useUyari();
  const katman = useIslemKatmani();
  const mesgul = katman.durum !== null;

  const guncelle = (yama: Partial<IslemAlanlari>) => setAlan((e) => ({ ...e, ...yama }));

  async function kaydet() {
    if (!(alan.tutar > 0)) return uyari("Geçersiz tutar", "Tutar 0'dan büyük olmalı.");
    if (!alan.aciklama.trim()) return uyari("Başlık gerekli");
    try {
      await katman.calistir({
        bekleyen: mevcut ? "Güncelleniyor" : "Kaydediliyor",
        basarili: mevcut ? "Güncellendi" : "Kaydedildi",
        is: () =>
          mevcut
            ? patch.mutateAsync({ id: mevcut.id, alanlar: alan })
            : kaydetYeni.mutateAsync([
                { ...alan, para_birimi: "TRY", emin: true, inceleme_sebepleri: [] },
              ]),
        sonra: () => router.back(),
      });
    } catch (e) {
      uyari(
        e instanceof ApiError && e.status === 402 ? "Limit doldu" : "Kaydedilemedi",
        e instanceof Error ? e.message : "Tekrar dene.",
      );
    }
  }

  function silSor() {
    if (!mevcut) return;
    uyari(mevcut.aciklama, "Bu kayıt silinsin mi?", [
      { yazi: "Vazgeç", stil: "vazgec" },
      {
        yazi: "Sil",
        stil: "tehlike",
        onPress: async () => {
          try {
            await katman.calistir({
              bekleyen: "Siliniyor",
              basarili: "Silindi",
              is: () => sil.mutateAsync(mevcut.id),
              sonra: () => router.back(),
            });
          } catch (e) {
            uyari("Silinemedi", e instanceof Error ? e.message : "Tekrar dene.");
          }
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

      <IslemKatmani durum={katman.durum} />
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
