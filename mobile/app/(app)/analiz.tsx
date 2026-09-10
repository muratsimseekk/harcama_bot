import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Kart, Sekmeli } from "@/components/base";
import { type Donem, IkiliCubukGrafik } from "@/components/charts";
import { EkranBasligi } from "@/components/EkranBasligi";
import { IlerlemeCubugu } from "@/components/IlerlemeCubugu";
import { IslemSatiri } from "@/components/IslemSatiri";
import { Metin as Text } from "@/components/Metin";
import { turkceTutar } from "@/lib/format";
import { useSummary, useTransactions } from "@/lib/queries";
import { R, SP, T, useRenkler } from "@/lib/theme";
import type { Granularity, Islem } from "@/lib/types";

type Sekme = "day" | "week" | "month" | "year";
const ETIKET: Record<Sekme, string> = { day: "Günlük", week: "Haftalık", month: "Aylık", year: "Yıllık" };
const AYLAR = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
const AY_UZUN = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

const GUNLER = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];

function tarihUzun(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${AY_UZUN[m - 1]} ${y}`;
}

/** "2026-09-08" → "Pzt" */
function gunAdi(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return GUNLER[new Date(y, m - 1, d).getDay()];
}

function granOf(s: Sekme): Granularity {
  return s === "day" ? "week" : (s as Granularity);
}

export default function Analiz() {
  const renk = useRenkler();
  const router = useRouter();
  const [sekme, setSekme] = useState<Sekme>("month");
  const [seciliDonem, setSeciliDonem] = useState<number | null>(null);
  const gran = granOf(sekme);

  const sekmeDegis = (x: Sekme) => {
    setSekme(x);
    setSeciliDonem(null); // dönem değişince eski seçim anlamsız
  };

  const ozet = useSummary(gran);
  const g = ozet.data?.bu_donem;
  const txQ = useTransactions({ limit: 300, from: ozet.data?.baslangic, to: ozet.data?.bitis });

  /**
   * Grafik dönemleri. Aylık görünümde 30 günü tek tek çizmek okunaksız
   * (60 çubuk, çoğu boş) — haftalık kovalara toplanır.
   */
  const donemler = useMemo<Donem[]>(() => {
    if (!g) return [];
    if (gran === "year") {
      const kova = AYLAR.map((etiket) => ({ etiket, gelir: 0, gider: 0 }));
      for (const gn of g.gunluk) {
        const m = Number(gn.tarih.slice(5, 7)) - 1;
        kova[m].gelir += gn.gelir;
        kova[m].gider += gn.gider;
      }
      return kova;
    }
    if (gran === "week") {
      // 7 gün → hafta günü kısaltması (Pzt, Sal…)
      return g.gunluk.map((x) => ({ etiket: gunAdi(x.tarih), gelir: x.gelir, gider: x.gider }));
    }
    // Aylık → 7'şer günlük kovalar: "1-7", "8-14", "15-21", "22-28", "29-30"
    const kova = new Map<number, { ilk: number; son: number; gelir: number; gider: number }>();
    for (const gn of g.gunluk) {
      const gun = Number(gn.tarih.slice(8, 10));
      const i = Math.min(Math.floor((gun - 1) / 7), 4);
      const k = kova.get(i) ?? { ilk: gun, son: gun, gelir: 0, gider: 0 };
      k.ilk = Math.min(k.ilk, gun);
      k.son = Math.max(k.son, gun);
      k.gelir += gn.gelir;
      k.gider += gn.gider;
      kova.set(i, k);
    }
    return [...kova.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([, k]) => ({ etiket: `${k.ilk}-${k.son}`, gelir: k.gelir, gider: k.gider }));
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

  const islemAc = (t: Islem) =>
    router.push({ pathname: "/islem-form", params: { islem: JSON.stringify(t) } });

  const sec = seciliDonem !== null ? (donemler[seciliDonem] ?? null) : null;
  const secNet = sec ? sec.gelir - sec.gider : 0;

  return (
    <EkranBasligi
      baslik="Analiz"
      onRefresh={() => Promise.all([ozet.refetch(), txQ.refetch()])}
      ustAlan={
        g ? (
          <View style={{ gap: SP.md }}>
            <View style={s.ggSatir}>
              <View>
                <Text style={[s.ggEtiket, { color: renk.textMuted }]}>↗ Gelir</Text>
                <Text style={[s.ggDeger, { color: renk.success }]}>{turkceTutar(g.toplam_gelir)} ₺</Text>
              </View>
              <View style={[s.ggAyrac, { backgroundColor: renk.hairline }]} />
              <View>
                <Text style={[s.ggEtiket, { color: renk.textMuted }]}>↘ Harcama</Text>
                <Text style={[s.ggDeger, { color: renk.blue }]}>-{turkceTutar(g.toplam_gider)} ₺</Text>
              </View>
            </View>
            {genelHedef && <IlerlemeCubugu oran={genelHedef.oran} hedef={genelHedef.limit} />}
          </View>
        ) : undefined
      }
    >
      <Sekmeli
        secenekler={["day", "week", "month", "year"] as const}
        etiket={(x) => ETIKET[x]}
        secili={sekme}
        onSec={sekmeDegis}
      />

      <Kart style={{ backgroundColor: renk.aksanSoft }}>
        <View style={s.grafikBaslik}>
          <Text style={[T.heading, { color: renk.text }]}>Gelir & Gider</Text>
          <Pressable
            onPress={() => router.navigate("/ara")}
            style={[s.yesilBtn, { backgroundColor: renk.aksan }]}
          >
            <Ionicons name="search" size={16} color={renk.aksanUstu} />
          </Pressable>
        </View>
        {sec ? (
          <View style={s.secimSatir}>
            <Text style={[s.secimAd, { color: renk.text }]}>{sec.etiket}</Text>
            <View style={s.secimDegerler}>
              <Text style={[s.secimDeger, { color: renk.success }]}>
                +{turkceTutar(sec.gelir)}
              </Text>
              <Text style={[s.secimDeger, { color: renk.blue }]}>
                −{turkceTutar(sec.gider)}
              </Text>
              <Text style={[s.secimNet, { color: secNet >= 0 ? renk.success : renk.danger }]}>
                net {secNet >= 0 ? "+" : "−"}
                {turkceTutar(Math.abs(secNet))} ₺
              </Text>
            </View>
          </View>
        ) : (
          <View style={s.lejant}>
            <View style={s.lejantOge}>
              <View style={[s.lejantNokta, { backgroundColor: renk.success }]} />
              <Text style={[s.lejantYazi, { color: renk.textMuted }]}>Gelir</Text>
            </View>
            <View style={s.lejantOge}>
              <View style={[s.lejantNokta, { backgroundColor: renk.blue }]} />
              <Text style={[s.lejantYazi, { color: renk.textMuted }]}>Gider</Text>
            </View>
            <Text style={[s.lejantYazi, { color: renk.textFaint }]}>· çubuğa dokun</Text>
          </View>
        )}

        <IkiliCubukGrafik donemler={donemler} secili={seciliDonem} onSec={setSeciliDonem} />
      </Kart>

      {katHedefler.length > 0 ? (
        <Kart onPress={() => router.navigate("/(app)/hedefler")}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: SP.md }}>
            <Text style={[T.heading, { color: renk.text }]}>Hedeflerim</Text>
            <Ionicons name="chevron-forward" size={18} color={renk.textFaint} />
          </View>
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
                        h.durum === "asti" ? renk.danger : h.durum === "yaklasti" ? renk.warn : renk.aksan,
                    }}
                  />
                </View>
              </View>
            ))}
          </View>
        </Kart>
      ) : (
        <Kart onPress={() => router.navigate("/(app)/hedefler")}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View style={{ flex: 1 }}>
              <Text style={[T.heading, { color: renk.text }]}>Hedeflerim</Text>
              <Text style={{ color: renk.textFaint, fontSize: 13, marginTop: 2 }}>
                Aylık bütçe ve kategori limitleri koy
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={renk.textFaint} />
          </View>
        </Kart>
      )}

      <View>
        {bolumler.map(([tarih, list]) => (
          <View key={tarih}>
            <Text style={[s.gunBaslik, { color: renk.textMuted }]}>{tarihUzun(tarih)}</Text>
            {list.map((t) => (
              <IslemSatiri key={t.id} islem={t} onPress={() => islemAc(t)} />
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
  ggAyrac: { width: 1, height: 34 },
  grafikBaslik: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SP.md,
  },
  yesilBtn: { width: 34, height: 34, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  lejant: { flexDirection: "row", alignItems: "center", gap: SP.md, marginBottom: SP.md },
  lejantOge: { flexDirection: "row", alignItems: "center", gap: 5 },
  lejantNokta: { width: 8, height: 8, borderRadius: 4 },
  lejantYazi: { fontSize: 12.5, fontWeight: "600" },
  secimSatir: { marginBottom: SP.md, gap: 3 },
  secimAd: { fontSize: 14, fontWeight: "800" },
  secimDegerler: { flexDirection: "row", alignItems: "center", gap: SP.md, flexWrap: "wrap" },
  secimDeger: { fontSize: 13.5, fontWeight: "700", fontVariant: ["tabular-nums"] },
  secimNet: { fontSize: 13.5, fontWeight: "800", fontVariant: ["tabular-nums"] },
  hedefUst: { flexDirection: "row", justifyContent: "space-between" },
  hedefRay: { height: 8, borderRadius: R.pill, overflow: "hidden" },
  gunBaslik: { fontSize: 13, fontWeight: "700", marginTop: SP.lg, marginBottom: 2 },
});
