import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Kart } from "@/components/base";
import { DegisimRozeti } from "@/components/KategoriKiyas";
import { Metin as Text } from "@/components/Metin";
import { dateToIso } from "@/components/TarihAraligi";
import { turkceTutar } from "@/lib/format";
import { SEMBOL, usePara } from "@/lib/paraBirimi";
import { useKategoriKiyas } from "@/lib/queries";
import { R, SP, useRenkler } from "@/lib/theme";
import type { KategoriKiyas } from "@/lib/types";

/** Bu ayın 1'i–bugün ↔ geçen ayın 1'i–aynı gün (ay sonu kısaysa son günü). */
function araliklar(bugun = new Date()) {
  const y = bugun.getFullYear();
  const m = bugun.getMonth();
  const gun = bugun.getDate();
  const oncekiSon = new Date(y, m, 0).getDate();
  return {
    bas: dateToIso(new Date(y, m, 1)),
    bit: dateToIso(bugun),
    obas: dateToIso(new Date(y, m - 1, 1)),
    obit: dateToIso(new Date(y, m - 1, Math.min(gun, oncekiSon))),
    gun,
  };
}

/** Anlamlı fark: en az 100 birim ve önceki toplamın %5'i (küçük oynamalar "en çok artan" olmasın). */
function enBelirgin(kategoriler: KategoriKiyas[], oncekiToplam: number, yon: "artan" | "azalan") {
  const esik = Math.max(100, oncekiToplam * 0.05);
  return kategoriler
    // Yatırım birikimdir: artışı "en çok artan harcama" diye kırmızıyla gösterilmesin
    .filter((k) => k.onceki_tutar > 0 && k.tip !== "yatirim")
    .map((k) => ({ k, fark: k.tutar - k.onceki_tutar }))
    .filter(({ fark }) => (yon === "artan" ? fark >= esik : -fark >= esik))
    .sort((a, b) => (yon === "artan" ? b.fark - a.fark : a.fark - b.fark))[0];
}

/**
 * Ana sayfa içgörüsü: "Bu ay geçen ayın aynı dönemine göre %12 az harcadın · En çok artan:
 * Kafe/Restoran ↑ %32". Aynı gün sayısıyla kıyaslar — ay ortasında tüm geçen ayla kıyaslamak
 * yanıltıcı olurdu. Ayın ilk 3 günü ve geçen ay kaydı yoksa gizli.
 */
export function IcgoruKarti() {
  const renk = useRenkler();
  const router = useRouter();
  const para = usePara();
  const a = useMemo(() => araliklar(), []);
  const q = useKategoriKiyas(a.bas, a.bit, { obas: a.obas, obit: a.obit });
  const g = q.data?.gider;

  if (!g || a.gun < 3 || g.onceki_toplam <= 0) return null;

  const artan = enBelirgin(g.kategoriler, g.onceki_toplam, "artan");
  const azalan = enBelirgin(g.kategoriler, g.onceki_toplam, "azalan");
  const degisim = g.degisim ?? 0;
  const yuzde = Math.round(Math.abs(degisim));
  const ozet =
    yuzde === 0
      ? "Bu ay geçen ayın aynı dönemiyle neredeyse aynı harcadın."
      : `Bu ay geçen ayın aynı dönemine göre %${yuzde} ${degisim > 0 ? "daha fazla" : "daha az"} harcadın.`;

  const ac = (k: KategoriKiyas) =>
    router.push({
      pathname: "/kategori-detay",
      params: { ad: k.kategori, kategoriler: JSON.stringify([k.kategori]), yon: "gider", bas: a.bas, bit: a.bit },
    });

  const Satir = ({ x, ikon }: { x: { k: KategoriKiyas; fark: number }; ikon: "trending-up" | "trending-down" }) => (
    <Pressable onPress={() => ac(x.k)} style={({ pressed }) => [s.satir, { backgroundColor: renk.cardAlt }, pressed && { opacity: 0.6 }]}>
      <Ionicons name={ikon} size={16} color={ikon === "trending-up" ? renk.danger : renk.success} />
      <Text style={{ color: renk.textMuted, fontSize: 12.5, fontWeight: "600" }}>
        {ikon === "trending-up" ? "En çok artan" : "En çok azalan"}
      </Text>
      <Text style={{ color: renk.text, fontSize: 13.5, fontWeight: "700", flex: 1 }} numberOfLines={1}>
        {x.k.kategori}
      </Text>
      <Text style={{ color: renk.textMuted, fontSize: 12.5, fontWeight: "700" }}>
        {x.fark > 0 ? "+" : "−"}
        {turkceTutar(Math.abs(x.fark))} {SEMBOL[para]}
      </Text>
      <DegisimRozeti degisim={x.k.degisim} yon="gider" />
    </Pressable>
  );

  return (
    <Kart>
      <View style={s.ust}>
        <View style={[s.ikon, { backgroundColor: renk.aksanSoft }]}>
          <Ionicons name="bulb-outline" size={18} color={renk.aksan} />
        </View>
        <Text style={{ color: renk.text, fontSize: 14.5, fontWeight: "700", flex: 1, lineHeight: 20 }}>{ozet}</Text>
      </View>
      {(artan || azalan) && (
        <View style={{ gap: SP.xs, marginTop: SP.md }}>
          {artan && <Satir x={artan} ikon="trending-up" />}
          {azalan && <Satir x={azalan} ikon="trending-down" />}
        </View>
      )}
      <Text style={{ color: renk.textFaint, fontSize: 11.5, marginTop: SP.sm }}>
        {a.gun} günlük kıyas · ayın 1–{a.gun}. günleri
      </Text>
    </Kart>
  );
}

const s = StyleSheet.create({
  ust: { flexDirection: "row", alignItems: "center", gap: SP.md },
  ikon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  satir: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: R.md,
    paddingHorizontal: SP.md,
    paddingVertical: SP.sm,
  },
});
