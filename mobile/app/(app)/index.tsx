import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Kart, Yukleniyor } from "@/components/base";
import { DonemSekmeleri } from "@/components/DonemSekmeleri";
import { EkranBasligi } from "@/components/EkranBasligi";
import { HedefHalkasi } from "@/components/HedefHalkasi";
import { IlerlemeCubugu } from "@/components/IlerlemeCubugu";
import { IslemSatiri } from "@/components/IslemSatiri";
import { Metin as Text } from "@/components/Metin";
import { selamlama, turkceTutar } from "@/lib/format";
import { useGoal, useSummary, useTransactions } from "@/lib/queries";
import { SP, T, useRenkler } from "@/lib/theme";
import type { Granularity } from "@/lib/types";

const GRAN: Granularity[] = ["week", "month", "year"];
const ETIKET: Record<Granularity, string> = { week: "Haftalık", month: "Aylık", year: "Yıllık" };

export default function AnaSayfa() {
  const renk = useRenkler();
  const router = useRouter();
  const [gran, setGran] = useState<Granularity>("month");
  const ozet = useSummary(gran);
  const ayOzet = useSummary("month");
  const goal = useGoal();
  const sonlar = useTransactions({ limit: 5 });

  const g = ozet.data?.bu_donem;
  const genelHedef = ayOzet.data?.hedefler.find((h) => h.kapsam === "genel");
  const yatirim = ayOzet.data?.yatirim;

  const haftaGider = useMemo(() => {
    const gl = ayOzet.data?.bu_donem.gunluk ?? [];
    return gl.slice(-7).reduce((s, x) => s + x.gider, 0);
  }, [ayOzet.data]);

  return (
    <EkranBasligi
      baslik=""
      zil
      onRefresh={() => {
        ozet.refetch();
        ayOzet.refetch();
        sonlar.refetch();
        goal.refetch();
      }}
      refreshing={ozet.isRefetching}
      yesilAlan={
        <View style={{ gap: SP.md, paddingBottom: SP.md }}>
          <View style={s.selam}>
            <Text style={[T.title, { color: renk.onGreen }]}>{selamlama()}</Text>
            <Text style={[s.selamAlt, { color: renk.text }]}>Tekrar hoş geldin</Text>
          </View>

          {g && (
            <>
              <View style={s.ggSatir}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.ggEtiket, { color: renk.onGreen }]}>↗ Bu ay gelir</Text>
                  <Text style={[s.ggDeger, { color: renk.onGreen }]}>
                    {turkceTutar(g.toplam_gelir)} ₺
                  </Text>
                </View>
                <View style={s.ggAyrac} />
                <View style={{ flex: 1 }}>
                  <Text style={[s.ggEtiket, { color: renk.blue }]}>↘ Bu ay harcama</Text>
                  <Text style={[s.ggDeger, { color: renk.blue }]}>
                    -{turkceTutar(g.toplam_gider)} ₺
                  </Text>
                </View>
              </View>

              {genelHedef ? (
                <>
                  <IlerlemeCubugu oran={genelHedef.oran} hedef={genelHedef.limit} />
                  <Text style={[s.hedefNot, { color: renk.text }]}>
                    {genelHedef.durum === "asti"
                      ? `Aylık hedefini ${turkceTutar(-genelHedef.kalan)} ₺ aştın.`
                      : `Hedefinin %${Math.round(genelHedef.oran)}'i doldu — ${
                          genelHedef.durum === "yaklasti" ? "dikkatli ol." : "iyi gidiyorsun."
                        }`}
                  </Text>
                </>
              ) : (
                <Text style={[s.hedefNot, { color: renk.text }]}>
                  Aylık harcama hedefi belirlemek için Analiz → Hedeflerim.
                </Text>
              )}
            </>
          )}
        </View>
      }
    >
      <Kart style={{ backgroundColor: renk.green }}>
        <View style={s.hedefKart}>
          <View style={{ alignItems: "center", gap: SP.sm }}>
            <HedefHalkasi oran={yatirim?.oran ?? 0} ikon="wallet-outline" boyut={92} />
            <Text style={[s.hedefBaslik, { color: renk.onGreen }]}>Yatırım{"\n"}Hedefi</Text>
          </View>
          <View style={[s.hedefDikey, { backgroundColor: "rgba(9,48,48,0.2)" }]} />
          <View style={{ flex: 1, gap: SP.md }}>
            <View>
              <Text style={[s.miniEtiket, { color: renk.onGreen }]}>Bu ay biriken</Text>
              <Text style={[s.miniDeger, { color: renk.onGreen }]}>
                {turkceTutar(yatirim?.birikmis ?? 0)} ₺
              </Text>
            </View>
            <View style={[s.miniAyrac, { backgroundColor: "rgba(9,48,48,0.2)" }]} />
            <View>
              <Text style={[s.miniEtiket, { color: renk.blue }]}>Son 7 gün harcama</Text>
              <Text style={[s.miniDeger, { color: renk.blue }]}>-{turkceTutar(haftaGider)} ₺</Text>
            </View>
          </View>
        </View>
      </Kart>

      <DonemSekmeleri secenekler={GRAN} etiket={(x) => ETIKET[x]} secili={gran} onSec={setGran} />

      {sonlar.isLoading ? (
        <Yukleniyor yukseklik={120} />
      ) : (
        <View>
          {(sonlar.data ?? []).map((t) => (
            <IslemSatiri key={t.id} islem={t} onPress={() => router.navigate("/(app)/analiz")} />
          ))}
          {(sonlar.data ?? []).length === 0 && (
            <Text style={{ color: renk.textFaint, textAlign: "center", paddingVertical: SP.xl }}>
              Henüz kayıt yok. Ekle sekmesinden başla.
            </Text>
          )}
        </View>
      )}
    </EkranBasligi>
  );
}

const s = StyleSheet.create({
  selam: {},
  selamAlt: { fontSize: 13, fontWeight: "500", marginTop: -2 },
  ggSatir: { flexDirection: "row", alignItems: "center" },
  ggEtiket: { fontSize: 12.5, fontWeight: "600" },
  ggDeger: { fontSize: 20, fontWeight: "800", marginTop: 2, letterSpacing: -0.4 },
  ggAyrac: { width: 1, height: 38, backgroundColor: "rgba(9,48,48,0.25)", marginHorizontal: SP.md },
  hedefNot: { fontSize: 13, fontWeight: "500" },
  hedefKart: { flexDirection: "row", alignItems: "center", gap: SP.lg },
  hedefBaslik: { fontSize: 13, fontWeight: "700", textAlign: "center", lineHeight: 16 },
  hedefDikey: { width: 1, alignSelf: "stretch", marginVertical: 4 },
  miniEtiket: { fontSize: 12, fontWeight: "500" },
  miniDeger: { fontSize: 16, fontWeight: "700", marginTop: 2 },
  miniAyrac: { height: 1 },
});
