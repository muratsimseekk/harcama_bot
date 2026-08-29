import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { Kart } from "@/components/base";
import { IkiliCubukGrafik } from "@/components/charts";
import { DonemSekmeleri } from "@/components/DonemSekmeleri";
import { EkranBasligi } from "@/components/EkranBasligi";
import { IlerlemeCubugu } from "@/components/IlerlemeCubugu";
import { IslemSatiri } from "@/components/IslemSatiri";
import { Metin as Text } from "@/components/Metin";
import { kisaGun, turkceTutar } from "@/lib/format";
import { useDeleteTransaction, useSummary, useTransactions } from "@/lib/queries";
import { R, SP, T, useRenkler } from "@/lib/theme";
import type { Granularity, Islem } from "@/lib/types";

type Sekme = "day" | "week" | "month" | "year";
const ETIKET: Record<Sekme, string> = { day: "Günlük", week: "Haftalık", month: "Aylık", year: "Yıllık" };
const AYLAR = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
const AY_UZUN = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

function tarihUzun(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${AY_UZUN[m - 1]} ${y}`;
}

function granOf(s: Sekme): Granularity {
  return s === "day" ? "week" : (s as Granularity);
}

export default function Analiz() {
  const renk = useRenkler();
  const router = useRouter();
  const sil = useDeleteTransaction();
  const [sekme, setSekme] = useState<Sekme>("month");
  const gran = granOf(sekme);

  const ozet = useSummary(gran);
  const g = ozet.data?.bu_donem;
  const txQ = useTransactions({ limit: 300, from: ozet.data?.baslangic, to: ozet.data?.bitis });

  const grafik = useMemo(() => {
    if (!g) return { etiketler: [] as string[], gelir: [] as number[], gider: [] as number[] };
    if (gran === "year") {
      const gg = Array(12).fill(0);
      const ge = Array(12).fill(0);
      for (const gn of g.gunluk) {
        const m = Number(gn.tarih.slice(5, 7)) - 1;
        gg[m] += gn.gelir;
        ge[m] += gn.gider;
      }
      return { etiketler: AYLAR, gelir: gg, gider: ge };
    }
    return {
      etiketler: g.gunluk.map((x) => kisaGun(x.tarih)),
      gelir: g.gunluk.map((x) => x.gelir),
      gider: g.gunluk.map((x) => x.gider),
    };
  }, [g, gran]);

  const bolumler = useMemo(() => {
    const map = new Map<string, Islem[]>();
    for (const t of txQ.data ?? []) {
      if (!map.has(t.tarih)) map.set(t.tarih, []);
      map.get(t.tarih)!.push(t);
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [txQ.data]);

  const genelHedef = ozet.data?.hedefler.find((h) => h.kapsam === "genel");
  const katHedefler = (ozet.data?.hedefler ?? []).filter((h) => h.kapsam !== "genel");

  function islemMenu(t: Islem) {
    Alert.alert(t.aciklama, `${turkceTutar(t.tutar)} ₺ · ${t.kategori}`, [
      { text: "Kapat", style: "cancel" },
      { text: "Sil", style: "destructive", onPress: () => sil.mutate(t.id) },
    ]);
  }

  return (
    <EkranBasligi
      baslik="Analiz"
      onRefresh={() => {
        ozet.refetch();
        txQ.refetch();
      }}
      refreshing={ozet.isRefetching}
      yesilAlan={
        g ? (
          <View style={{ gap: SP.md, paddingBottom: SP.md }}>
            <View style={s.ggSatir}>
              <View>
                <Text style={[s.ggEtiket, { color: renk.onGreen }]}>↗ Gelir</Text>
                <Text style={[s.ggDeger, { color: renk.onGreen }]}>{turkceTutar(g.toplam_gelir)} ₺</Text>
              </View>
              <View style={s.ggAyrac} />
              <View>
                <Text style={[s.ggEtiket, { color: renk.blue }]}>↘ Harcama</Text>
                <Text style={[s.ggDeger, { color: renk.blue }]}>-{turkceTutar(g.toplam_gider)} ₺</Text>
              </View>
            </View>
            {genelHedef && <IlerlemeCubugu oran={genelHedef.oran} hedef={genelHedef.limit} />}
          </View>
        ) : undefined
      }
    >
      <DonemSekmeleri
        secenekler={["day", "week", "month", "year"] as const}
        etiket={(x) => ETIKET[x]}
        secili={sekme}
        onSec={setSekme}
      />

      <Kart style={{ backgroundColor: renk.greenSoft }}>
        <View style={s.grafikBaslik}>
          <Text style={[T.heading, { color: renk.text }]}>Gelir & Gider</Text>
          <Pressable
            onPress={() => router.navigate("/ara")}
            style={[s.yesilBtn, { backgroundColor: renk.green }]}
          >
            <Ionicons name="search" size={16} color={renk.onGreen} />
          </Pressable>
        </View>
        <IkiliCubukGrafik etiketler={grafik.etiketler} gelir={grafik.gelir} gider={grafik.gider} />
      </Kart>

      {katHedefler.length > 0 && (
        <Kart>
          <Text style={[T.heading, { color: renk.text, marginBottom: SP.md }]}>Hedeflerim</Text>
          <View style={{ gap: SP.md }}>
            {katHedefler.map((h) => (
              <View key={`${h.kapsam}-${h.kapsam_deger}`} style={{ gap: 6 }}>
                <View style={s.hedefUst}>
                  <Text style={{ color: renk.text, fontWeight: "600", fontSize: 14 }}>{h.etiket}</Text>
                  <Text style={{ color: renk.textMuted, fontSize: 12.5 }}>
                    {turkceTutar(h.harcanan)} / {turkceTutar(h.limit)} ₺
                  </Text>
                </View>
                <View style={[s.hedefRay, { backgroundColor: renk.hairline }]}>
                  <View
                    style={{
                      width: `${Math.min(100, Math.max(3, h.oran))}%`,
                      height: "100%",
                      borderRadius: R.pill,
                      backgroundColor:
                        h.durum === "asti" ? renk.danger : h.durum === "yaklasti" ? "#E8A44C" : renk.green,
                    }}
                  />
                </View>
              </View>
            ))}
          </View>
        </Kart>
      )}

      <View>
        {bolumler.map(([tarih, list]) => (
          <View key={tarih}>
            <Text style={[s.gunBaslik, { color: renk.textMuted }]}>{tarihUzun(tarih)}</Text>
            {list.map((t) => (
              <IslemSatiri key={t.id} islem={t} onPress={() => islemMenu(t)} />
            ))}
          </View>
        ))}
        {bolumler.length === 0 && !txQ.isLoading && (
          <Text style={{ color: renk.textFaint, textAlign: "center", paddingVertical: SP.xl }}>
            Bu dönemde işlem yok.
          </Text>
        )}
      </View>
    </EkranBasligi>
  );
}

const s = StyleSheet.create({
  ggSatir: { flexDirection: "row", alignItems: "center", gap: SP.lg },
  ggEtiket: { fontSize: 12.5, fontWeight: "600" },
  ggDeger: { fontSize: 18, fontWeight: "700", marginTop: 2 },
  ggAyrac: { width: 1, height: 34, backgroundColor: "rgba(9,48,48,0.25)" },
  grafikBaslik: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SP.md,
  },
  yesilBtn: { width: 34, height: 34, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  hedefUst: { flexDirection: "row", justifyContent: "space-between" },
  hedefRay: { height: 8, borderRadius: R.pill, overflow: "hidden" },
  gunBaslik: { fontSize: 13, fontWeight: "700", marginTop: SP.lg, marginBottom: 2 },
});
