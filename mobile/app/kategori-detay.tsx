import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { Kart, Sekmeli } from "@/components/base";
import { IslemSatiri } from "@/components/IslemSatiri";
import { Metin as Text } from "@/components/Metin";
import { YuklemeHalkasi } from "@/components/YuklemeHalkasi";
import { tarihEtiket, turkceTutar } from "@/lib/format";
import { islemTutari, paraMetni, usePara } from "@/lib/paraBirimi";
import { useSummary, useTransactions } from "@/lib/queries";
import { SP, T, useRenkler } from "@/lib/theme";
import type { Granularity, Islem, Yon } from "@/lib/types";

const GRAN: Granularity[] = ["week", "month", "year"];
const ETIKET: Record<Granularity, string> = { week: "Haftalık", month: "Aylık", year: "Yıllık" };
const DONEM: Record<Granularity, string> = { week: "Bu hafta", month: "Bu ay", year: "Bu yıl" };

/** Bir kategorinin (ya da katlanmış "Diğer"in) seçilen dönemdeki kayıtları. */
export default function KategoriDetay() {
  const renk = useRenkler();
  const router = useRouter();
  const p = useLocalSearchParams<{ ad: string; kategoriler: string; yon: Yon; gran: Granularity }>();
  const kategoriler = useMemo<string[]>(() => JSON.parse(String(p.kategoriler)), [p.kategoriler]);
  const yon: Yon = p.yon === "gelir" ? "gelir" : "gider";
  const [gran, setGran] = useState<Granularity>(p.gran ?? "month");

  const ozet = useSummary(gran);
  const liste = useTransactions(
    { limit: 500, from: ozet.data?.baslangic, to: ozet.data?.bitis, direction: yon, kategoriler },
    { enabled: !!ozet.data },
  );

  const para = usePara();
  const kayitlar = liste.data ?? [];
  // Döviz modunda her kayıt kendi gününün kuruyla (çevrilemeyen olursa toplam TL kalır)
  const dovizli = para !== "TRY" && kayitlar.every((x) => x.cevrilmis != null);
  const toplam = kayitlar.reduce((t, x) => t + (dovizli ? islemTutari(x, para).deger : x.tutar), 0);
  const bolumler = useMemo(() => {
    const map = new Map<string, Islem[]>();
    for (const t of liste.data ?? []) {
      if (!map.has(t.tarih)) map.set(t.tarih, []);
      map.get(t.tarih)!.push(t);
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [liste.data]);

  const yukleniyor = ozet.isLoading || liste.isLoading;

  return (
    <ScrollView
      style={{ backgroundColor: renk.bg }}
      contentContainerStyle={s.icerik}
      refreshControl={
        <RefreshControl refreshing={liste.isRefetching} onRefresh={() => liste.refetch()} tintColor={renk.aksan} />
      }
    >
      <Stack.Screen options={{ title: String(p.ad) }} />
      <Sekmeli secenekler={GRAN} etiket={(x) => ETIKET[x]} secili={gran} onSec={setGran} />

      <Kart>
        <Text style={[s.etiket, { color: renk.textMuted }]}>
          {DONEM[gran]} · {yon === "gelir" ? "toplam gelir" : "toplam harcama"}
        </Text>
        <Text style={[s.toplam, { color: yon === "gelir" ? renk.success : renk.text }]}>
          {paraMetni(toplam, dovizli ? para : "TRY")}
        </Text>
        <Text style={[s.adet, { color: renk.textFaint }]}>{kayitlar.length} kayıt</Text>
      </Kart>

      {yukleniyor ? (
        <YuklemeHalkasi boyut={64} yukseklik={190} />
      ) : (
        <View>
          {bolumler.map(([tarih, gunluk]) => (
            <View key={tarih}>
              <Text style={[s.gunBaslik, { color: renk.textMuted }]}>{tarihEtiket(tarih)}</Text>
              {gunluk.map((t) => (
                <IslemSatiri
                  key={t.id}
                  islem={t}
                  onPress={() => router.push({ pathname: "/islem-form", params: { islem: JSON.stringify(t) } })}
                />
              ))}
            </View>
          ))}
          {bolumler.length === 0 && (
            <Text style={[T.body, { color: renk.textFaint, textAlign: "center", paddingVertical: SP.xl }]}>
              Bu dönemde kayıt yok.
            </Text>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  icerik: { padding: SP.lg, gap: SP.md, paddingBottom: 60 },
  etiket: { fontSize: 13, fontWeight: "600" },
  toplam: { fontSize: 28, fontWeight: "800", marginTop: 2, letterSpacing: -0.5 },
  adet: { fontSize: 13, fontWeight: "500", marginTop: 2 },
  gunBaslik: { fontSize: 13, fontWeight: "700", marginTop: SP.md, marginBottom: 2 },
});
