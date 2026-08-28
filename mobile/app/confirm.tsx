import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
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
import { api, ApiError } from "@/lib/api";
import { turkceTutar } from "@/lib/format";
import { useRenkler } from "@/lib/theme";
import { type Aday, type CaptureYanit, TIP_ETIKET, type Tip, type Yon } from "@/lib/types";

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

  const toplam = adaylar.reduce(
    (t, a) => t + (a.direction === "gelir" ? a.tutar : -a.tutar),
    0,
  );

  function guncelle(i: number, yama: Partial<Aday>) {
    setAdaylar((eski) => eski.map((a, j) => (j === i ? { ...a, ...yama } : a)));
  }

  function sil(i: number) {
    setAdaylar((eski) => eski.filter((_, j) => j !== i));
  }

  async function onayla() {
    if (adaylar.length === 0) {
      router.back();
      return;
    }
    for (const a of adaylar) {
      if (!(a.tutar > 0)) {
        Alert.alert("Geçersiz tutar", `"${a.aciklama}" için tutar 0'dan büyük olmalı.`);
        return;
      }
    }
    setKaydediliyor(true);
    try {
      await api.saveTransactions(adaylar);
      await qc.invalidateQueries({ queryKey: ["transactions"] });
      await qc.invalidateQueries({ queryKey: ["me"] });
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
      <ScrollView contentContainerStyle={s.liste}>
        {yanit.needs_review && (
          <Text style={[s.uyariUst, { color: renk.warnText }]}>
            ⚠️ Bazı kayıtlar kontrol istiyor — dokun, düzelt, sonra onayla.
          </Text>
        )}

        {adaylar.map((a, i) => (
          <View key={i} style={[s.kart, { backgroundColor: renk.card, borderColor: renk.border }]}>
            <View style={s.satir}>
              <TextInput
                style={[s.aciklama, { color: renk.text }]}
                value={a.aciklama}
                onChangeText={(v) => guncelle(i, { aciklama: v })}
                placeholder="açıklama"
                placeholderTextColor={renk.textMuted}
              />
              <Pressable onPress={() => sil(i)} hitSlop={10}>
                <Text style={{ color: renk.danger, fontSize: 18 }}>✕</Text>
              </Pressable>
            </View>

            <View style={s.satir}>
              <TextInput
                style={[s.tutar, { color: renk.text, borderColor: renk.border }]}
                value={String(a.tutar)}
                onChangeText={(v) =>
                  guncelle(i, { tutar: Number(v.replace(",", ".")) || 0 })
                }
                keyboardType="decimal-pad"
              />
              <Text style={[s.birim, { color: renk.textMuted }]}>₺</Text>
              <TextInput
                style={[s.kategori, { color: renk.text, borderColor: renk.border }]}
                value={a.kategori}
                onChangeText={(v) => guncelle(i, { kategori: v })}
                placeholder="kategori"
                placeholderTextColor={renk.textMuted}
              />
            </View>

            <Secmeli
              secenekler={TIPLER}
              etiket={(t) => TIP_ETIKET[t]}
              secili={a.tip}
              onSec={(t) => guncelle(i, { tip: t })}
              renk={renk}
            />
            <Secmeli
              secenekler={YONLER}
              etiket={(y) => (y === "gelir" ? "Gelir" : "Gider")}
              secili={a.direction}
              onSec={(y) => guncelle(i, { direction: y })}
              renk={renk}
            />

            <TextInput
              style={[s.tarih, { color: renk.text, borderColor: renk.border }]}
              value={a.tarih}
              onChangeText={(v) => guncelle(i, { tarih: v })}
              placeholder="YYYY-AA-GG"
              placeholderTextColor={renk.textMuted}
            />

            {a.inceleme_sebepleri.length > 0 && (
              <View style={s.sebepler}>
                {a.inceleme_sebepleri.map((sb, k) => (
                  <Text key={k} style={[s.sebep, { backgroundColor: renk.warnBg, color: renk.warnText }]}>
                    {sb}
                  </Text>
                ))}
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      <View style={[s.altBar, { borderTopColor: renk.border, backgroundColor: renk.card }]}>
        <Text style={[s.toplam, { color: renk.text }]}>
          {adaylar.length} kayıt · {turkceTutar(Math.abs(toplam))} ₺
        </Text>
        <View style={s.butonlar}>
          <Pressable style={[s.iptal, { borderColor: renk.border }]} onPress={() => router.back()}>
            <Text style={{ color: renk.textMuted, fontWeight: "600" }}>İptal</Text>
          </Pressable>
          <Pressable
            style={[s.onay, { backgroundColor: renk.success }]}
            onPress={onayla}
            disabled={kaydediliyor}
          >
            {kaydediliyor ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>Onayla</Text>
            )}
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

function Secmeli<T extends string>({
  secenekler,
  etiket,
  secili,
  onSec,
  renk,
}: {
  secenekler: T[];
  etiket: (t: T) => string;
  secili: T;
  onSec: (t: T) => void;
  renk: ReturnType<typeof useRenkler>;
}) {
  return (
    <View style={s.secmeli}>
      {secenekler.map((o) => {
        const aktif = o === secili;
        return (
          <Pressable
            key={o}
            onPress={() => onSec(o)}
            style={[
              s.secenek,
              { borderColor: renk.border, backgroundColor: aktif ? renk.primary : "transparent" },
            ]}
          >
            <Text style={{ color: aktif ? renk.primaryText : renk.textMuted, fontSize: 13 }}>
              {etiket(o)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  liste: { padding: 16, gap: 14 },
  uyariUst: { fontSize: 14, marginBottom: 2 },
  kart: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 10 },
  satir: { flexDirection: "row", alignItems: "center", gap: 8 },
  aciklama: { flex: 1, fontSize: 17, fontWeight: "600" },
  tutar: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 16, minWidth: 90 },
  birim: { fontSize: 16 },
  kategori: { flex: 1, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 15 },
  secmeli: { flexDirection: "row", gap: 6 },
  secenek: { flex: 1, borderWidth: 1, borderRadius: 8, paddingVertical: 8, alignItems: "center" },
  tarih: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 15, alignSelf: "flex-start", minWidth: 130 },
  sebepler: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  sebep: { fontSize: 12, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, overflow: "hidden" },
  altBar: { borderTopWidth: 1, padding: 14, gap: 10 },
  toplam: { fontSize: 15, fontWeight: "600", textAlign: "center" },
  butonlar: { flexDirection: "row", gap: 10 },
  iptal: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  onay: { flex: 2, borderRadius: 10, paddingVertical: 14, alignItems: "center" },
});
