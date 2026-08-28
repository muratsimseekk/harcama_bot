import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { KategoriListesi, PastaGrafik } from "@/components/charts";
import { Kart, KiyasRozet, Segment } from "@/components/ui";
import { tarihEtiket, turkceTutar } from "@/lib/format";
import { useSummary, useTransactions } from "@/lib/queries";
import { useRenkler } from "@/lib/theme";
import { TIP_EMOJI, TIP_RENK } from "@/lib/types";

type Secim = "buay" | "gecenay" | "buyil";
const SECIMLER: Secim[] = ["buay", "gecenay", "buyil"];
const ETIKET: Record<Secim, string> = { buay: "Bu ay", gecenay: "Geçen ay", buyil: "Bu yıl" };

function refTarih(sec: Secim): { period: "month" | "year"; ref?: string } {
  if (sec === "buyil") return { period: "year" };
  if (sec === "gecenay") {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - 1);
    return { period: "month", ref: d.toISOString().slice(0, 10) };
  }
  return { period: "month" };
}

export default function Dashboard() {
  const renk = useRenkler();
  const router = useRouter();
  const [sec, setSec] = useState<Secim>("buay");
  const { period, ref } = refTarih(sec);

  const ozet = useSummary(period, ref);
  const sonlar = useTransactions({ limit: 8 });

  const dilimler = useMemo(() => {
    const g = ozet.data?.bu_donem;
    if (!g) return [];
    return g.tip_kirilim.map((t) => ({
      ad: t.etiket,
      tutar: t.tutar,
      oran: t.oran,
      renk: TIP_RENK[t.tip],
    }));
  }, [ozet.data]);

  const katDilimler = useMemo(() => {
    const g = ozet.data?.bu_donem;
    if (!g) return [];
    const ilk6 = g.kategori_kirilim.slice(0, 6);
    const kalan = g.kategori_kirilim.slice(6);
    const arr = ilk6.map((k) => ({ ad: k.kategori, tutar: k.tutar, oran: k.oran }));
    if (kalan.length) {
      const t = kalan.reduce((s, k) => s + k.tutar, 0);
      arr.push({ ad: `Diğer (${kalan.length})`, tutar: t, oran: 0 });
    }
    return arr;
  }, [ozet.data]);

  const yenile = () => {
    ozet.refetch();
    sonlar.refetch();
  };

  const g = ozet.data?.bu_donem;
  const o = ozet.data?.onceki;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: renk.bg }]} edges={["top"]}>
      <ScrollView
        contentContainerStyle={s.icerik}
        refreshControl={
          <RefreshControl refreshing={ozet.isRefetching} onRefresh={yenile} tintColor={renk.primary} />
        }
      >
        <Text style={[s.baslik, { color: renk.text }]}>Özet</Text>

        <Segment secenekler={SECIMLER} etiket={(x) => ETIKET[x]} secili={sec} onSec={setSec} />

        {ozet.isLoading || !g ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={renk.primary} />
        ) : (
          <>
            <Kart style={s.toplamKart}>
              <Text style={[s.toplamEtiket, { color: renk.textMuted }]}>
                {ozet.data?.etiket} · toplam gider
              </Text>
              <Text style={[s.toplamDeger, { color: renk.text }]}>
                {turkceTutar(g.toplam_gider)} ₺
              </Text>
              {o && <KiyasRozet bu={g.toplam_gider} onceki={o.toplam_gider} />}
              {g.toplam_gelir > 0 && (
                <Text style={[s.gelirSatir, { color: renk.success }]}>
                  Gelir {turkceTutar(g.toplam_gelir)} ₺ · Net {turkceTutar(g.net)} ₺
                </Text>
              )}
            </Kart>

            <Kart>
              <Text style={[s.kartBaslik, { color: renk.text }]}>Tür dağılımı</Text>
              <PastaGrafik dilimler={dilimler} />
            </Kart>

            {katDilimler.length > 0 && (
              <Kart>
                <Text style={[s.kartBaslik, { color: renk.text }]}>Kategoriler</Text>
                <KategoriListesi dilimler={katDilimler} />
              </Kart>
            )}
          </>
        )}

        <Kart>
          <Text style={[s.kartBaslik, { color: renk.text }]}>Son hareketler</Text>
          {sonlar.isLoading ? (
            <ActivityIndicator color={renk.primary} />
          ) : (sonlar.data ?? []).length === 0 ? (
            <Text style={{ color: renk.textMuted }}>Henüz kayıt yok.</Text>
          ) : (
            (sonlar.data ?? []).map((t) => (
              <View key={t.id} style={[s.hareket, { borderBottomColor: renk.border }]}>
                <Text style={{ fontSize: 16 }}>{TIP_EMOJI[t.tip]}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: renk.text, fontWeight: "600" }} numberOfLines={1}>
                    {t.aciklama}
                  </Text>
                  <Text style={{ color: renk.textMuted, fontSize: 12 }}>
                    {t.kategori} · {tarihEtiket(t.tarih)}
                  </Text>
                </View>
                <Text
                  style={{ color: t.direction === "gelir" ? renk.success : renk.text, fontWeight: "700" }}
                >
                  {t.direction === "gelir" ? "+" : "−"}
                  {turkceTutar(t.tutar)} ₺
                </Text>
              </View>
            ))
          )}
          <Text
            style={[s.tumu, { color: renk.primary }]}
            onPress={() => router.navigate("/(app)/gecmis")}
          >
            Tümünü gör →
          </Text>
        </Kart>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  icerik: { padding: 16, gap: 14, paddingBottom: 32 },
  baslik: { fontSize: 26, fontWeight: "800" },
  toplamKart: { gap: 8 },
  toplamEtiket: { fontSize: 13 },
  toplamDeger: { fontSize: 32, fontWeight: "800" },
  gelirSatir: { fontSize: 13, fontWeight: "600" },
  kartBaslik: { fontSize: 15, fontWeight: "700", marginBottom: 12 },
  hareket: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tumu: { fontSize: 14, fontWeight: "600", marginTop: 12, textAlign: "center" },
});
