import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { turkceTutar } from "@/lib/format";
import {
  useDeleteTransaction,
  useMe,
  usePatchTransaction,
  useTransactions,
} from "@/lib/queries";
import { useRenkler } from "@/lib/theme";
import { TIP_EMOJI, TIP_ETIKET, type Islem, type Tip } from "@/lib/types";

const TIPLER: Tip[] = ["kisisel", "isletme", "yatirim"];

export default function History() {
  const renk = useRenkler();
  const { data, isLoading, refetch, isRefetching } = useTransactions(30);
  const me = useMe();
  const [acikId, setAcikId] = useState<string | null>(null);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: renk.bg }]} edges={["top"]}>
      <View style={s.header}>
        <Text style={[s.baslik, { color: renk.text }]}>Geçmiş</Text>
        {me.data && (
          <Text style={[s.kota, { color: renk.textMuted }]}>
            {me.data.plan === "pro"
              ? "Pro"
              : `${me.data.ay_kayit}/${me.data.limit} bu ay`}
          </Text>
        )}
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={renk.primary} />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(t) => t.id}
          contentContainerStyle={s.liste}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={renk.primary} />
          }
          ListEmptyComponent={
            <Text style={[s.bos, { color: renk.textMuted }]}>Henüz kayıt yok.</Text>
          }
          renderItem={({ item }) => (
            <Row
              islem={item}
              acik={acikId === item.id}
              onToggle={() => setAcikId(acikId === item.id ? null : item.id)}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

function Row({
  islem,
  acik,
  onToggle,
}: {
  islem: Islem;
  acik: boolean;
  onToggle: () => void;
}) {
  const renk = useRenkler();
  const sil = useDeleteTransaction();
  const patch = usePatchTransaction();
  const [tutar, setTutar] = useState(String(islem.tutar));
  const [kategori, setKategori] = useState(islem.kategori);
  const [tip, setTip] = useState<Tip>(islem.tip);

  function silOnayla() {
    Alert.alert("Sil", `"${islem.aciklama}" silinsin mi?`, [
      { text: "Vazgeç", style: "cancel" },
      { text: "Sil", style: "destructive", onPress: () => sil.mutate(islem.id) },
    ]);
  }

  function kaydet() {
    const alanlar: Record<string, unknown> = {};
    const t = Number(tutar.replace(",", "."));
    if (t > 0 && t !== islem.tutar) alanlar.tutar = t;
    if (kategori && kategori !== islem.kategori) alanlar.kategori = kategori;
    if (tip !== islem.tip) alanlar.tip = tip;
    if (Object.keys(alanlar).length === 0) {
      onToggle();
      return;
    }
    patch.mutate(
      { id: islem.id, alanlar },
      { onSuccess: onToggle, onError: (e) => Alert.alert("Hata", String(e)) },
    );
  }

  return (
    <View style={[s.kart, { backgroundColor: renk.card, borderColor: renk.border }]}>
      <Pressable style={s.ust} onPress={onToggle}>
        <Text style={s.emoji}>{TIP_EMOJI[islem.tip]}</Text>
        <View style={s.flex}>
          <Text style={[s.acik, { color: renk.text }]} numberOfLines={1}>
            {islem.aciklama}
          </Text>
          <Text style={[s.meta, { color: renk.textMuted }]}>
            {islem.kategori} · {islem.tarih}
          </Text>
        </View>
        <Text
          style={[
            s.para,
            { color: islem.direction === "gelir" ? renk.success : renk.text },
          ]}
        >
          {islem.direction === "gelir" ? "+" : "−"}
          {turkceTutar(islem.tutar)} ₺
        </Text>
      </Pressable>

      {acik && (
        <View style={[s.duzenle, { borderTopColor: renk.border }]}>
          <View style={s.satir}>
            <TextInput
              style={[s.input, { color: renk.text, borderColor: renk.border }]}
              value={tutar}
              onChangeText={setTutar}
              keyboardType="decimal-pad"
            />
            <TextInput
              style={[s.input, s.flex, { color: renk.text, borderColor: renk.border }]}
              value={kategori}
              onChangeText={setKategori}
            />
          </View>
          <View style={s.satir}>
            {TIPLER.map((t) => (
              <Pressable
                key={t}
                onPress={() => setTip(t)}
                style={[
                  s.tipSec,
                  { borderColor: renk.border, backgroundColor: t === tip ? renk.primary : "transparent" },
                ]}
              >
                <Text style={{ color: t === tip ? renk.primaryText : renk.textMuted, fontSize: 12 }}>
                  {TIP_ETIKET[t]}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={s.satir}>
            <Pressable style={[s.sil, { borderColor: renk.danger }]} onPress={silOnayla}>
              <Text style={{ color: renk.danger, fontWeight: "600" }}>Sil</Text>
            </Pressable>
            <Pressable
              style={[s.kaydet, s.flex, { backgroundColor: renk.primary }]}
              onPress={kaydet}
              disabled={patch.isPending}
            >
              {patch.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: "#fff", fontWeight: "700" }}>Kaydet</Text>
              )}
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  baslik: { fontSize: 22, fontWeight: "800" },
  kota: { fontSize: 13 },
  liste: { padding: 16, gap: 10 },
  bos: { textAlign: "center", marginTop: 60, fontSize: 15 },
  kart: { borderWidth: 1, borderRadius: 12 },
  ust: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12 },
  emoji: { fontSize: 20 },
  acik: { fontSize: 16, fontWeight: "600" },
  meta: { fontSize: 13, marginTop: 2 },
  para: { fontSize: 15, fontWeight: "700" },
  duzenle: { borderTopWidth: 1, padding: 12, gap: 10 },
  satir: { flexDirection: "row", gap: 8, alignItems: "center" },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 15, minWidth: 80 },
  tipSec: { flex: 1, borderWidth: 1, borderRadius: 8, paddingVertical: 8, alignItems: "center" },
  sil: { borderWidth: 1, borderRadius: 8, paddingVertical: 12, paddingHorizontal: 18, alignItems: "center" },
  kaydet: { borderRadius: 8, paddingVertical: 12, alignItems: "center" },
});
