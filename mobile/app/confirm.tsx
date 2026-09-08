import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { IslemFormu } from "@/components/IslemFormu";
import { Metin as Text } from "@/components/Metin";
import { api, ApiError } from "@/lib/api";
import { turkceTutar } from "@/lib/format";
import { golge, R, SP, useRenkler } from "@/lib/theme";
import type { Aday, CaptureYanit } from "@/lib/types";

export default function Confirm() {
  const renk = useRenkler();
  const router = useRouter();
  const qc = useQueryClient();
  const { data } = useLocalSearchParams<{ data: string }>();

  const yanit = useMemo<CaptureYanit>(() => JSON.parse(String(data)), [data]);
  const [adaylar, setAdaylar] = useState<Aday[]>(yanit.candidates);
  const [kaydediliyor, setKaydediliyor] = useState(false);

  const toplam = adaylar.reduce((t, a) => t + (a.direction === "gelir" ? a.tutar : -a.tutar), 0);

  const guncelle = (i: number, yama: Partial<Aday>) =>
    setAdaylar((eski) => eski.map((a, j) => (j === i ? { ...a, ...yama } : a)));
  const sil = (i: number) => setAdaylar((eski) => eski.filter((_, j) => j !== i));

  async function onayla() {
    if (adaylar.length === 0) return router.back();
    for (const a of adaylar) {
      if (!(a.tutar > 0)) {
        Alert.alert("Geçersiz tutar", `"${a.aciklama}" için tutar 0'dan büyük olmalı.`);
        return;
      }
      if (!a.kategori?.trim()) {
        Alert.alert("Kategori gerekli", `"${a.aciklama}" için bir kategori seç veya oluştur.`);
        return;
      }
    }
    setKaydediliyor(true);
    try {
      await api.saveTransactions(adaylar);
      await qc.invalidateQueries();
      router.back();
    } catch (e) {
      setKaydediliyor(false);
      Alert.alert(
        e instanceof ApiError && e.status === 402 ? "AI limiti doldu" : "Kaydedilemedi",
        e instanceof Error ? e.message : "Tekrar dene.",
      );
    }
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: renk.bg }]} edges={["bottom"]}>
      <ScrollView contentContainerStyle={s.liste} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {yanit.needs_review && (
          <View style={[s.uyari, { backgroundColor: renk.warnSoft }]}>
            <Ionicons name="alert-circle" size={16} color={renk.warn} />
            <Text style={{ color: renk.warn, fontSize: 13, flex: 1 }}>
              Bazı kayıtlar kontrol istiyor — düzelt, sonra onayla.
            </Text>
          </View>
        )}

        {adaylar.map((a, i) => (
          <View
            key={i}
            style={[
              s.kart,
              {
                backgroundColor: renk.card,
                borderColor: a.kategori?.trim() ? renk.border : renk.warn,
              },
              golge(1),
            ]}
          >
            {adaylar.length > 1 && (
              <Pressable onPress={() => sil(i)} hitSlop={10} style={s.silBtn}>
                <Ionicons name="close-circle" size={22} color={renk.textFaint} />
              </Pressable>
            )}
            <IslemFormu deger={a} guncelle={(yama) => guncelle(i, yama)} />
            {!!a.neden && (
              <Text style={{ color: renk.textFaint, fontSize: 12, fontStyle: "italic" }}>
                AI: {a.neden}
              </Text>
            )}
            {a.inceleme_sebepleri.length > 0 && (
              <View style={s.sebepler}>
                {a.inceleme_sebepleri.map((sb, k) => (
                  <Text key={k} style={[s.sebep, { backgroundColor: renk.warnSoft, color: renk.warn }]}>
                    {sb}
                  </Text>
                ))}
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      <View style={[s.altBar, { borderTopColor: renk.hairline, backgroundColor: renk.card }]}>
        <Text style={[s.toplam, { color: renk.textMuted }]}>
          {adaylar.length} kayıt · net {turkceTutar(Math.abs(toplam))} ₺
        </Text>
        <View style={s.butonlar}>
          <Pressable style={[s.iptal, { borderColor: renk.border }]} onPress={() => router.back()}>
            <Text style={{ color: renk.textMuted, fontWeight: "700" }}>İptal</Text>
          </Pressable>
          <Pressable style={[s.onay, { backgroundColor: renk.aksan }]} onPress={onayla} disabled={kaydediliyor}>
            {kaydediliyor ? (
              <ActivityIndicator color={renk.aksanUstu} />
            ) : (
              <>
                <Ionicons name="checkmark" size={18} color={renk.aksanUstu} />
                <Text style={{ color: renk.aksanUstu, fontWeight: "800", fontSize: 16 }}>Onayla</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  liste: { padding: SP.lg, gap: SP.md },
  uyari: { flexDirection: "row", alignItems: "center", gap: SP.sm, padding: SP.md, borderRadius: R.md },
  kart: { borderWidth: StyleSheet.hairlineWidth, borderRadius: R.lg, padding: SP.lg, gap: SP.md },
  silBtn: { position: "absolute", top: 8, right: 8, zIndex: 2 },
  sebepler: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  sebep: { fontSize: 12, paddingHorizontal: 8, paddingVertical: 4, borderRadius: R.sm, overflow: "hidden" },
  altBar: { borderTopWidth: StyleSheet.hairlineWidth, padding: SP.lg, gap: SP.sm },
  toplam: { fontSize: 13, fontWeight: "600", textAlign: "center" },
  butonlar: { flexDirection: "row", gap: SP.sm },
  iptal: { flex: 1, borderWidth: 1, borderRadius: R.md, paddingVertical: 14, alignItems: "center" },
  onay: { flex: 2, borderRadius: R.md, paddingVertical: 14, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6 },
});
