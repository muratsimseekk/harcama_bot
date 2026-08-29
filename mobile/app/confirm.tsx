import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Metin as Text } from "@/components/Metin";
import { SafeAreaView } from "react-native-safe-area-context";
import { Sekmeli } from "@/components/base";
import { api, ApiError } from "@/lib/api";
import { turkceTutar } from "@/lib/format";
import { useCategories } from "@/lib/queries";
import { golge, R, SP, useRenkler } from "@/lib/theme";
import { type Aday, type CaptureYanit, type Kategori, TIP_ETIKET, type Tip, type Yon } from "@/lib/types";

const TIPLER: Tip[] = ["kisisel", "isletme", "yatirim"];
const YONLER: Yon[] = ["gider", "gelir"];

export default function Confirm() {
  const renk = useRenkler();
  const router = useRouter();
  const qc = useQueryClient();
  const { data } = useLocalSearchParams<{ data: string }>();

  const yanit = useMemo<CaptureYanit>(() => JSON.parse(String(data)), [data]);
  const [adaylar, setAdaylar] = useState<Aday[]>(yanit.candidates);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const kategoriler = useCategories();

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
    }
    setKaydediliyor(true);
    try {
      await api.saveTransactions(adaylar);
      await qc.invalidateQueries();
      router.back();
    } catch (e) {
      setKaydediliyor(false);
      Alert.alert(
        e instanceof ApiError && e.status === 402 ? "Limit doldu" : "Kaydedilemedi",
        e instanceof Error ? e.message : "Tekrar dene.",
      );
    }
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: renk.bg }]} edges={["bottom"]}>
      <ScrollView contentContainerStyle={s.liste} showsVerticalScrollIndicator={false}>
        {yanit.needs_review && (
          <View style={[s.uyari, { backgroundColor: renk.warnSoft }]}>
            <Ionicons name="alert-circle" size={16} color={renk.warn} />
            <Text style={{ color: renk.warn, fontSize: 13, flex: 1 }}>
              Bazı kayıtlar kontrol istiyor — düzelt, sonra onayla.
            </Text>
          </View>
        )}

        {adaylar.map((a, i) => (
          <View key={i} style={[s.kart, { backgroundColor: renk.card, borderColor: renk.border }, golge(1)]}>
            <View style={s.satir}>
              <TextInput
                style={[s.aciklama, { color: renk.text }]}
                value={a.aciklama}
                onChangeText={(v) => guncelle(i, { aciklama: v })}
                placeholder="açıklama"
                placeholderTextColor={renk.textFaint}
              />
              {adaylar.length > 1 && (
                <Pressable onPress={() => sil(i)} hitSlop={10}>
                  <Ionicons name="close-circle" size={22} color={renk.textFaint} />
                </Pressable>
              )}
            </View>

            <View style={s.satir}>
              <View style={[s.tutarKutu, { borderColor: renk.border }]}>
                <TextInput
                  style={[s.tutar, { color: renk.text }]}
                  value={String(a.tutar)}
                  onChangeText={(v) => guncelle(i, { tutar: Number(v.replace(",", ".")) || 0 })}
                  keyboardType="decimal-pad"
                />
                <Text style={{ color: renk.textMuted, fontSize: 15 }}>₺</Text>
              </View>
              <TextInput
                style={[s.kategori, { color: renk.text, borderColor: renk.border }]}
                value={a.kategori}
                onChangeText={(v) => guncelle(i, { kategori: v })}
                placeholder="kategori"
                placeholderTextColor={renk.textFaint}
              />
            </View>

            <KategoriSecici
              kategoriler={kategoriler.data ?? []}
              tip={a.tip}
              secili={a.kategori}
              onSec={(ad) => guncelle(i, { kategori: ad })}
            />

            <Sekmeli
              secenekler={TIPLER}
              etiket={(t) => TIP_ETIKET[t]}
              secili={a.tip}
              onSec={(t) => guncelle(i, { tip: t })}
              kucuk
            />
            <Sekmeli
              secenekler={YONLER}
              etiket={(y) => (y === "gelir" ? "Gelir" : "Gider")}
              secili={a.direction}
              onSec={(y) => guncelle(i, { direction: y })}
              kucuk
            />

            <View style={s.satir}>
              <Ionicons name="calendar-outline" size={16} color={renk.textMuted} />
              <TextInput
                style={[s.tarih, { color: renk.text, borderColor: renk.border }]}
                value={a.tarih}
                onChangeText={(v) => guncelle(i, { tarih: v })}
                placeholder="YYYY-AA-GG"
                placeholderTextColor={renk.textFaint}
              />
            </View>

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
          <Pressable
            style={[s.onay, { backgroundColor: renk.gelir }]}
            onPress={onayla}
            disabled={kaydediliyor}
          >
            {kaydediliyor ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark" size={18} color="#fff" />
                <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>Onayla</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

function KategoriSecici({
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
  const uygun = kategoriler.filter((k) => k.tip === tip && k.is_active);
  if (uygun.length === 0) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 6, paddingVertical: 2 }}
    >
      {uygun.map((k) => {
        const aktif = k.name === secili;
        return (
          <Pressable
            key={k.id}
            onPress={() => onSec(k.name)}
            style={[
              s.katCip,
              {
                borderColor: k.color || renk.border,
                backgroundColor: aktif ? k.color || renk.primary : "transparent",
              },
            ]}
          >
            <Text style={{ color: aktif ? "#fff" : renk.textMuted, fontSize: 12.5, fontWeight: "600" }}>
              {k.name}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  liste: { padding: SP.lg, gap: SP.md },
  uyari: { flexDirection: "row", alignItems: "center", gap: SP.sm, padding: SP.md, borderRadius: R.md },
  kart: { borderWidth: StyleSheet.hairlineWidth, borderRadius: R.lg, padding: SP.lg, gap: SP.md },
  satir: { flexDirection: "row", alignItems: "center", gap: SP.sm },
  aciklama: { flex: 1, fontSize: 17, fontWeight: "700" },
  tutarKutu: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: R.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  tutar: { fontSize: 16, minWidth: 70, fontWeight: "600" },
  kategori: { flex: 1, borderWidth: 1, borderRadius: R.sm, paddingHorizontal: 10, paddingVertical: 9, fontSize: 15 },
  katCip: { borderWidth: 1, borderRadius: R.pill, paddingHorizontal: 11, paddingVertical: 6 },
  tarih: { borderWidth: 1, borderRadius: R.sm, paddingHorizontal: 10, paddingVertical: 8, fontSize: 15, flex: 1 },
  sebepler: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  sebep: { fontSize: 12, paddingHorizontal: 8, paddingVertical: 4, borderRadius: R.sm, overflow: "hidden" },
  altBar: { borderTopWidth: StyleSheet.hairlineWidth, padding: SP.lg, gap: SP.sm },
  toplam: { fontSize: 13, fontWeight: "600", textAlign: "center" },
  butonlar: { flexDirection: "row", gap: SP.sm },
  iptal: { flex: 1, borderWidth: 1, borderRadius: R.md, paddingVertical: 14, alignItems: "center" },
  onay: { flex: 2, borderRadius: R.md, paddingVertical: 14, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6 },
});
