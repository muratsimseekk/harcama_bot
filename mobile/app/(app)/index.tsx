import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import {
  Beliren,
  BosDurum,
  Ekran,
  IkonDaire,
  Kart,
  KartBaslik,
  Sayac,
  Yukleniyor,
} from "@/components/base";
import { KategoriBar, PastaGrafik, Sparkline } from "@/components/charts";
import { Metin as Text } from "@/components/Metin";
import { birlestirKategori, bugunUzun, selamlama, tarihEtiket, turkceTutar } from "@/lib/format";
import { kategoriIkon } from "@/lib/kategoriIkon";
import { useSummary, useTransactions } from "@/lib/queries";
import { R, SP, T, useRenkler } from "@/lib/theme";
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
    const hepsi = birlestirKategori(g.kategori_kirilim);
    const ilk = hepsi.slice(0, 5);
    const kalan = hepsi.slice(5);
    if (kalan.length) {
      ilk.push({ ad: `+${kalan.length} kategori`, tutar: kalan.reduce((s, k) => s + k.tutar, 0), oran: 0 });
    }
    return ilk;
  }, [g]);

  const sparkVeri = useMemo(() => (g?.gunluk ?? []).map((x) => x.gider), [g]);

  return (
    <Ekran onRefresh={() => { ozet.refetch(); sonlar.refetch(); }} refreshing={ozet.isRefetching}>
      <View style={s.selam}>
        <Text style={[T.caption, { color: renk.textFaint }]}>{bugunUzun()}</Text>
        <Text style={[T.title, { color: renk.text }]}>{selamlama()}</Text>
      </View>

      {ozet.isLoading || !g ? (
        <Yukleniyor yukseklik={190} />
      ) : (
        <>
          <Beliren>
            <LinearGradient
              colors={[renk.primary, renk.isletme]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1.2 }}
              style={s.hero}
            >
              <View style={s.heroUst}>
                <Text style={s.heroEtiket}>{ozet.data?.etiket} · toplam gider</Text>
                {o && <HeroKiyas bu={g.toplam_gider} onceki={o.toplam_gider} />}
              </View>
              <View style={s.heroSayiSatir}>
                <Sayac deger={g.toplam_gider} style={[T.para, s.heroSayi]} />
                <Text style={s.heroBirim}>₺</Text>
              </View>
              {sparkVeri.length > 2 && (
                <View style={s.spark}>
                  <Sparkline degerler={sparkVeri} renk="#FFFFFF" yukseklik={36} />
                </View>
              )}
              <View style={s.heroDip}>
                <HeroMini etiket="işlem" deger={`${g.adet}`} />
                {g.toplam_gelir > 0 && <HeroMini etiket="gelir" deger={`${turkceTutar(g.toplam_gelir)} ₺`} />}
                <HeroMini etiket="net" deger={`${turkceTutar(g.net)} ₺`} />
              </View>
            </LinearGradient>
          </Beliren>

          <Beliren sira={1}>
            <Kart>
              <KartBaslik ikon="pie-chart-outline">Tür dağılımı</KartBaslik>
              <PastaGrafik dilimler={turDilimler} />
            </Kart>
          </Beliren>

          {katDilimler.length > 0 && (
            <Beliren sira={2}>
              <Kart>
                <KartBaslik ikon="list-outline">Kategoriler</KartBaslik>
                <KategoriBar dilimler={katDilimler} />
              </Kart>
            </Beliren>
          )}
        </>
      )}

      <Beliren sira={3}>
        <Kart>
          <KartBaslik
            ikon="time-outline"
            sag={
              <Pressable onPress={() => router.navigate("/(app)/gecmis")} hitSlop={8}>
                <Text style={{ color: renk.primary, fontWeight: "700", fontSize: 12.5 }}>Tümü</Text>
              </Pressable>
            }
          >
            Son hareketler
          </KartBaslik>
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
      </Beliren>
    </Ekran>
  );
}

function HeroKiyas({ bu, onceki }: { bu: number; onceki: number }) {
  if (onceki <= 0) return null;
  const fark = ((bu - onceki) / onceki) * 100;
  if (Math.abs(fark) < 1) return null;
  return (
    <View style={s.heroRozet}>
      <Ionicons name={fark > 0 ? "trending-up" : "trending-down"} size={12} color="#fff" />
      <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>
        {fark > 0 ? "+" : "−"}%{Math.abs(Math.round(fark))}
      </Text>
    </View>
  );
}

function HeroMini({ etiket, deger }: { etiket: string; deger: string }) {
  return (
    <View>
      <Text style={s.heroMiniDeger}>{deger}</Text>
      <Text style={s.heroMiniEtiket}>{etiket}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  selam: { paddingTop: SP.xs, paddingBottom: SP.xs },
  hero: { borderRadius: R.xl, padding: SP.lg, gap: SP.sm, overflow: "hidden" },
  heroUst: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  heroEtiket: { color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: "600" },
  heroSayiSatir: { flexDirection: "row", alignItems: "flex-end", gap: 4 },
  heroSayi: { color: "#fff", fontSize: 38 },
  heroBirim: { color: "rgba(255,255,255,0.9)", fontSize: 20, fontWeight: "700", marginBottom: 4 },
  spark: { marginHorizontal: -SP.xs, marginVertical: -2 },
  heroDip: { flexDirection: "row", gap: SP.xl, marginTop: 2 },
  heroMiniDeger: { color: "#fff", fontSize: 14, fontWeight: "800" },
  heroMiniEtiket: { color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: "600" },
  heroRozet: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.22)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: R.pill,
  },
  hareket: { flexDirection: "row", alignItems: "center", gap: SP.md, paddingVertical: SP.md },
});
