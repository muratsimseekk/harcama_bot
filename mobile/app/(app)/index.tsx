import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Kart, Sekmeli, Yukleniyor } from "@/components/base";
import { PastaGrafik } from "@/components/charts";
import { EkranBasligi } from "@/components/EkranBasligi";
import { IslemSatiri } from "@/components/IslemSatiri";
import { Metin as Text } from "@/components/Metin";
import { birlestirKategori, selamlama, turkceTutar } from "@/lib/format";
import { useHane, useSummary, useTransactions } from "@/lib/queries";
import { SP, T, useRenkler } from "@/lib/theme";
import type { Granularity } from "@/lib/types";

const GRAN: Granularity[] = ["week", "month", "year"];
const ETIKET: Record<Granularity, string> = { week: "Haftalık", month: "Aylık", year: "Yıllık" };
const DAGILIM_BASLIK: Record<Granularity, string> = {
  week: "Bu hafta nereye gitti",
  month: "Bu ay nereye gitti",
  year: "Bu yıl nereye gitti",
};

export default function AnaSayfa() {
  const renk = useRenkler();
  const router = useRouter();
  const [gran, setGran] = useState<Granularity>("month");
  const ozet = useSummary(gran);
  const ayOzet = useSummary("month");
  const sonlar = useTransactions({ limit: 5 });
  const hane = useHane();

  const g = ozet.data?.bu_donem;
  const ay = ayOzet.data?.bu_donem;

  const gunlukOrt = useMemo(() => {
    if (!ay || ay.toplam_gider <= 0) return 0;
    const gun = Math.max(1, new Date().getDate());
    return ay.toplam_gider / gun;
  }, [ay]);

  const dilimler = useMemo(() => {
    const hepsi = birlestirKategori(g?.kategori_kirilim ?? []);
    if (hepsi.length <= 8) return hepsi;
    const ilk = hepsi.slice(0, 7).map((d) => ({ ...d }));
    const kalan = hepsi.slice(7);
    const artikTutar = kalan.reduce((s, d) => s + d.tutar, 0);
    const artikOran = kalan.reduce((s, d) => s + d.oran, 0);
    // "Diğer" ilk 7'de zaten varsa artığı ona kat (çift "Diğer" satırı olmasın)
    const mevcut = ilk.find((d) => d.ad === "Diğer");
    if (mevcut) {
      mevcut.tutar += artikTutar;
      mevcut.oran += artikOran;
      return ilk.sort((a, b) => b.tutar - a.tutar);
    }
    return [...ilk, { ad: "Diğer", tutar: artikTutar, oran: artikOran }];
  }, [g?.kategori_kirilim]);

  return (
    <EkranBasligi
      baslik=""
      zil
      onRefresh={() => Promise.all([ozet.refetch(), ayOzet.refetch(), sonlar.refetch()])}
      ustAlan={
        <View style={s.selam}>
          <Text style={[T.title, { color: renk.text }]}>{selamlama()}</Text>
          <Text style={[s.selamAlt, { color: renk.textMuted }]}>
            {hane.data
              ? `${hane.data.ad} · ${hane.data.uyeler.length} kişi · ortak görünüm`
              : "Tekrar hoş geldin"}
          </Text>
        </View>
      }
    >
      <Kart style={{ backgroundColor: renk.aksan }}>
        <Text style={[s.hcEtiket, { color: renk.aksanUstu }]}>Bu ay toplam harcama</Text>
        <Text style={[s.hcDeger, { color: renk.aksanUstu }]}>
          {turkceTutar(ay?.toplam_gider ?? 0)} ₺
        </Text>
        <View style={[s.hcAyrac, { backgroundColor: "rgba(255,255,255,0.25)" }]} />
        <View style={s.hcAlt}>
          <View>
            <Text style={[s.miniEtiket, { color: renk.aksanUstu }]}>İşlem</Text>
            <Text style={[s.miniDeger, { color: renk.aksanUstu }]}>{ay?.adet ?? 0}</Text>
          </View>
          <View>
            <Text style={[s.miniEtiket, { color: renk.aksanUstu }]}>Günlük ortalama</Text>
            <Text style={[s.miniDeger, { color: renk.aksanUstu }]}>{turkceTutar(gunlukOrt)} ₺</Text>
          </View>
        </View>
      </Kart>

      <Sekmeli secenekler={GRAN} etiket={(x) => ETIKET[x]} secili={gran} onSec={setGran} />

      <Kart>
        <Text style={[T.heading, { color: renk.text, marginBottom: SP.md }]}>
          {DAGILIM_BASLIK[gran]}
        </Text>
        {ozet.isLoading ? (
          <Yukleniyor yukseklik={150} />
        ) : (
          <PastaGrafik dilimler={dilimler} />
        )}
      </Kart>

      <Text style={[T.heading, { color: renk.text, marginTop: SP.xs }]}>Son işlemler</Text>

      {sonlar.isLoading ? (
        <Yukleniyor yukseklik={120} />
      ) : (
        <View>
          {(sonlar.data ?? []).map((t) => (
            <IslemSatiri
              key={t.id}
              islem={t}
              onPress={() => router.push({ pathname: "/islem-form", params: { islem: JSON.stringify(t) } })}
            />
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
  hcEtiket: { fontSize: 13, fontWeight: "600" },
  hcDeger: { fontSize: 30, fontWeight: "800", marginTop: 2, letterSpacing: -0.6 },
  hcAyrac: { height: 1, marginVertical: SP.md },
  hcAlt: { flexDirection: "row", justifyContent: "space-between" },
  miniEtiket: { fontSize: 12, fontWeight: "500" },
  miniDeger: { fontSize: 16, fontWeight: "700", marginTop: 2 },
});
