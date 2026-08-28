import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CubukGrafik, KategoriListesi } from "@/components/charts";
import { Kart, KiyasRozet, Segment } from "@/components/ui";
import { kisaGun, turkceTutar } from "@/lib/format";
import { useSummary } from "@/lib/queries";
import { useRenkler } from "@/lib/theme";
import type { Granularity } from "@/lib/types";
import { TIP_RENK } from "@/lib/types";

const GRAN: Granularity[] = ["week", "month", "year"];
const GETIKET: Record<Granularity, string> = { week: "Hafta", month: "Ay", year: "Yıl" };
const AYLAR = [
  "Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara",
];

function kaydir(period: Granularity, ref: Date, yon: number): Date {
  const d = new Date(ref);
  if (period === "week") d.setDate(d.getDate() + 7 * yon);
  else if (period === "year") d.setFullYear(d.getFullYear() + yon, 0, 1);
  else d.setMonth(d.getMonth() + yon, 1);
  return d;
}

export default function Rapor() {
  const renk = useRenkler();
  const [period, setPeriod] = useState<Granularity>("month");
  const [ref, setRef] = useState<Date>(new Date());
  const refStr = ref.toISOString().slice(0, 10);

  const ozet = useSummary(period, refStr);
  const g = ozet.data?.bu_donem;
  const o = ozet.data?.onceki;

  const grafik = useMemo(() => {
    if (!g) return { etiketler: [] as string[], degerler: [] as number[] };
    if (period === "year") {
      const aylik = Array(12).fill(0);
      for (const gn of g.gunluk) {
        const ay = Number(gn.tarih.slice(5, 7)) - 1;
        aylik[ay] += gn.gider;
      }
      return { etiketler: AYLAR, degerler: aylik };
    }
    return {
      etiketler: g.gunluk.map((x) => kisaGun(x.tarih)),
      degerler: g.gunluk.map((x) => x.gider),
    };
  }, [g, period]);

  const katDilimler = (g?.kategori_kirilim ?? []).map((k) => ({
    ad: k.kategori,
    tutar: k.tutar,
    oran: k.oran,
  }));

  function setGran(p: Granularity) {
    setPeriod(p);
    setRef(new Date());
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: renk.bg }]} edges={["top"]}>
      <ScrollView
        contentContainerStyle={s.icerik}
        refreshControl={
          <RefreshControl refreshing={ozet.isRefetching} onRefresh={ozet.refetch} tintColor={renk.primary} />
        }
      >
        <Text style={[s.baslik, { color: renk.text }]}>Rapor</Text>

        <Segment secenekler={GRAN} etiket={(x) => GETIKET[x]} secili={period} onSec={setGran} />

        <View style={s.gezinme}>
          <Pressable onPress={() => setRef(kaydir(period, ref, -1))} hitSlop={12}>
            <Text style={[s.ok, { color: renk.primary }]}>‹</Text>
          </Pressable>
          <Text style={[s.donem, { color: renk.text }]}>{ozet.data?.etiket ?? "…"}</Text>
          <Pressable onPress={() => setRef(kaydir(period, ref, 1))} hitSlop={12}>
            <Text style={[s.ok, { color: renk.primary }]}>›</Text>
          </Pressable>
        </View>

        {ozet.isLoading || !g ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={renk.primary} />
        ) : (
          <>
            <Kart style={{ gap: 8 }}>
              <View style={s.toplamlar}>
                <Ozetci etiket="Gider" deger={g.toplam_gider} c={renk.text} />
                <Ozetci etiket="Gelir" deger={g.toplam_gelir} c={renk.success} />
                <Ozetci etiket="Net" deger={g.net} c={g.net >= 0 ? renk.success : renk.danger} />
              </View>
              {o && <KiyasRozet bu={g.toplam_gider} onceki={o.toplam_gider} />}
            </Kart>

            <Kart>
              <Text style={[s.kartBaslik, { color: renk.text }]}>
                {period === "year" ? "Aylara göre" : "Günlere göre"}
              </Text>
              <CubukGrafik etiketler={grafik.etiketler} degerler={grafik.degerler} />
            </Kart>

            <Kart>
              <Text style={[s.kartBaslik, { color: renk.text }]}>Tür</Text>
              {g.tip_kirilim.map((t) => (
                <View key={t.tip} style={s.tipSatir}>
                  <View style={[s.nokta, { backgroundColor: TIP_RENK[t.tip] }]} />
                  <Text style={{ color: renk.text, flex: 1 }}>{t.etiket}</Text>
                  <Text style={{ color: renk.textMuted }}>%{Math.round(t.oran)}</Text>
                  <Text style={{ color: renk.text, fontWeight: "600", width: 110, textAlign: "right" }}>
                    {turkceTutar(t.tutar)} ₺
                  </Text>
                </View>
              ))}
            </Kart>

            {katDilimler.length > 0 && (
              <Kart>
                <Text style={[s.kartBaslik, { color: renk.text }]}>Kategoriler</Text>
                <KategoriListesi dilimler={katDilimler} />
              </Kart>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Ozetci({ etiket, deger, c }: { etiket: string; deger: number; c: string }) {
  const renk = useRenkler();
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ color: renk.textMuted, fontSize: 12 }}>{etiket}</Text>
      <Text style={{ color: c, fontSize: 16, fontWeight: "700" }}>{turkceTutar(deger)} ₺</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  icerik: { padding: 16, gap: 14, paddingBottom: 32 },
  baslik: { fontSize: 26, fontWeight: "800" },
  gezinme: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 8 },
  ok: { fontSize: 30, fontWeight: "700", paddingHorizontal: 12 },
  donem: { fontSize: 16, fontWeight: "700" },
  toplamlar: { flexDirection: "row" },
  kartBaslik: { fontSize: 15, fontWeight: "700", marginBottom: 12 },
  tipSatir: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6 },
  nokta: { width: 10, height: 10, borderRadius: 5 },
});
