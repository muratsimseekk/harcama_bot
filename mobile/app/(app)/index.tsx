import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Kart, Yukleniyor } from "@/components/base";
import { DonemSekmeleri } from "@/components/DonemSekmeleri";
import { EkranBasligi } from "@/components/EkranBasligi";
import { IslemSatiri } from "@/components/IslemSatiri";
import { Metin as Text } from "@/components/Metin";
import { selamlama, turkceTutar } from "@/lib/format";
import { useSummary, useTransactions } from "@/lib/queries";
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
  const sonlar = useTransactions({ limit: 5 });

  const g = ozet.data?.bu_donem;
  const ay = ayOzet.data?.bu_donem;

  const gunlukOrt = useMemo(() => {
    if (!ay || ay.toplam_gider <= 0) return 0;
    const gun = Math.max(1, new Date().getDate());
    return ay.toplam_gider / gun;
  }, [ay]);

  return (
    <EkranBasligi
      baslik=""
      zil
      onRefresh={() => {
        ozet.refetch();
        ayOzet.refetch();
        sonlar.refetch();
      }}
      refreshing={ozet.isRefetching}
      yesilAlan={
        <View style={{ gap: SP.md, paddingBottom: SP.md }}>
          <View style={s.selam}>
            <Text style={[T.title, { color: renk.onGreen }]}>{selamlama()}</Text>
            <Text style={[s.selamAlt, { color: renk.text }]}>Tekrar hoş geldin</Text>
          </View>

          {g && (
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
          )}
        </View>
      }
    >
      <Kart style={{ backgroundColor: renk.green }}>
        <Text style={[s.hcEtiket, { color: renk.onGreen }]}>Bu ay toplam harcama</Text>
        <Text style={[s.hcDeger, { color: renk.onGreen }]}>
          {turkceTutar(ay?.toplam_gider ?? 0)} ₺
        </Text>
        <View style={[s.hcAyrac, { backgroundColor: "rgba(9,48,48,0.2)" }]} />
        <View style={s.hcAlt}>
          <View>
            <Text style={[s.miniEtiket, { color: renk.onGreen }]}>İşlem</Text>
            <Text style={[s.miniDeger, { color: renk.onGreen }]}>{ay?.adet ?? 0}</Text>
          </View>
          <View>
            <Text style={[s.miniEtiket, { color: renk.onGreen }]}>Günlük ortalama</Text>
            <Text style={[s.miniDeger, { color: renk.onGreen }]}>{turkceTutar(gunlukOrt)} ₺</Text>
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
  hcEtiket: { fontSize: 13, fontWeight: "600" },
  hcDeger: { fontSize: 30, fontWeight: "800", marginTop: 2, letterSpacing: -0.6 },
  hcAyrac: { height: 1, marginVertical: SP.md },
  hcAlt: { flexDirection: "row", justifyContent: "space-between" },
  miniEtiket: { fontSize: 12, fontWeight: "500" },
  miniDeger: { fontSize: 16, fontWeight: "700", marginTop: 2 },
});
