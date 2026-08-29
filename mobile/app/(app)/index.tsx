import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  BosDurum,
  Ekran,
  IkonDaire,
  Kart,
  KartBaslik,
  Yukleniyor,
} from "@/components/base";
import { KategoriBar, PastaGrafik } from "@/components/charts";
import { tarihEtiket, turkceTutar } from "@/lib/format";
import { kategoriIkon } from "@/lib/kategoriIkon";
import { useSummary, useTransactions } from "@/lib/queries";
import { R, SP, useRenkler } from "@/lib/theme";
import { TIP_RENK } from "@/lib/types";

export default function Dashboard() {
  const renk = useRenkler();
  const router = useRouter();

  const ozet = useSummary("month");
  const sonlar = useTransactions({ limit: 6 });

  const g = ozet.data?.bu_donem;
  const o = ozet.data?.onceki;

  const turDilimler = useMemo(
    () =>
      (g?.tip_kirilim ?? []).map((t) => ({
        ad: t.etiket,
        tutar: t.tutar,
        oran: t.oran,
        renk: TIP_RENK[t.tip],
      })),
    [g],
  );

  const katDilimler = useMemo(() => {
    if (!g) return [];
    const ilk = g.kategori_kirilim.slice(0, 5);
    const kalan = g.kategori_kirilim.slice(5);
    const arr = ilk.map((k) => ({ ad: k.kategori, tutar: k.tutar, oran: k.oran }));
    if (kalan.length) {
      arr.push({
        ad: `+${kalan.length} kategori`,
        tutar: kalan.reduce((s, k) => s + k.tutar, 0),
        oran: 0,
      });
    }
    return arr;
  }, [g]);

  return (
    <Ekran onRefresh={() => { ozet.refetch(); sonlar.refetch(); }} refreshing={ozet.isRefetching}>
      {ozet.isLoading || !g ? (
        <Yukleniyor yukseklik={180} />
      ) : (
        <>
          <LinearGradient
            colors={[renk.primary, renk.yatirim]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.hero}
          >
            <Text style={s.heroEtiket}>{ozet.data?.etiket} · toplam gider</Text>
            <Text style={s.heroSayi}>{turkceTutar(g.toplam_gider)} ₺</Text>
            <View style={s.heroAlt}>
              {o && <KiyasRozetBeyaz bu={g.toplam_gider} onceki={o.toplam_gider} />}
              <Text style={s.heroKucuk}>{g.adet} işlem</Text>
            </View>
          </LinearGradient>

          {(g.toplam_gelir > 0 || o) && (
            <View style={s.miniSatir}>
              <MiniKart etiket="Gelir" deger={g.toplam_gelir} renk={renk.gelir} ikon="arrow-down" />
              <MiniKart
                etiket="Net"
                deger={g.net}
                renk={g.net >= 0 ? renk.gelir : renk.gider}
                ikon={g.net >= 0 ? "trending-up" : "trending-down"}
              />
            </View>
          )}

          <Kart>
            <KartBaslik ikon="pie-chart-outline">Tür dağılımı</KartBaslik>
            <PastaGrafik dilimler={turDilimler} />
          </Kart>

          {katDilimler.length > 0 && (
            <Kart>
              <KartBaslik ikon="list-outline">Kategoriler</KartBaslik>
              <KategoriBar dilimler={katDilimler} />
            </Kart>
          )}
        </>
      )}

      <Kart>
        <View style={s.hareketBaslik}>
          <KartBaslik ikon="time-outline">Son hareketler</KartBaslik>
          <Pressable onPress={() => router.navigate("/(app)/gecmis")} hitSlop={8}>
            <Text style={{ color: renk.primary, fontWeight: "700", fontSize: 13 }}>Tümü</Text>
          </Pressable>
        </View>
        {sonlar.isLoading ? (
          <Yukleniyor yukseklik={80} />
        ) : (sonlar.data ?? []).length === 0 ? (
          <BosDurum ikon="wallet-outline" yazi="Henüz kayıt yok" />
        ) : (
          (sonlar.data ?? []).map((t, i) => (
            <View
              key={t.id}
              style={[
                s.hareket,
                i > 0 && { borderTopColor: renk.hairline, borderTopWidth: StyleSheet.hairlineWidth },
              ]}
            >
              <IkonDaire ikon={kategoriIkon(t.kategori)} renk={TIP_RENK[t.tip]} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: renk.text, fontWeight: "600", fontSize: 15 }} numberOfLines={1}>
                  {t.aciklama}
                </Text>
                <Text style={{ color: renk.textFaint, fontSize: 12 }}>
                  {t.kategori} · {tarihEtiket(t.tarih)}
                </Text>
              </View>
              <Text
                style={{
                  color: t.direction === "gelir" ? renk.gelir : renk.text,
                  fontWeight: "700",
                  fontSize: 15,
                }}
              >
                {t.direction === "gelir" ? "+" : "−"}
                {turkceTutar(t.tutar)}
              </Text>
            </View>
          ))
        )}
      </Kart>
    </Ekran>
  );
}

function MiniKart({
  etiket,
  deger,
  renk: c,
  ikon,
}: {
  etiket: string;
  deger: number;
  renk: string;
  ikon: keyof typeof Ionicons.glyphMap;
}) {
  const renk = useRenkler();
  return (
    <Kart style={s.mini}>
      <View style={s.miniUst}>
        <Ionicons name={ikon} size={14} color={c} />
        <Text style={{ color: renk.textMuted, fontSize: 12 }}>{etiket}</Text>
      </View>
      <Text style={{ color: renk.text, fontSize: 17, fontWeight: "800" }}>
        {turkceTutar(deger)} ₺
      </Text>
    </Kart>
  );
}

function KiyasRozetBeyaz({ bu, onceki }: { bu: number; onceki: number }) {
  // hero üstünde beyaz metinli kıyas
  if (onceki <= 0) return null;
  const fark = ((bu - onceki) / onceki) * 100;
  if (Math.abs(fark) < 1) return null;
  const isaret = fark > 0 ? "+" : "−";
  return (
    <View style={s.heroRozet}>
      <Ionicons name={fark > 0 ? "trending-up" : "trending-down"} size={12} color="#fff" />
      <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>
        {isaret}%{Math.abs(Math.round(fark))}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  hero: { borderRadius: R.lg, padding: SP.lg, gap: 6 },
  heroEtiket: { color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: "600" },
  heroSayi: { color: "#fff", fontSize: 34, fontWeight: "800", letterSpacing: -0.5 },
  heroAlt: { flexDirection: "row", alignItems: "center", gap: SP.md, marginTop: 2 },
  heroKucuk: { color: "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: "600" },
  heroRozet: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: R.pill,
  },
  miniSatir: { flexDirection: "row", gap: SP.md },
  mini: { flex: 1, gap: 4, padding: SP.md },
  miniUst: { flexDirection: "row", alignItems: "center", gap: 5 },
  hareketBaslik: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  hareket: { flexDirection: "row", alignItems: "center", gap: SP.md, paddingVertical: SP.md },
});
