import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  SectionList,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Metin as Text } from "@/components/Metin";
import { SafeAreaView } from "react-native-safe-area-context";
import { BosDurum, Cip, IkonDaire } from "@/components/base";
import { tarihEtiket, turkceTutar } from "@/lib/format";
import { kategoriIkon } from "@/lib/kategoriIkon";
import { useDeleteTransaction, usePatchTransaction, useTransactions } from "@/lib/queries";
import { golge, R, SP, useRenkler } from "@/lib/theme";
import { type Islem, TIP_ETIKET, TIP_RENK, type Tip } from "@/lib/types";

const TIPLER: Tip[] = ["kisisel", "isletme", "yatirim"];
type Donem = "hepsi" | "buhafta" | "buay" | "buyil";
const DONEMLER: Donem[] = ["hepsi", "buhafta", "buay", "buyil"];
const DETIKET: Record<Donem, string> = { hepsi: "Tümü", buhafta: "Bu hafta", buay: "Bu ay", buyil: "Bu yıl" };

function aralik(d: Donem): { from?: string; to?: string } {
  if (d === "hepsi") return {};
  const now = new Date();
  const iso = (x: Date) => x.toISOString().slice(0, 10);
  const to = iso(now);
  if (d === "buhafta") {
    const b = new Date(now);
    b.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    return { from: iso(b), to };
  }
  if (d === "buay") return { from: iso(new Date(now.getFullYear(), now.getMonth(), 1)), to };
  return { from: iso(new Date(now.getFullYear(), 0, 1)), to };
}

export default function Gecmis() {
  const renk = useRenkler();
  const [acikId, setAcikId] = useState<string | null>(null);
  const [donem, setDonem] = useState<Donem>("buay");
  const [tipF, setTipF] = useState<Tip | null>(null);

  const { from, to } = aralik(donem);
  const q = useTransactions({ limit: 400, from, to, tip: tipF ?? undefined });

  const bolumler = useMemo(() => {
    const map = new Map<string, Islem[]>();
    for (const t of q.data ?? []) {
      const k = t.tarih;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(t);
    }
    return [...map.entries()]
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([tarih, data]) => ({
        tarih,
        toplam: data.reduce((s, t) => s + (t.direction === "gelir" ? 0 : t.tutar), 0),
        data,
      }));
  }, [q.data]);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: renk.bg }]} edges={["top"]}>
      <View style={s.header}>
        <Text style={[s.baslik, { color: renk.text }]}>Geçmiş</Text>
        <Text style={{ color: renk.textFaint, fontSize: 13 }}>{(q.data ?? []).length} kayıt</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.cipSira}
      >
        {DONEMLER.map((d) => (
          <Cip key={d} yazi={DETIKET[d]} aktif={donem === d} onPress={() => setDonem(d)} />
        ))}
        <View style={[s.ayrac, { backgroundColor: renk.border }]} />
        <Cip yazi="Tümü" aktif={tipF === null} onPress={() => setTipF(null)} />
        {TIPLER.map((t) => (
          <Cip
            key={t}
            yazi={TIP_ETIKET[t]}
            aktif={tipF === t}
            renkli={TIP_RENK[t]}
            onPress={() => setTipF(tipF === t ? null : t)}
          />
        ))}
      </ScrollView>

      {q.isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={renk.primary} />
      ) : bolumler.length === 0 ? (
        <BosDurum ikon="receipt-outline" yazi="Bu filtrede kayıt yok" />
      ) : (
        <SectionList
          sections={bolumler}
          keyExtractor={(t) => t.id}
          contentContainerStyle={{ padding: SP.lg, paddingBottom: 40 }}
          stickySectionHeadersEnabled={false}
          refreshControl={
            <RefreshControl refreshing={q.isRefetching} onRefresh={q.refetch} tintColor={renk.primary} />
          }
          renderSectionHeader={({ section }) => (
            <View style={s.bolumBaslik}>
              <Text style={{ color: renk.textMuted, fontWeight: "700", fontSize: 13 }}>
                {tarihEtiket(section.tarih)}
              </Text>
              <Text style={{ color: renk.textFaint, fontSize: 12 }}>
                {turkceTutar(section.toplam)} ₺
              </Text>
            </View>
          )}
          renderItem={({ item }) => (
            <Satir
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

function Satir({ islem, acik, onToggle }: { islem: Islem; acik: boolean; onToggle: () => void }) {
  const renk = useRenkler();
  const sil = useDeleteTransaction();
  const patch = usePatchTransaction();
  const [tutar, setTutar] = useState(String(islem.tutar));
  const [kategori, setKategori] = useState(islem.kategori);
  const [tip, setTip] = useState<Tip>(islem.tip);

  function silOnay() {
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
    if (Object.keys(alanlar).length === 0) return onToggle();
    patch.mutate(
      { id: islem.id, alanlar },
      { onSuccess: onToggle, onError: (e) => Alert.alert("Hata", String(e)) },
    );
  }

  return (
    <View style={[s.kart, { backgroundColor: renk.card, borderColor: renk.border }, golge(1)]}>
      <Pressable style={s.ust} onPress={onToggle}>
        <IkonDaire ikon={kategoriIkon(islem.kategori)} renk={TIP_RENK[islem.tip]} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: renk.text, fontWeight: "600", fontSize: 15 }} numberOfLines={1}>
            {islem.aciklama}
          </Text>
          <Text style={{ color: renk.textFaint, fontSize: 12 }}>{islem.kategori}</Text>
        </View>
        <Text
          style={{
            color: islem.direction === "gelir" ? renk.gelir : renk.text,
            fontWeight: "700",
            fontSize: 15,
          }}
        >
          {islem.direction === "gelir" ? "+" : "−"}
          {turkceTutar(islem.tutar)}
        </Text>
      </Pressable>

      {acik && (
        <View style={[s.duzenle, { borderTopColor: renk.hairline }]}>
          <View style={s.satir}>
            <TextInput
              style={[s.input, { color: renk.text, borderColor: renk.border }]}
              value={tutar}
              onChangeText={setTutar}
              keyboardType="decimal-pad"
            />
            <TextInput
              style={[s.input, { flex: 1, color: renk.text, borderColor: renk.border }]}
              value={kategori}
              onChangeText={setKategori}
              placeholder="kategori"
              placeholderTextColor={renk.textFaint}
            />
          </View>
          <View style={s.satir}>
            {TIPLER.map((t) => (
              <Pressable
                key={t}
                onPress={() => setTip(t)}
                style={[
                  s.tipSec,
                  { borderColor: renk.border, backgroundColor: t === tip ? TIP_RENK[t] : "transparent" },
                ]}
              >
                <Text style={{ color: t === tip ? "#fff" : renk.textMuted, fontSize: 12 }}>
                  {TIP_ETIKET[t]}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={s.satir}>
            <Pressable style={[s.silBtn, { borderColor: renk.danger }]} onPress={silOnay}>
              <Ionicons name="trash-outline" size={15} color={renk.danger} />
              <Text style={{ color: renk.danger, fontWeight: "600", fontSize: 13 }}>Sil</Text>
            </Pressable>
            <Pressable
              style={[s.kaydetBtn, { backgroundColor: renk.primary }]}
              onPress={kaydet}
              disabled={patch.isPending}
            >
              {patch.isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>Kaydet</Text>
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SP.lg,
    paddingTop: SP.sm,
    paddingBottom: SP.sm,
  },
  baslik: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  cipSira: { paddingHorizontal: SP.lg, paddingBottom: SP.md, gap: 6, alignItems: "center" },
  ayrac: { width: StyleSheet.hairlineWidth, height: 20, marginHorizontal: 2 },
  bolumBaslik: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: SP.md,
    marginBottom: SP.sm,
  },
  kart: { borderWidth: StyleSheet.hairlineWidth, borderRadius: R.md, marginBottom: SP.sm },
  ust: { flexDirection: "row", alignItems: "center", gap: SP.md, padding: SP.md },
  duzenle: { borderTopWidth: StyleSheet.hairlineWidth, padding: SP.md, gap: SP.sm },
  satir: { flexDirection: "row", gap: SP.sm, alignItems: "center" },
  input: { borderWidth: 1, borderRadius: R.sm, paddingHorizontal: 10, paddingVertical: 8, fontSize: 15, minWidth: 90 },
  tipSec: { flex: 1, borderWidth: 1, borderRadius: R.sm, paddingVertical: 8, alignItems: "center" },
  silBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: R.sm,
    paddingVertical: 11,
    paddingHorizontal: 16,
  },
  kaydetBtn: { flex: 1, borderRadius: R.sm, paddingVertical: 11, alignItems: "center" },
});
